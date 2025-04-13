const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js'); 
const levelUtils = require('../../features/account/levels.js');

/**
 * Formats items for a specific shop location based on its type.
 * @param {object} locationData - The base data for the location from storage_locations.
 * @param {object} storeData - The store data corresponding to the location from storage_stores.
 * @returns {Array<object>} An array of formatted shop item/gift objects.
 */
function formatShopItems(locationData, storeData) {
    const shopItems = [];
    const locationType = locationData.type;
    if (!storeData || !storeData.itemIds || storeData.status === false) {
        pretty.debug(`Shop ${locationData.key} is inactive or has no itemIds defined.`);
        return []; // shop inactive or no items
    }
    let itemIds = storeData.itemIds.split(',').map(id => id.trim()).filter(id => id !== '');
    const maxToShow = storeData.maxToShow || itemIds.length; // default to all if not specified
    const shouldRandomize = storeData.randomize === true; // explicitly check for true
    if (shouldRandomize) {
        itemIds = formats.getRandomItems(itemIds, itemIds.length);
    }
    const itemsToShow = itemIds.slice(0, maxToShow);
    let baseItemStorage;
    let itemWrapperTag;
    let formatFunction;
    switch (locationType) {
        case 'shop':
            baseItemStorage = global.storage_items;
            itemWrapperTag = 'item';
            formatFunction = (item, itemId) => ({
                '@args': item.args || '', '@asset': item.asset, '@description': item.description || '',
                '@happiness': item.happiness || 0, '@health': item.health || 0, '@id': itemId,
                '@level': item.level || 1, '@locationId': -1, '@name': item.name,
                '@rarity': item.rarity || 0, '@rocks': item.rocks || 0, '@srcId': itemId,
                '@subscription': String(item.subscription === true || item.subscription === 'true'),
                '@type': item.type, '@typeStatus': item.typeStatus || ''
            });
            break;
        case 'dressupshop':
            baseItemStorage = global.storage_clothes;
            itemWrapperTag = 'item';
            formatFunction = (item, itemId) => ({
                '@args': item.args || '', '@asset': item.asset, '@description': item.description || '',
                '@happiness': item.happiness || 0, '@health': item.health || 0, '@id': itemId,
                '@level': item.level || 1, '@locationId': -1, '@name': item.name,
                '@rarity': item.rarity || 0, '@rocks': item.rocks || 0, '@srcId': itemId,
                '@subscription': String(item.subscription === true || item.subscription === 'true'),
                '@type': item.type, '@typeStatus': item.typeStatus || 'everlasting', '@zone': item.zone || '' // add zone for clothes
            });
            break;
        case 'seedshop':
            baseItemStorage = global.storage_seeds;
            itemWrapperTag = 'item';
            formatFunction = (item, itemId) => ({
                '@id': itemId, '@srcId': itemId, '@name': item.name, '@description': item.description || '',
                '@asset': item.asset, '@type': 'seed',
                '@subscription': String(item.subscription === true || item.subscription === 'true'),
                '@rocks': item.rocks || 0, '@level': item.level || 1, '@locationId': item.locationId || -1,
                '@health': item.health || 0, '@happiness': item.happiness || 0
            });
            break;
        case 'giftshop':
            baseItemStorage = global.storage_gifts;
            itemWrapperTag = 'gift';
            itemsToShow = Object.keys(baseItemStorage);
            formatFunction = (item, itemId) => ({
                '@displayClipPath': item.displayClipPath || '', '@id': itemId, '@level': item.level || 1,
                '@name': item.name, '@payloadPath': item.payloadPath || '', '@rox': item.rox || 0,
                '@srcId': itemId
            });
            break;
        default:
            pretty.warn(`Unknown shop type: ${locationType}`);
            return [];
    }
    if (!baseItemStorage) {
        pretty.error(`Base storage for shop type ${locationType} not loaded.`);
        return [];
    }
    for (const itemId of itemsToShow) {
        const baseItem = baseItemStorage[itemId];
        if (baseItem) {
            shopItems.push({ [itemWrapperTag]: formatFunction(baseItem, itemId) });
        } else {
            pretty.warn(`Item ID ${itemId} not found in storage for shop type ${locationType}.`);
        }
    }
    return shopItems;
}

/**
 * Checks if a user meets the requirements to purchase an item from a specific shop.
 * @param {number} userId - The ID of the user making the purchase.
 * @param {string|number} shopId - The ID/key of the shop (used for storage_stores).
 * @param {string|number} itemId - The ID/key of the item being purchased.
 * @param {object} itemData - The base data for the item from its storage (e.g., storage_items[itemId]).
 * @returns {Promise<{valid: boolean, reason: string|null}>} - Object indicating if purchase is valid and reason if not.
 */
