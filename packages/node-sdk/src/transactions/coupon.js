import crypto from './crypto';
import constants from '../constants';
import trsTypes from '../transaction-types';
import options from '../options';
import slots from '../time/slots';
import addressHelper from '../address';

function createIssuerAuditorBuy(received_address, amount, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUER_AUDITOR_BUY,
        nethash: options.get('nethash'),
        amount,
        fee: `${fee}`,
        recipient_id: received_address,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssuerAuditorBuy: {
                address: addressHelper.generateBase58CheckAddress(keys.public_key),
            }
        }        
    };
    
    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssuerApply(orgName, org_id, orgOwner, orgOwnerPhone, secret, secondSecret) {
    const keys = crypto.getKeys(secret);

    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUER_APPLY,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
		recipient_id: null,
		sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssuerApply: {
                address: addressHelper.generateBase58CheckAddress(keys.public_key),
                orgName,
                org_id,
                orgOwner,
                orgOwnerPhone
            }
        }
    };

	crypto.sign(transaction, keys);
	
	if (secondSecret) {
		const secondKeys = crypto.getKeys(secondSecret);
		crypto.secondSign(transaction, secondKeys);
	}

    return transaction;
}

function createIssuerUpdate(orgName, org_id, orgOwner, orgOwnerPhone, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUER_UPDATE,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssuerUpdate: {
                address: addressHelper.generateBase58CheckAddress(keys.public_key),
                orgName,
                org_id,
                orgOwner,
                orgOwnerPhone
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssuerCheck(address, orgName, org_id, orgOwner, orgOwnerPhone, state, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUER_CHECK,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssuerCheck: {
                address,
                orgName,
                org_id,
                orgOwner,
                orgOwnerPhone,
                state
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssuerFreeze(address, orgName, org_id, orgOwner, orgOwnerPhone, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUER_FREEZE,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssuerFreeze: {
                address,
                orgName,
                org_id,
                orgOwner,
                orgOwnerPhone
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssuerUnfreeze(address, orgName, org_id, orgOwner, orgOwnerPhone, state, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUER_UNFREEZE,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssuerUnfreeze: {
                address,
                orgName,
                org_id,
                orgOwner,
                orgOwnerPhone,
                state
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssueNew(goodsName, goodsSpecs, goodsUnit, goodsNum, unitPrice, 
    batchValue, issueNum, issueTime, expireTime, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUE_NEW,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssueNew: {
                address: addressHelper.generateBase58CheckAddress(keys.public_key),
                goodsName,
                goodsSpecs,
                goodsUnit,
                goodsNum,
                unitPrice,
                batchValue,
                issueNum,
                issueTime,
                expireTime
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssueClose(goodsName, goodsSpecs, goodsUnit, goodsNum, unitPrice, 
    batchValue, issueNum, issueTime, expireTime, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUE_CLOSE,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssueClose: {
                address: addressHelper.generateBase58CheckAddress(keys.public_key),
                goodsName,
                goodsSpecs,
                goodsUnit,
                goodsNum,
                unitPrice,
                batchValue,
                issueNum,
                issueTime,
                expireTime
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createIssueReopen(goodsName, goodsSpecs, goodsUnit, goodsNum, unitPrice, 
    batchValue, issueNum, issueTime, expireTime, secret, secondSecret) {
    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_ISSUE_REOPEN,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponIssueReopen: {
                address: addressHelper.generateBase58CheckAddress(keys.public_key),
                goodsName,
                goodsSpecs,
                goodsUnit,
                goodsNum,
                unitPrice,
                batchValue,
                issueNum,
                issueTime,
                expireTime
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createExchangeBuy(batchValue, code, received_address, 
    price, secret, secondSecret) {

    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_EXCH_BUY,
        nethash: options.get('nethash'),
        amount: price,
        fee: `${fee}`,
        recipient_id: received_address,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponExcBuy: {
                batchValue,
                code,
                sender_address: addressHelper.generateBase58CheckAddress(keys.public_key),
                received_address,
                price
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createExchangePay(batchValue, code, received_address, 
    secret, secondSecret) {

    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_EXCH_PAY,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponExcPay: {
                batchValue,
                code,
                sender_address: addressHelper.generateBase58CheckAddress(keys.public_key),
                received_address,
                price: "0"
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createExchangeTransferConfirm(batchValue, code, received_address, 
    price, related_trs_id, state, secret, secondSecret) {

    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_EXCH_TRANSFER_CONFIRM,
        nethash: options.get('nethash'),
        amount: price,
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponExcTransferConfirm: {
                batchValue,
                code,
                sender_address: addressHelper.generateBase58CheckAddress(keys.public_key),
                received_address,
                price,
                related_trs_id,
                transferState: state
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

function createExchangeTransferAsk(batchValue, code, received_address, 
    price, secret, secondSecret) {

    const keys = crypto.getKeys(secret);
    
    const fee = constants.fees.send;

    const transaction = {
        type: trsTypes.COUPON_EXCH_TRANSFER_ASK,
        nethash: options.get('nethash'),
        amount: "0",
        fee: `${fee}`,
        recipient_id: null,
        sender_public_key: keys.public_key,
        timestamp: slots.getTime() - options.get('clientDriftSeconds'),
        asset: {
            couponExcTransferAsk: {
                batchValue,
                code,
                sender_address: addressHelper.generateBase58CheckAddress(keys.public_key),
                received_address,
                price
            }
        }
    };

    crypto.sign(transaction, keys);
    
    if (secondSecret) {
        const secondKeys = crypto.getKeys(secondSecret);
        crypto.secondSign(transaction, secondKeys);
    }

    return transaction;
}

export default {
    createIssuerAuditorBuy,
    createIssuerApply,
    createIssuerCheck,
    createIssuerUpdate,
    createIssuerFreeze,
    createIssuerUnfreeze,
    createIssueNew,
    createIssueClose,
    createIssueReopen,
    createExchangeBuy,
    createExchangePay,
    createExchangeTransferAsk,
    createExchangeTransferConfirm
};