const database = require('../../server/database.js');
const clock = require('../../utils/clock.js');
const pretty = require('../../utils/pretty.js');

/**
 * Adds an item to a user's inventory (places it in the 'dock' - room_id -1).
 * @param {number} userId - The ID of the user.
 * @param {number} itemId - The ID of the item type to give (from storage_items).
 * @returns {Promise<number|null>} - The database ID of the newly inserted item instance, or null on failure.
 */
async function giveItemToUser(userId, itemId) {
    if (!userId || !itemId) {
        pretty.error(`giveItemToUser called with invalid userId (${userId}) or itemId (${itemId}).`);
        return null;
    }
    try {
        const timestamp = clock.getTimestamp(); // seconds, not 24 hours
        const sql = `
            INSERT INTO items (user_id, item_id, room_id, x, y, z, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        // items given directly usually go to the 'dock' or storage, represented by room_id -1
        // default x, y, z to 0 for items not placed in a room.
        const params = [userId, itemId, -1, '0', '0', '0', timestamp];
        const result = await database.runQuery(sql, params);
        if (result && result.lastID > 0) {
            pretty.debug(`Successfully gave item ${itemId} to user ${userId}. New item instance ID: ${result.lastID}`);
            return result.lastID; // return the unique ID of this specific item instance
        } else {
            pretty.warn(`Failed to insert item ${itemId} for user ID ${userId}. runQuery result: ${JSON.stringify(result)}`);
            return null;
        }
    } catch (error) {
        pretty.error(`Error giving item ${itemId} to user ID ${userId}:`, error);
        return null;
    }
}

/**
 * Gives a user their initial set of inventory items based on starter config.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<boolean>} - True if all items were given successfully, false otherwise.
 */
async function giveStarterInventory(userId) {
    if (!userId) {
        pretty.error("giveStarterInventory called without userId.");
        return false;
    }
    if (!global.config_starter || !global.config_starter.inventory || global.config_starter.inventory.length === 0) {
        pretty.warn(`No starter inventory items found in config for user ID ${userId}.`);
        return true; // technically success? lol
    }
    let allSuccessful = true;
    pretty.debug(`Giving starter inventory to user ID ${userId}...`);
    for (const startingItemId of global.config_starter.inventory) {
        const newItemId = await giveItemToUser(userId, startingItemId);
        if (newItemId === null) {
            pretty.warn(`Failed to give starter item ID ${startingItemId} to user ${userId}.`);
            allSuccessful = false; // mark overall failure if any item fails
        }
    }
    if (allSuccessful) {
        pretty.print(`Successfully gave all starter inventory items to user ID ${userId}.`, 'ACTION');
    } else {
        pretty.warn(`Finished giving starter inventory to user ID ${userId}, but some items failed.`);
    }
    return allSuccessful;
}

/**
 * Deletes a specific item instance from a user's inventory or room.
 * @param {number} userId - The ID of the user who owns the item.
 * @param {number} itemInstanceId - The unique ID of the item row in the 'items' table to delete.
 * @returns {Promise<boolean>} - True if the item was deleted, false otherwise.
 */
async function deleteUserItem(userId, itemInstanceId) {
    if (!userId || !itemInstanceId) {
        pretty.error(`deleteUserItem called with invalid userId (${userId}) or itemInstanceId (${itemInstanceId}).`);
        return false;
    }
    try {
        const sql = "DELETE FROM items WHERE user_id = ? AND id = ?";
        const result = await database.runQuery(sql, [userId, itemInstanceId]);
        if (result && result.changes > 0) {
            pretty.debug(`Successfully deleted item instance ID ${itemInstanceId} for user ID ${userId}.`);
            return true;
        } else {
            pretty.warn(`Could not delete item instance ID ${itemInstanceId} for user ID ${userId}. Item might not exist or belong to user. Changes: ${result?.changes}`);
            return false;
        }
    } catch (error) {
        pretty.error(`Error deleting item instance ID ${itemInstanceId} for user ID ${userId}:`, error);
        return false;
    }
}

/**
 * Formats clothing item data fetched from the database using global storage details.
 * @param {Array<object>} clothesData - Array of item rows from the 'clothes' table (needs id, item_id).
 * @returns {Array<object>} - Array of formatted clothing item objects for client/XML use.
 */
function formatUserClothes(clothesData) {
    if (!clothesData || clothesData.length === 0) {
        return [];
    }
    if (!global.storage_clothes) {
        pretty.error("global.storage_clothes is not loaded. Cannot format clothes.");
        return [];
    }
    const formattedClothes = [];
    for (const clothingItem of clothesData) {
        const baseItem = global.storage_clothes[clothingItem.item_id];
        if (!baseItem) {
            pretty.warn(`Could not find base clothing details for item_id: ${clothingItem.item_id}. Skipping item row ID ${clothingItem.id}.`);
            continue;
        }
        // combine database row id with base item details
        formattedClothes.push({
            item: { 
                '@id': clothingItem.id,
                '@srcId': clothingItem.item_id,
                '@name': baseItem.name,
                '@description': baseItem.description || '',
                '@asset': baseItem.asset,
                '@type': baseItem.type || 'clothing', 
                '@zone': baseItem.zone || '',
                '@animated': baseItem.animated || 'false',
                '@handler': baseItem.handler || '',
                '@args': baseItem.args || '',
                '@health': baseItem.health || 0,
                '@happiness': baseItem.happiness || 0,
            }
        });
    }
    return formattedClothes;
}

/**
 * Formats seed item data fetched from the database using global storage details.
 * @param {Array<object>} seedData - Array of item rows from the 'seeds' table (needs id, item_id).
 * @returns {Array<object>} - Array of formatted seed item objects for client/XML use.
 */
function formatUserSeeds(seedData) {
    if (!seedData || seedData.length === 0) {
        return [];
    }
    if (!global.storage_seeds) {
        pretty.error("global.storage_seeds is not loaded. Cannot format seeds.");
        return [];
    }
    const formattedSeeds = [];
    for (const seedItem of seedData) {
        const baseItem = global.storage_seeds[seedItem.item_id];
        if (!baseItem) {
            pretty.warn(`Could not find base seed details for item_id: ${seedItem.item_id}. Skipping item row ID ${seedItem.id}.`);
            continue;
        }
        // combine database row id with base item details
        formattedSeeds.push({
            item: { 
                '@id': seedItem.id,
                '@srcId': seedItem.item_id,
                '@name': baseItem.name,
                '@description': baseItem.description || '',
                '@asset': baseItem.asset,
                '@type': baseItem.type || 'seed',
                '@subscription': baseItem.subscription || 'false',
                '@rocks': baseItem.rocks || 0,
                '@level': baseItem.level || 1,
                '@locationId': baseItem.locationId || -1,
                '@health': baseItem.health || 0,
                '@happiness': baseItem.happiness || 0,
            }
        });
    }
    return formattedSeeds;
}

/**
 * Formats currently worn dressup items for XML output.
 * @param {Array<object>} dressupData - Array of rows from the 'dressup' table for the user.
 * @returns {Array<object>} - Array of formatted dressup item objects for client/XML use.
 */
function formatUserCostume(dressupData) {
    if (!dressupData || dressupData.length === 0) {
        return [];
    }
    const formattedCostume = [];
    for (const item of dressupData) {
        formattedCostume.push({
            dressupitem: {
                '@id': item.item_id,
                '@costumeitemId': item.id,
                '@x': item.x,
                '@y': item.y,
                '@z': item.z,
                '@xscale': item.xscale,
                '@yscale': item.yscale,
                '@rotation': item.rotation,
                '@layer': item.layer,
                '@boneName': item.boneName,
                '@direction': item.direction,
                localTransform: {
                    '@rotation': item.rotation,
                    '@x': item.x,
                    '@xscale': item.xscale,
                    '@y': item.y,
                    '@yscale': item.yscale
                }
            }
        });
    }
    return formattedCostume;
}

/**
 * Adds a clothing item to a user's clothing inventory.
 * @param {number} userId - The ID of the user.
 * @param {number|string} itemId - The ID of the clothing item type to give (from storage_clothes).
 * @returns {Promise<number|null>} - The database ID of the newly inserted clothing item instance, or null on failure.
 */
async function giveUserClothes(userId, itemId) {
    if (!userId || itemId === undefined || itemId === null) {
        pretty.error(`giveUserClothes called with invalid userId (${userId}) or itemId (${itemId}).`);
        return null;
    }
    try {
        const timestamp = clock.getTimestamp();
        const sql = `INSERT INTO clothes (user_id, item_id, date) VALUES (?, ?, ?)`;
        const params = [userId, itemId, timestamp];
        const result = await database.runQuery(sql, params);

        if (result && result.lastID > 0) {
            pretty.debug(`Successfully gave clothing item ${itemId} to user ${userId}. New clothes instance ID: ${result.lastID}`);
            return result.lastID; // return the unique ID of this specific clothing instance
        } else {
            pretty.warn(`Failed to insert clothing item ${itemId} for user ID ${userId}. Result: ${JSON.stringify(result)}`);
            return null;
        }
    } catch (error) {
        pretty.error(`Error giving clothing item ${itemId} to user ID ${userId}:`, error);
        return null;
    }
}

module.exports = {
    giveStarterInventory,
    giveItemToUser,
    deleteUserItem,
    formatUserClothes,
    formatUserSeeds,
    formatUserCostume,
    giveUserClothes,
};