async function checkShopPurchaseValidity(userId, shopId, itemId, itemData) {
    if (!itemData) {
        return { valid: false, reason: "Item data not found." };
    }
    const itemCost = itemData.rocks || 0;
    const itemLevelReq = itemData.level || 1;
    // check shop inventory
    const storeData = global.storage_stores?.[shopId];
    if (!storeData || !storeData.itemIds) {
        return { valid: false, reason: "Shop data not found or invalid." };
    }
    const storeItems = storeData.itemIds.split(',').map(id => id.trim());
    if (!storeItems.includes(String(itemId))) {
        return { valid: false, reason: "Item not sold in this shop." };
    }
    // check user rox and level
    try {
        const user = await database.getQuery('SELECT rocks, level FROM users WHERE id = ?', [userId]);
        if (!user) {
            return { valid: false, reason: "User not found." };
        }
        if (user.rocks < itemCost) {
            return { valid: false, reason: "Insufficient Rox." };
        }
        const userLevel = levelUtils.getUserLevel(user.level);
        if (userLevel < itemLevelReq) {
            return { valid: false, reason: "Level requirement not met." };
        }
        return { valid: true, reason: null };
    } catch (error) {
        pretty.error(`Database error checking purchase validity for user ${userId}, item ${itemId}:`, error);
        return { valid: false, reason: "Database error during validation." };
    }
}

/**
 * Deducts Rox from a user's account after a purchase.
 * @param {number} userId - The ID of the user.
 * @param {number} cost - The amount of Rox to deduct.
 * @returns {Promise<number|null>} - The user's new Rox balance, or null on failure.
 */
async function deductRoxForPurchase(userId, cost) {
    if (typeof cost !== 'number' || cost < 0) {
        pretty.warn(`Invalid cost provided for deduction: ${cost}`);
        return null; // invalid cost (?)
    }
    try {
        // check current rox first to prevent going negative due to race conditions
        const currentRox = await database.getQuery('SELECT rocks FROM users WHERE id = ?', [userId]);
        if (currentRox === null || currentRox.rocks < cost) {
            pretty.warn(`User ${userId} attempted purchase costing ${cost} but only has ${currentRox?.rocks}. Aborting deduction.`);
            return null; // not enough rox or user not found
        }
        // update rox balance
        const updateResult = await database.runQuery(
            'UPDATE users SET rocks = rocks - ? WHERE id = ? AND rocks >= ?',
            [cost, userId, cost]
        );
        if (updateResult && updateResult.changes > 0) {
            // fetch the new balance
            const newBalance = await database.getQuery('SELECT rocks FROM users WHERE id = ?', [userId]);
            return newBalance?.rocks ?? null; // return new balance or null if fetch fails
        } else {
            pretty.error(`Failed to deduct ${cost} Rox for user ${userId}. Update changes: ${updateResult?.changes}`);
            return null;
        }
    } catch (error) {
        pretty.error(`Database error deducting Rox for user ${userId}:`, error);
        return null;
    }
}

/**
 * Adds Rox to a user's account after a sale.
 * @param {number} userId - The ID of the user.
 * @param {number} amount - The amount of Rox to add.
 * @returns {Promise<number|null>} - The user's new Rox balance, or null on failure.
 */
async function addRoxFromSale(userId, amount) {
    if (typeof amount !== 'number' || amount < 0) {
        pretty.warn(`Invalid amount provided for Rox addition: ${amount}`);
        return null; // invalid amount
    }
    if (amount === 0) {
        const currentRox = await database.getQuery('SELECT rocks FROM users WHERE id = ?', [userId]);
        return currentRox?.rocks ?? null;
    }
    try {
        // perform the update
        const updateResult = await database.runQuery(
            'UPDATE users SET rocks = rocks + ? WHERE id = ?',
            [amount, userId]
        );
        if (updateResult && updateResult.changes > 0) {
            // get the new balance
            const newBalance = await database.getQuery('SELECT rocks FROM users WHERE id = ?', [userId]);
            return newBalance?.rocks ?? null; // return new balance or null if fetch fails
        } else {
            pretty.error(`Failed to add ${amount} Rox for user ${userId}. Update changes: ${updateResult?.changes}`);
            return null;
        }
    } catch (error) {
        pretty.error(`Database error adding Rox for user ${userId}:`, error);
        return null;
    }
}

module.exports = {
    formatShopItems,
    checkShopPurchaseValidity,
    deductRoxForPurchase,
    addRoxFromSale,
};