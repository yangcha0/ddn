/**
 * 交易核心方法和处理逻辑
 * wangxm   2018-12-28
 */

import ByteBuffer from "bytebuffer";
import crypto from 'crypto';
import sha256 from "fast-sha256";
import ed from 'ed25519';
import extend from 'util-extend';
import cryptoLib from "@ddn/crypto";
import DdnUtils from '@ddn/utils';

import Assets from '../../assets';

let _singleton;

class Transaction {
    static singleton(context) {
        if (!_singleton) {
            _singleton = new Transaction(context);
        }
        return _singleton;
    }

    constructor(context) {
        Object.assign(this, context);
        this._context = context;

        this._unconfirmedNumber = 0;
        this._unconfirmedTransactions = [];
        this._unconfirmedTransactionsIdIndex = {};

        this._assets = Assets.singleton(context);
    }

    async execAssetFunc(funcName) {
        const args = [];
        for (let i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        await this._assets.execAssetFunc(...args);
    }

    /**
     * 根据资产配置名称获取资产实例
     * @param {*} assetName
     */
    getAssetInstanceByName(assetName) {
        return this._assets.findInstanceByName(assetName);
    }

    mountAssetApis(expressApp) {
        this._assets.mountAssetApis(expressApp);
    }

    async create(data) {
        if (!this._assets.hasType(data.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`);
        }

        if (!data.sender) {
            throw Error("Can't find sender");
        }

        if (!data.keypair) {
            throw Error("Can't find keypair");
        }

        let trs = {
            type: data.type,
            amount: "0",
            nethash: this.config.nethash,
            sender_public_key: data.sender.public_key,
            requester_public_key: data.requester ? data.requester.public_key.toString('hex') : null,
            timestamp: this.runtime.slot.getTime(),
            asset: {},
            message: data.message,
            args: data.args
        };

        trs = await this._assets.call(trs.type, "create", data, trs);

        // trs.signature = await cryptoLib.sign(trs, data.keypair);
        trs.signature = await this.sign(data.keypair, trs);
        if (data.sender.second_signature && data.second_keypair) {
            trs.sign_signature = await this.sign(trs, data.second_keypair);
        }

        trs.id = await this.getId(trs);

        trs.fee = `${await this._assets.call(trs.type, "calculateFee", trs, data.sender)}`;

        return trs;
    }

    // TODO: delete it
    async sign(keypair, trs) {
        const hash = await this.getHash(trs);
        return ed.Sign(hash, keypair).toString('hex');
    }

    /**
     * 获取交易序列化之后的字节流内容
     * @param {*} trs
     */
    async getBytes(trs, skipSignature, skipSecondSignature) {
        if (!this._assets.hasType(trs.type)) {
            throw Error(`Unknown transaction type: ${trs.type}`);
        }

        const assetBytes = await this._assets.call(trs.type, "getBytes", trs, skipSignature, skipSecondSignature);
        const assetSize = assetBytes ? assetBytes.length : 0;

        const size = 1 + // type (int)
            4 + // timestamp (int)
            8 + // nethash 8
            32 + // senderPublicKey (int)
            32 + // requesterPublicKey (long)
            8 + // recipientId (long)
            8 + // amount (long)
            64 + // message
            64; // args or unused

        const bb = new ByteBuffer(size + assetSize, true);

        bb.writeByte(trs.type);
        bb.writeInt(trs.timestamp);
        bb.writeString(trs.nethash);

        const senderPublicKeyBuffer = Buffer.from(trs.sender_public_key, 'hex');
        for (let i = 0; i < senderPublicKeyBuffer.length; i++) {
            bb.writeByte(senderPublicKeyBuffer[i]);
        }

        if (trs.requester_public_key) {
            const requesterPublicKey = Buffer.from(trs.requester_public_key, 'hex');
            for (let i = 0; i < requesterPublicKey.length; i++) {
                bb.writeByte(requesterPublicKey[i]);
            }
        }

        if (trs.recipient_id) {
            bb.writeString(trs.recipient_id);
        } else {
            for (let i = 0; i < 8; i++) {
                bb.writeByte(0);
            }
        }

        bb.writeString(trs.amount);

        if (trs.message) {
            bb.writeString(trs.message);
        }

        if (trs.args) {
            for (let i = 0; i < trs.args.length; ++i) {
                bb.writeString(trs.args[i])
            }
        }

        if (assetSize > 0) {
            for (let i = 0; i < assetSize; i++) {
                bb.writeByte(assetBytes[i]);
            }
        }

        if (!skipSignature && trs.signature) {
            const signatureBuffer = Buffer.from(trs.signature, 'hex');
            for (let i = 0; i < signatureBuffer.length; i++) {
                bb.writeByte(signatureBuffer[i]);
            }
        }

        if (!skipSecondSignature && trs.sign_signature) { //wxm block database
            const signSignatureBuffer = Buffer.from(trs.sign_signature, 'hex');
            for (let i = 0; i < signSignatureBuffer.length; i++) {
                bb.writeByte(signSignatureBuffer[i]);
            }
        }

        bb.flip();

        return bb.toBuffer();
    }

    async objectNormalize(trs) {
        if (!this._assets.hasType(trs.type)) {
            throw Error(`Unknown transaction type ${trs.type}`);
        }

        for (const p in trs) {
            if (trs[p] === null || typeof trs[p] === 'undefined') {
                delete trs[p];
            }
        }

        const validateErrors = await this.ddnSchema.validateTransaction(trs);
        if (validateErrors) {
            this.logger.error(`Failed to normalize transaction: ${validateErrors[0].message}`);
            throw new Error(validateErrors[0].message);
        }

        return await this._assets.call(trs.type, "objectNormalize", trs);
    }

    /**
     * 序列化单条交易数据到数据库
     */
    async serializeTransaction2Db(trs, dbTrans) {
        if (!this._assets.hasType(trs.type)) {
            throw Error(`Unknown transaction type: ${trs.type}`);
        }

        const newTrans = {
            id: trs.id,
            block_id: trs.block_id,
            block_height: trs.block_height,
            type: trs.type,
            timestamp: trs.timestamp,
            sender_public_key: trs.sender_public_key,
            requester_public_key: trs.requester_public_key,
            sender_id: trs.sender_id,
            recipient_id: trs.recipient_id || null,
            amount: `${trs.amount}`,
            fee: `${trs.fee}`,
            signature: trs.signature,
            sign_signature: trs.sign_signature,
            signatures: trs.signatures ? trs.signatures.join(',') : null,
            args: JSON.stringify(trs.args) || null,
            message: trs.message || null
        };

        return new Promise((resolve, reject) => {
            this.dao.insert('tr', newTrans, dbTrans, async (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        await this._assets.call(trs.type, "dbSave", trs, dbTrans);
                    } catch (e) {
                        return reject(e);
                    }
                    resolve(result);
                }
            });
        });
    }

    async serializeDbData2Transaction(raw) {
        if (!raw.t_id) {
            return null
        } else {
            const trs = {
                id: raw.t_id,
                height: `${raw.b_height}`,
                block_id: raw.b_id || raw.t_blockId, //wxm block database
                type: parseInt(raw.t_type),
                timestamp: parseInt(raw.t_timestamp),
                sender_public_key: raw.t_senderPublicKey, //wxm block database
                requester_public_key: raw.t_requesterPublicKey, //wxm block database
                sender_id: raw.t_senderId, //wxm block database
                recipient_id: raw.t_recipientId, //wxm block database
                amount: `${raw.t_amount}`, //DdnUtils.bignum update parseInt(raw.t_amount),
                fee: `${raw.t_fee}`, //DdnUtils.bignum update parseInt(raw.t_fee),
                signature: raw.t_signature,
                sign_signature: raw.t_signSignature, //wxm block database
                signatures: raw.t_signatures ? raw.t_signatures.split(',') : null,
                confirmations: raw.confirmations,
                args: raw.t_args ? JSON.parse(raw.t_args) : null,
                message: raw.t_message,
                asset: {}
            };

            if (!this._assets.hasType(trs.type)) {
                throw Error(`Unknown transaction type ${trs.type}`);
            }

            const asset = await this._assets.call(trs.type, "dbRead", raw);
            if (asset) {
                trs.asset = extend(trs.asset, asset);
            }

            return trs;
        }
    }

    async undo(trs, block, sender, dbTrans) {
        if (!this._assets.hasType(trs.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`);
        }

        //wxm TODO 这里不应该使用特定的类型，应该有通用的方式
        if (trs.type === 13) { //TransactionTypes.OUT_TRANSFER
            return await this._assets.call(trs.type, trs, block, sender);
        }

        //DdnUtils.bignum update   const amount = trs.amount + trs.fee;
        const amount = DdnUtils.bignum.plus(trs.amount, trs.fee);

        var sender = await this.runtime.account.merge(sender.address, {
            balance: amount,
            block_id: block.id, //wxm block database
            round: await this.runtime.round.calc(block.height)
        }, dbTrans);

        await this._assets.call(trs.type, trs, block, sender, dbTrans);
    }

    async getUnconfirmedTransaction(trsId) {
        const index = this._unconfirmedTransactionsIdIndex[trsId];
        return this._unconfirmedTransactions[index];
    }

    async getUnconfirmedTransactionList(reverse, limit) {
        let result = [];

        for (let i = 0; i < this._unconfirmedTransactions.length; i++) {
            if (this._unconfirmedTransactions[i] !== false) {
                result.push(this._unconfirmedTransactions[i]);
            }
        }

        if (result.length > 0) {
            result = reverse ? result.reverse() : result;
        }

        if (limit) {
            result.splice(limit);
        }

        return result;
    }

    async undoUnconfirmed(transaction, dbTrans) {
        const sender = await this.runtime.account.getAccountByPublicKey(transaction.sender_public_key);
        await this.removeUnconfirmedTransaction(transaction.id);

        if (!this._assets.hasType(transaction.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`);
        }

        //wxm TODO
        //此处应该使用this._assets方法（transaction.type）来做判断
        // if (transaction.type === TransactionTypes.OUT_TRANSFER)
        // {
        //     return await this._assets.call(transaction.type, "undoUnconfirmed", transaction, sender);
        // }

        const amount = DdnUtils.bignum.plus(transaction.amount, transaction.fee);

        this.balanceCache.addNativeBalance(sender.address, amount);

        await this.runtime.account.merge(sender.address, {
            u_balance: amount
        }, dbTrans);
        await this._assets.call(transaction.type, "undoUnconfirmed", transaction, sender, dbTrans);
    }

    async undoUnconfirmedList() {
        const ids = [];
        for (let i = 0; i < this._unconfirmedTransactions.length; i++) {
            const transaction = this._unconfirmedTransactions[i];
            if (transaction !== false) {
                ids.push(transaction.id);
                await this.undoUnconfirmed(transaction);
            }
        }
        return ids;
    }

    async applyUnconfirmed(trs, sender, dbTrans) {
        if (!sender && trs.block_id != this.genesisblock.id) { //wxm block database
            throw new Error("Invalid block id");
        } else {
            let requester = null;
            if (trs.requester_public_key) { //wxm block database
                requester = await this.runtime.account.getAccountByPublicKey(trs.requester_public_key);
                if (!requester) {
                    throw new Error("Invalid requester");
                }
            }

            if (!this._assets.hasType(trs.type)) {
                throw new Error(`Unknown transaction type ${trs.type}`);
            }

            if (!trs.requester_public_key && sender.second_signature && !DdnUtils.bignum.isEqualTo(sender.second_signature, 0) &&
                !trs.sign_signature && trs.block_id != this.genesisblock.id) { //wxm block database
                throw new Error(`Failed second signature: ${trs.id}`);
            }

            if (!trs.requester_public_key && (!sender.second_signature || DdnUtils.bignum.isEqualTo(sender.second_signature, 0)) &&
                (trs.sign_signature && trs.sign_signature.length > 0)) { //wxm block database
                throw new Error("Sender account does not have a second signature");
            }

            if (trs.requester_public_key && requester.second_signature && !DdnUtils.bignum.isEqualTo(requester.second_signature, 0) && !trs.sign_signature) { //wxm block database
                throw new Error(`Failed second signature: ${trs.id}`);
            }

            if (trs.requester_public_key && (!requester.second_signature || DdnUtils.bignum.isEqualTo(requester.second_signature, 0)) &&
                (trs.sign_signature && trs.sign_signature.length > 0)) { //wxm block database
                throw new Error("Requester account does not have a second signature");
            }

            //wxm 这个逻辑应该去掉，不应该这么使用序号特殊处理，如果必须，应该是用assetTypes.type枚举
            if (trs.type === 7) {
                return await this._assets.call(trs.type, "applyUnconfirmed", trs, sender, dbTrans);
            }

            const amount = DdnUtils.bignum.plus(trs.amount, trs.fee);
            if (DdnUtils.bignum.isLessThan(sender.u_balance, amount) && trs.block_id != this.genesisblock.id) { //wxm block database
                throw new Error(`Insufficient balance: ${sender.address}`);
            }

            this.balanceCache.addNativeBalance(sender.address, DdnUtils.bignum.minus(0, amount));

            const accountInfo = await this.runtime.account.merge(sender.address, {
                u_balance: DdnUtils.bignum.minus(0, amount)
            }, dbTrans);
            const newAccountInfo = Object.assign({}, sender, accountInfo); //wxm block database

            try {
                await this._assets.call(trs.type, "applyUnconfirmed", trs, newAccountInfo, dbTrans);
            } catch (err) {
                this.balanceCache.addNativeBalance(newAccountInfo.address, amount)
                await this.runtime.account.merge(newAccountInfo.address, {
                    u_balance: amount
                }, dbTrans);
                throw err;
            }

        }
    }

    async ready(trs, sender) {
        if (!this._assets.hasType(trs.type)) {
            throw Error(`Unknown transaction type ${trs.type}`);
        }

        if (!sender) {
            return false;
        }

        return await this._assets.call(trs.type, "ready", trs, sender);
    }

    async apply(trs, block, sender, dbTrans) {
        if (!this._assets.hasType(trs.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`);
        }

        if (!await this.ready(trs, sender)) {
            throw new Error(`Transaction is not ready: ${trs.id}`);
        }

        //wxm 这个逻辑应该去掉，不应该这么使用序号特殊处理，如果必须，应该是用assetTypes.type枚举
        if (trs.type === 7) {
            return this._assets.call(trs.type, "apply", trs, block, sender);
        }

        //DdnUtils.bignum update   const amount = trs.amount + trs.fee;
        const amount = DdnUtils.bignum.plus(trs.amount, trs.fee);

        //DdnUtils.bignum update   if (trs.blockId != genesisblock.block.id && sender.balance < amount) {
        if (trs.block_id != this.genesisblock.id && DdnUtils.bignum.isLessThan(sender.balance, amount)) { //wxm block database
            throw new Error(`Insufficient balance: ${sender.balance}`)
        }

        const accountInfo = await this.runtime.account.merge(sender.address, {
            balance: DdnUtils.bignum.minus(0, amount), //DdnUtils.bignum update  -amount
            block_id: block.id, //wxm block database
            round: await this.runtime.round.calc(block.height)
        }, dbTrans);
        const newSender = Object.assign({}, sender, accountInfo); //wxm block database
        await this._assets.call(trs.type, "apply", trs, block, newSender, dbTrans);
    }

    async removeUnconfirmedTransaction(id) {
        if (this._unconfirmedTransactionsIdIndex[id] == undefined) {
            return;
        }
        const index = this._unconfirmedTransactionsIdIndex[id];
        delete this._unconfirmedTransactionsIdIndex[id];
        this._unconfirmedTransactions[index] = false;
        this._unconfirmedNumber--;
    }

    async addUnconfirmedTransaction(transaction, sender) {
        try {
            await this.applyUnconfirmed(transaction, sender);
            this._unconfirmedTransactions.push(transaction);
            let index = this._unconfirmedTransactions.length - 1;
            this._unconfirmedTransactionsIdIndex[transaction.id] = index;
            this._unconfirmedNumber++;
        } catch (err) {
            await this.removeUnconfirmedTransaction(transaction.id);
            throw err;
        }
    }

    async hasUnconfirmedTransaction({
        id
    }) {
        const index = this._unconfirmedTransactionsIdIndex[id];
        const result = index !== undefined && this._unconfirmedTransactions[index] !== false;
        return result;
    }

    async getHash(trs) {
        const bytes = await this.getBytes(trs);
        return Buffer.from(sha256.hash(bytes));
    }

    async getId(trs) {
        const result = await this.getHash(trs);
        return result.toString('hex');
    }

    async process(trs, sender, requester) {
        if (!this._assets.hasType(trs.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`);
        }

        let txId;
        try {
            txId = await this.getId(trs);
        } catch (e) {
            this.logger.error('Invalid transaction id, err: ', e)
            throw new Error("Invalid transaction id");
        }

        if (trs.id && trs.id != txId) {
            // FIXME: 这里没有要求从Asset插件端传ID，不然会出错，请确认
            // this.logger.error('Incorrect transaction id, txId: ', txId);
            // this.logger.error('Incorrect transaction id, trs.id: ', trs.id);
            throw new Error("Incorrect transaction id");
        } else {
            trs.id = txId;
        }

        if (!sender) {
            throw new Error("Invalid sender");
        }

        trs.sender_id = sender.address; //wxm block database

        // Verify that requester in multisignature
        if (trs.requester_public_key) { //wxm block database
            if (!sender.multisignatures.includes(trs.requester_public_key)) { //wxm block database
                throw new Error("Failed to verify signature, 1");
            }
        }

        if (trs.requester_public_key) { //wxm block database
            if (!await this.verifySignature(trs, trs.requester_public_key, trs.signature)) { //wxm block database
                throw new Error("Failed to verify signature, 2");
            }
        } else {
            if (!await this.verifySignature(trs, trs.sender_public_key, trs.signature)) { //wxm block database
                throw new Error("Failed to verify signature, 3");
            }
        }

        trs = await this._assets.call(trs.type, "process", trs, sender);

        return new Promise((resolve, reject) => {
            // shuai 2018-11-13
            this.dao.count("tr", {
                id: trs.id
            }, (err, count) => {
                if (err) {
                    return reject("Database error");
                }

                if (count) {
                    return reject("Ignoring already confirmed transaction");
                }

                resolve(trs);
            })
        });
    }

    async processUnconfirmedTransaction(transaction, broadcast) {
        if (!transaction) {
            throw new Error("No transaction to process!");
        }

        if (!transaction.id) {
            transaction.id = await this.runtime.transaction.getId(transaction);
        }

        // Check transaction indexes
        if (this._unconfirmedTransactionsIdIndex[transaction.id] !== undefined) {
            throw new Error(`Transaction ${transaction.id} already exists, ignoring...`);
        }

        await this.runtime.account.setAccount({
            public_key: transaction.sender_public_key
        });
        const sender = await this.runtime.account.getAccountByPublicKey(transaction.sender_public_key);

        let requester;
        if (transaction.requester_public_key && sender && sender.multisignatures && sender.multisignatures.length) { //wxm block database
            requester = await this.runtime.account.getAccountByPublicKey(transaction.requester_public_key);
            if (!requester) {
                throw new Error("Invalid requester");
            }
        }

        transaction = await this.process(transaction, sender, requester);

        await this.verify(transaction, sender, requester);
        await this.addUnconfirmedTransaction(transaction, sender);

        if (broadcast) {
            setImmediate(async () => {
                try {
                    await this.runtime.peer.broadcast.broadcastUnconfirmedTransaction(transaction);
                } catch (err) {
                    this.logger.error(`Broadcast unconfirmed transaction failed: ${DdnUtils.system.getErrorMsg(err)}`);
                }
            });
        }
        // library.bus.message('unconfirmedTransaction', transaction, broadcast);
    }

    async receiveTransactions(transactions) {
        if (this._unconfirmedNumber > this.tokenSetting.maxTxsPerBlock) {
            throw new Error("Too many transactions");
        }

        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            await this.processUnconfirmedTransaction(transaction, true);
        }

        return transactions;
    }

    async verifyBytes(bytes, publicKey, signature) {
        const data2 = Buffer.allocUnsafe(bytes.length);
        for (let i = 0; i < data2.length; i++) {
            data2[i] = bytes[i];
        }

        // Note: how to
        const hash = crypto.createHash('sha256').update(data2).digest();
        const signatureBuffer = Buffer.from(signature, 'hex');
        const publicKeyBuffer = Buffer.from(publicKey, 'hex');
        return ed.Verify(hash, signatureBuffer || ' ', publicKeyBuffer || ' ');
    }

    async verifySignature(trs, publicKey, signature) {
        if (!this._assets.hasType(trs.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`)
        }
        if (!signature) {
            return false;
        }
        const bytes = await this.getBytes(trs, true, true);
        return await this.verifyBytes(bytes, publicKey, signature);
    }

    async multisign(keypair, trs) {
        const bytes = await this.getBytes(trs, true, true);
        const hash = crypto.createHash('sha256').update(bytes).digest();
        return ed.Sign(hash, keypair).toString('hex');
    }

    async verify(trs, sender, requester) {
        if (!this._assets.hasType(trs.type)) {
            throw new Error(`Unknown transaction type ${trs.type}`)
        }

        // Check sender
        if (!sender) {
            throw new Error("Invalid sender");
        }

        if (this.config.settings.enableMoreLockTypes) {
            const lastBlock = this.runtime.block.getLastBlock();

            const isLockedType = await this._assets.isSupportLock(trs.type);
            //DdnUtils.bignum update if (sender.lockHeight && lastBlock && lastBlock.height + 1 <= sender.lockHeight && isLockedType) {
            if (isLockedType && sender.lock_height && lastBlock && DdnUtils.bignum.isLessThanOrEqualTo(DdnUtils.bignum.plus(lastBlock.height, 1), sender.lock_height)) {
                throw new Error('Account is locked');
                // return cb('Account is locked')
            }
        }

        if (trs.requester_public_key) {
            if (!sender.multisignatures.includes(trs.requester_public_key)) {
                throw new Error("Failed to verify signature, 4");
            }

            if (sender.public_key != trs.sender_public_key) {
                throw new Error("Invalid public key")
            }
        }

        //wxm 检查transaction是否有nethash属性
        if (!trs.nethash) {
            throw new Error("Transaction's nethash property is required.");
        }

        // Verify signature
        let valid = false;
        if (trs.requester_public_key) { //wxm block database
            valid = await this.verifySignature(trs, trs.requester_public_key, trs.signature); //wxm block database
        } else {
            valid = await this.verifySignature(trs, trs.sender_public_key, trs.signature);
        }

        if (!valid) {
            throw new Error("Failed to verify signature, 5");
        }

        if (trs.nethash && trs.nethash != this.config.nethash) {
            throw new Error("Failed to verify nethash");
        }

        // Verify second signature
        if (!trs.requester_public_key && sender.second_signature && !DdnUtils.bignum.isEqualTo(sender.second_signature, 0)) {
            valid = await this.verifySecondSignature(trs, sender.second_public_key, trs.sign_signature);
            if (!valid) {
                throw new Error(`Failed to verify second signature: ${trs.id}`);
            }
        } else if (trs.requester_public_key && requester.second_signature && !DdnUtils.bignum.isEqualTo(requester.second_signature, 0)) { //wxm block database
            valid = await this.verifySecondSignature(trs, requester.second_public_key, trs.sign_signature); //wxm block database
            if (!valid) {
                throw new Error(`Failed to verify second signature: ${trs.id}`);
            }
        }

        // Check that signatures unique
        if (trs.signatures && trs.signatures.length) {
            const signatures = trs.signatures.reduce((p, c) => {
                if (!p.includes(c)) p.push(c);
                return p;
            }, []);

            if (signatures.length != trs.signatures.length) {
                throw new Error("Encountered duplicate signatures");
            }
        }

        let multisignatures = sender.multisignatures || sender.u_multisignatures;
        if (multisignatures.length == 0) {
            if (trs.asset && trs.asset.multisignature && trs.asset.multisignature.keysgroup) {
                multisignatures = trs.asset.multisignature.keysgroup.map(key => key.slice(1));
            }
        }

        if (trs.requester_public_key) {
            multisignatures.push(trs.sender_public_key);
        }

        //wxm TODO
        // 此处应该用this._assets.方法（trs.type） 来判断是否能够进入下面处理
        if (trs.signatures && trs.type !== 13) { //TransactionTypes.OUT_TRANSFER
            for (let d = 0; d < trs.signatures.length; d++) {
                let verify = false;

                for (let s = 0; s < multisignatures.length; s++) {
                    if (trs.requester_public_key && multisignatures[s] == trs.requester_public_key) {
                        continue;
                    }

                    if (await this.verifySignature(trs, multisignatures[s], trs.signatures[d])) {
                        verify = true;
                    }
                }

                if (!verify) {
                    throw new Error(`Failed to verify multisignature: ${trs.id}`);
                }
            }
        }

        // Check sender
        if (trs.sender_id != sender.address) { //wxm block database
            throw new Error(`Invalid sender id: ${trs.id}`);
        }

        // Calc fee
        const fee = `${await this._assets.call(trs.type, "calculateFee", trs, sender)}`;

        if (!DdnUtils.bignum.isEqualTo(trs.fee, fee)) {
            throw new Error(`Invalid transaction type/fee: ${trs.id}`);
        }
        // Check amount
        if (DdnUtils.bignum.isLessThan(trs.amount, 0) ||
            DdnUtils.bignum.isGreaterThan(trs.amount, DdnUtils.bignum.multiply(this.tokenSetting.maxAmount, this.tokenSetting.fixedPoint)) ||
            `${trs.amount}`.includes(".") || `${trs.amount}`.includes("e")) {
            throw new Error(`Invalid transaction amount: ${trs.id}`);
        }
        // Check timestamp
        if (this.runtime.slot.getSlotNumber(trs.timestamp) > this.runtime.slot.getSlotNumber()) {
            this.logger.info('this.runtime.slot.getSlotNumber(trs.timestamp)=', {
                a: this.runtime.slot.getSlotNumber(trs.timestamp),
                b: this.runtime.slot.getSlotNumber()
            })
            throw new Error("Invalid transaction timestamp");
        }

        return await this._assets.call(trs.type, "verify", trs, sender);
    }

    async verifySecondSignature(trs, publicKey, signature) {
        if (!this._assets.hasType(trs.type)) {
            throw Error(`Unknown transaction type ${trs.type}`);
        }

        if (!signature) {
            return false;
        }

        let bytes = await this.getBytes(trs, false, true);
        return await this.verifyBytes(bytes, publicKey, signature);
    }

}

export default Transaction;