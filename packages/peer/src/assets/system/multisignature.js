/**
 * Signatures
 * wangxm   2019-03-25
 */
import util from 'util';

import DdnUtils from '@ddn/utils';
import ByteBuffer from 'bytebuffer';
import Diff from '../../lib/diff';

class Multisignature {

    constructor(context) {
        Object.assign(this, context);
        this._context = context;

        this._unconfirmedSignatures = {};
	}

    async create({min, keysgroup, lifetime}, trs) {
		trs.recipient_id = null; //wxm block database
		trs.amount = "0";   //DdnUtils.bignum update
		trs.asset.multisignature = {
			min,
			keysgroup,
			lifetime
		};
		return trs;
    }

    async calculateFee({asset}, sender) {
		return DdnUtils.bignum.multiply(
			DdnUtils.bignum.plus(asset.multisignature.keysgroup.length, 1),
			5, this.tokenSetting.fixedPoint);
    }

    async verify(trs, sender) {
		if (!trs.asset.multisignature) {
            throw new Error(`Invalid transaction asset: ${trs.id}`);
		}

		if (!util.isArray(trs.asset.multisignature.keysgroup)) {
            throw new Error(`Invalid transaction asset: ${trs.id}`);
		}

		if (trs.asset.multisignature.keysgroup.length == 0) {
            throw new Error('Multisignature group must contain at least one member');
		}

		if (trs.asset.multisignature.min <= 1 || trs.asset.multisignature.min > 16) {
            throw new Error(`Invalid transaction asset: ${trs.id}`);
		}

		if (trs.asset.multisignature.min > trs.asset.multisignature.keysgroup.length + 1) {
            throw new Error('Invalid multisignature min');
		}

		if (trs.asset.multisignature.lifetime < 1 || trs.asset.multisignature.lifetime > 24) {
            throw new Error(`Invalid multisignature lifetime: ${trs.id}`);
		}

		// If it's ready
		if (await this.ready(trs, sender)) {
			try {
				for (let s = 0; s < trs.asset.multisignature.keysgroup.length; s++) {
                    let verify = false;
					if (trs.signatures) {
						for (let d = 0; d < trs.signatures.length && !verify; d++) {
							if (trs.asset.multisignature.keysgroup[s][0] != '-' &&
								trs.asset.multisignature.keysgroup[s][0] != '+') {
								verify = false;
							} else {
								verify = await this.runtime.transaction.verifySignature(
									trs,
									trs.asset.multisignature.keysgroup[s].substring(1),
									trs.signatures[d]
								);
							}
						}
					}

					if (!verify) {
                        throw new Error(`Failed to verify multisignature: ${trs.id}`);
					}
				}
			} catch (e) {
                throw new Error(`Failed to verify multisignature: ${trs.id}`);
			}
		}

        if (trs.asset.multisignature.keysgroup.includes(`+${sender.public_key}`)) {    //wxm block database
            throw new Error('Unable to sign transaction using own public key');
		}

        var keysgroup = trs.asset.multisignature.keysgroup;
        for (let i = 0; i < keysgroup.length; i++) {
            const key = keysgroup[i];

            const math = key[0];
            const publicKey = key.slice(1);

            if (math != '+') {
                throw new Error('Invalid math operator');
            }

            try {
                const b = Buffer.from(publicKey, 'hex');
                if (b.length != 32) {
                    throw new Error('Invalid public key');
                }
            } catch (e) {
                throw new Error('Invalid public key');
            }
        }

        var keysgroup = trs.asset.multisignature.keysgroup.reduce((p, c) => {
            if (!p.includes(c)) p.push(c);
            return p;
        }, []);

        if (keysgroup.length != trs.asset.multisignature.keysgroup.length) {
            throw new Error('Multisignature group contains non-unique public keys');
        }

        return trs;
    }

    async process(trs, sender) {
        return trs;
	}

    async getBytes({asset}) {
		const keysgroupBuffer = Buffer.from(asset.multisignature.keysgroup.join(''), 'utf8');
		const bb = new ByteBuffer(1 + 1 + keysgroupBuffer.length, true);
		bb.writeByte(asset.multisignature.min);
		bb.writeByte(asset.multisignature.lifetime);
		for (let i = 0; i < keysgroupBuffer.length; i++) {
			bb.writeByte(keysgroupBuffer[i]);
		}
		bb.flip();
		return bb.toBuffer();
    }
   
