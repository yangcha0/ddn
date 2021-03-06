import Asset from '@ddn/asset-base';

import crypto from './crypto';
import slots from '../time/slots';
import options from '../options';

async function createPluginAsset(trsType, assetInfo, secret, secondSecret) {
    const keys = crypto.getKeys(secret);

    // var fee = assetInfo.fee || constants.fees.org;
    delete assetInfo.fee;
    const transaction = {
        type: trsType,
        nethash: options.get('nethash'),
        amount: assetInfo.amount ? `${assetInfo.amount}` : "0",
        // fee: fee + "",
        recipient_id: assetInfo.recipient_id ? assetInfo.recipient_id : null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        message: assetInfo.message ? `${assetInfo.message}` : null,
        asset: {}
    };

    delete assetInfo.amount;
    delete assetInfo.recipient_id;
    delete assetInfo.message;

    if (assetInfo.aobAmount) {
        assetInfo.amount = assetInfo.aobAmount;
        delete assetInfo.aobAmount;
    }

    // fix 这个是创建二级密码使用的 这个条件是否应该再次检查一下或优化一下
    if (assetInfo.secondSecret && trsType === 1) {
        const secondSecretKeys = crypto.getKeys(assetInfo.secondSecret);
        assetInfo = { public_key: secondSecretKeys.public_key };
        delete transaction.message;
    }

    const assetJsonName = Asset.Utils.getAssetJsonName(trsType);
    transaction.asset[assetJsonName] = assetInfo;
    if (assetInfo.fee) {
        transaction.fee = assetInfo.fee;
    } else {
        transaction.fee = await crypto.getFee(transaction);
    }
    await crypto.sign(transaction, keys);

    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        await crypto.secondSign(transaction, secondKeys);
    }

    // transaction.id = crypto.getId(transaction);
    return transaction;
}

export default {
    createPluginAsset
};