const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js'); 

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

module.exports = {
    formatShopItems,
};