    async apply({asset}, {id, height}, sender, dbTrans) {
        this._unconfirmedSignatures[sender.address] = false;

        await this.runtime.account.merge(sender.address, {
            multisignatures: asset.multisignature.keysgroup,
            multimin: asset.multisignature.min,
            multilifetime: asset.multisignature.lifetime,
            block_id: id,  //wxm block database
            round: await this.runtime.round.calc(height)
        }, dbTrans);

        const keysgroup = asset.multisignature.keysgroup;
        for (let i = 0; i < keysgroup.length; i++) {
            const item = keysgroup[i];

            const key = item.substring(1);
            const address = this.runtime.account.generateAddressByPublicKey(key);

            await this.runtime.account.setAccount({
                address,
                public_key: key,  //wxm block database
                block_id: id  //wxm 这里要直接将block_id更新进去，否则的话，如果不进行转账操作，将出现block_id为空，导致重启失败的问题
            }, dbTrans);
        }
    }

    async undo({asset}, {id, height}, {address}, dbTrans) {
		const multiInvert = Diff.reverse(asset.multisignature.keysgroup);

        this._unconfirmedSignatures[address] = true;

        await this.runtime.account.merge(address, {
            multisignatures: multiInvert,
            multimin: -asset.multisignature.min,
            multilifetime: -asset.multisignature.lifetime,
            block_id: id,  //wxm block database
            round: await this.runtime.round.calc(height)
        }, dbTrans);
    }

    async applyUnconfirmed({asset}, {address, multisignatures}, dbTrans) {
		if (this._unconfirmedSignatures[address]) {
            throw new Error('Signature on this account is pending confirmation');
		}

		if (multisignatures.length) {
            throw new Error('Account already has multisignatures enabled');
		}

		this._unconfirmedSignatures[address] = true;

        await this.runtime.account.merge(address, {
            u_multisignatures: asset.multisignature.keysgroup,
            u_multimin: asset.multisignature.min,
            u_multilifetime: asset.multisignature.lifetime
        }, dbTrans);
    }

    async undoUnconfirmed({asset}, {address}, dbTrans) {
		const multiInvert = Diff.reverse(asset.multisignature.keysgroup);

        this._unconfirmedSignatures[address] = false;

        await this.runtime.account.merge(address, {
            u_multisignatures: multiInvert,
            u_multimin: -asset.multisignature.min,
            u_multilifetime: -asset.multisignature.lifetime
        }, dbTrans);
    }

    async objectNormalize(trs) {
        const validateErros = await this.ddnSchema.validate({
            type: 'object',
            properties: {
                min: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 15
                },
                keysgroup: {
                    type: 'array',
                    minLength: 1,
                    maxLength: 16
                },
                lifetime: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 24
                }
            },
            required: ['min', 'keysgroup', 'lifetime']
        }, trs.asset.multisignature);
        if (validateErros) {
            throw new Error(`Invalid multisignature parameters: ${validateErros[0].message}`);
        }
        return trs;
    }

    async dbRead({m_keysgroup, m_min, m_lifetime}) {
		if (!m_keysgroup) {
			return null;
		} else {
			const multisignature = {
				min: m_min,
				lifetime: m_lifetime,
				keysgroup: m_keysgroup.split(',')
			};

			return { multisignature };
		}
    }

    async dbSave({asset, id}, dbTrans) {
        return new Promise((resolve, reject) => {
            this.dao.insert("multisignature", {
                min: asset.multisignature.min,
                lifetime: asset.multisignature.lifetime,
                keysgroup: asset.multisignature.keysgroup.join(','),
                transaction_id: id
            }, dbTrans, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    setImmediate(async() => {
                        try
                        {
                            await this.runtime.socketio.emit('multisignatures/change', {});
                        }
                        catch (err2)
                        {
                            this.logger.warn("socket emit error: multisignatures/change");
                        }
                    })

                    resolve(result);
                }
            });
        });
    }

    async ready({signatures, asset}, {multisignatures, multimin}) {
		if (!signatures) {
            this.logger.warn("The multisignature is waiting for other account signatures.");
			return false;
		}

		if (util.isArray(multisignatures) && !multisignatures.length) {
            const ready = signatures.length == asset.multisignature.keysgroup.length;
            if (!ready) {
                this.logger.warn(`The number of multisignature signatures is less than ${asset.multisignature.keysgroup.length}`);
            }
			return ready;
		} else {
			return signatures.length >= multimin - 1;
		}
    }

}

export default Multisignature;
