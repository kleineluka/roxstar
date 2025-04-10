const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const inventoryUtils = require('./inventory.js');
const socialUtils = require('./socials.js');

/**
 * Checks for and awards missing level-up trophies up to the user's current level.
 * @param {number} userId - The ID of the user.
 * @param {number} currentLevel - The user's current level number.
 * @returns {Promise<{newLevel: boolean, awardedItems: Array<object>}>} - Object indicating if a new level trophy was awarded and the formatted data of awarded items.
 */
async function awardMissingLevelTrophies(userId, currentLevel) {
    const result = { newLevel: false, awardedItems: [] };
    if (!global.config_trophies || !Array.isArray(global.config_trophies)) {
        pretty.error("Level trophies configuration (global.config_trophies) is missing or not an array.");
        return result;
    }
    if (!global.storage_items) {
        pretty.error("Item storage (global.storage_items) is missing.");
        return result;
    }
    if (currentLevel <= 1) {
        return result; // no trophies for level 1 (or below)
    }
    try {
        // determine which trophies should be awarded (up to currentLevel - 1 index)
        const requiredTrophyIds = global.config_trophies.slice(0, currentLevel - 1); // level 2 trophy is at index 0, Level 3 at index 1, etc.
        if (requiredTrophyIds.length === 0) {
            return result; // no new trophies to add
        }
        // get items the user already owns (specifically checking for these trophies)
        const ownedItems = await database.getAllQuery(
            `SELECT item_id FROM items WHERE user_id = ? AND item_id IN (${requiredTrophyIds.map(() => '?').join(',')})`,
            [userId, ...requiredTrophyIds]
        );
        const ownedItemIds = new Set(ownedItems.map(item => item.item_id));
        // find which required trophies are missing
        const missingTrophyIds = requiredTrophyIds.filter(trophyId => !ownedItemIds.has(trophyId));
        if (missingTrophyIds.length > 0) {
            pretty.debug(`User ${userId} is missing level trophies: ${missingTrophyIds.join(', ')}`);
            result.newLevel = true;
            for (const trophyId of missingTrophyIds) {
                const newItemInstanceId = await inventoryUtils.giveItemToUser(userId, trophyId);
                if (newItemInstanceId !== null) {
                    const baseItem = global.storage_items[trophyId];
                    if (baseItem) {
                        result.awardedItems.push({
                            item: {
                                '@name': baseItem.name,
                                '@description': baseItem.description || '',
                                '@asset': baseItem.asset,
                                '@id': newItemInstanceId,
                                '@srcId': trophyId,
                                '@state': baseItem.state || '',
                                '@type': baseItem.type || 'trophy',
                                '@typeStatus': baseItem.typeStatus || '',
                                '@rocks': baseItem.rocks || 0,
                                '@roomId': -1,
                                '@x': 0,
                                '@y': 0,
                                '@z': 0,
                                '@tiled': baseItem.tiled || 'false',
                                '@structureId': baseItem.structureId || '',
                                '@layer': baseItem.layer || 0,
                                '@animated': baseItem.animated || 'false',
                                '@replacedefault': baseItem.replacedefault || 'false',
                                '@handler': baseItem.handler || '',
                                '@args': baseItem.args || '',
                                '@health': baseItem.health || 0,
                                '@happiness': baseItem.happiness || 0,
                            }
                        });
                        await socialUtils.logBffNews(userId, 'achievement', trophyId); // or use 'LevelledUp' type with the level?
                        pretty.print(`Awarded level trophy ${trophyId} to user ${userId}`, 'ACTION');
                    } else {
                        pretty.warn(`Awarded trophy ${trophyId} (instance ${newItemInstanceId}) but couldn't find base item data.`);
                    }
                } else {
                    pretty.error(`Failed to give level trophy ${trophyId} to user ${userId}.`);
                }
            }
        }
        return result;
    } catch (error) {
        pretty.error(`Error checking/awarding level trophies for user ID ${userId}:`, error);
        return result; // return default result on error
    }
}

module.exports = {
    awardMissingLevelTrophies,
};