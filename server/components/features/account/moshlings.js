const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Calculates the number of unique Moshling species a user owns.
 * @param {Array<object>} allUserMoshlings - Array of all moshling rows fetched for the user (needs 'srcId').
 * @returns {number} - The count of unique Moshling species owned.
 */
function getMoshlingCount(allUserMoshlings) {
    if (!Array.isArray(allUserMoshlings)) {
        pretty.warn("getMoshlingCount received invalid data.");
        return 0;
    }
    const uniqueSrcIds = new Set(allUserMoshlings.map(m => m.srcId));
    return uniqueSrcIds.size;
}

/**
 * Formats the user's Moshlings that are currently placed in their room for XML output.
 * Includes the overall count of unique owned Moshlings.
 * @param {Array<object>} allUserMoshlings - Array of all moshling rows fetched for the user (needs 'id', 'srcId', 'in_room').
 * @param {number} uniqueMoshlingCount - The pre-calculated count of unique species owned.
 * @returns {object} - An object containing formatted moshling data ready for XML building.
 */
function formatUserMoshlings(allUserMoshlings, uniqueMoshlingCount) {
    const formatted = {
        // the stats element always exists, even if no moshlings are in the room
        moshlingStats: {
            '@ownedUniqueMoshlings': uniqueMoshlingCount
        },
        // the moshling element will contain the array of those in the room
        moshling: []
    };
    if (!global.storage_moshlings) {
        pretty.error("global.storage_moshlings is not loaded. Cannot format moshlings.");
        return formatted; // return structure with empty moshling list
    }
    if (!Array.isArray(allUserMoshlings)) {
        pretty.warn("formatUserMoshlings received invalid moshling data array.");
        return formatted;
    }
    // filter for moshlings that are explicitly 'in_room' and limit to 6
    const moshlingsInRoom = allUserMoshlings
        .filter(m => m.in_room === 'true' || m.in_room === true || m.in_room === 1) // handle bool/string/int
        .slice(0, 6); 
    for (const moshling of moshlingsInRoom) {
        const baseMoshling = global.storage_moshlings[moshling.srcId];
        if (!baseMoshling) {
            pretty.warn(`Could not find base moshling details for srcId: ${moshling.srcId}. Skipping moshling instance ID ${moshling.id}.`);
            continue;
        }
        formatted.moshling.push({
            moshling: {
                '@id': moshling.id,
                '@asset': baseMoshling.asset,
                '@catchtype': baseMoshling.catchType || 'unknown',
                '@floating': String(baseMoshling.floating === true || baseMoshling.floating === 'true'),
                '@name': baseMoshling.name,
                '@rank': baseMoshling.rank || 'common',
                '@rarityid': baseMoshling.rarityid || 0,
                '@uuid': baseMoshling.uuid || '',
                '@srcId': moshling.srcId
            }
        });
    }
    if (formatted.moshling.length === 0) {
        formatted.moshling = []; // ensure it's an empty array, not undefined
    }
    return formatted;
}

/**
 * Augments the base zoo structure with the user's owned Moshling counts.
 * Creates a deep copy of the base zoo structure to avoid modifying the global object.
 * @param {number} userId - The ID of the user whose counts to fetch.
 * @returns {Promise<object>} - The augmented zoo structure object.
 */
async function getUserZooData(userId) {
    // deep copy the base zoo structure
    if (!global.storage_zoo) {
        pretty.error("Zoo storage (global.storage_zoo) not loaded.");
        return {}; // return empty object on error
    }
    const userZooData = JSON.parse(JSON.stringify(global.storage_zoo));
    try {
        // get user's owned counts per srcId
        const ownedCounts = await database.getAllQuery(
            `SELECT srcId, COUNT(srcId) as quantity
             FROM moshlings
             WHERE user_id = ?
             GROUP BY srcId`,
            [userId]
        );
        if (!ownedCounts || ownedCounts.length === 0) {
            // user owns no moshlings, return the base structure (with potentially 0 quantities)
            if (userZooData.moshlingSets && Array.isArray(userZooData.moshlingSets)) {
                for (const set of userZooData.moshlingSets) {
                    if (set.moshlings && Array.isArray(set.moshlings)) {
                        set.moshlings.forEach(m => m.quantity = 0);
                    }
                }
            }
            return userZooData;
        }
        // create a Map for quick lookup of owned counts
        const ownedMap = new Map();
        ownedCounts.forEach(item => {
            ownedMap.set(item.srcId, item.quantity);
        });
        // iterate through the copied zoo structure and inject quantities
        if (userZooData.moshlingSets && Array.isArray(userZooData.moshlingSets)) {
            for (const set of userZooData.moshlingSets) {
                if (set.moshlings && Array.isArray(set.moshlings)) {
                    for (const moshling of set.moshlings) {
                        // get quantity from map or default to 0 if not owned
                        moshling.quantity = ownedMap.get(moshling.srcId) || 0;
                    }
                }
            }
        }
        return userZooData;
    } catch (error) {
        pretty.error(`Error fetching user zoo data for user ID ${userId}:`, error);
        return userZooData; // return the (potentially partially modified) structure on error
    }
}

/**
 * Augments the moshlingRequirements in a zoo data structure with storeInfo from global seeds storage.
 * This modifies the passed object in place.
 * @param {object} zooData - The zoo data object to augment.
 */
function augmentMoshlingRequirements(zooData) {
    if (!zooData || !Array.isArray(zooData.moshlingSets)) {
        pretty.warn("augmentMoshlingRequirements called with invalid zooData.");
        return;
    }
    if (!global.storage_seeds) {
        pretty.error("Cannot augment moshling requirements: global.storage_seeds not loaded.");
        return;
    }
    // create a map of seed assets to their details for faster lookups
    const seedAssetMap = new Map();
    for (const seedId in global.storage_seeds) {
        const seed = global.storage_seeds[seedId];
        // use the base asset path as the key (e.g., 'items/seed/moon_orchid.swf')
        seedAssetMap.set(seed.asset, {
            id: seedId,
            level: seed.level || 1,
            membersOnly: String(seed.subscription === true || seed.subscription === 'true'),
            price: seed.rocks || 0
        });
    }
    // iterate through the zoo data and inject storeInfo
    for (const set of zooData.moshlingSets) {
        if (set.moshlings && Array.isArray(set.moshlings)) {
            for (const moshling of set.moshlings) {
                if (moshling.moshlingRequirements && Array.isArray(moshling.moshlingRequirements)) {
                    for (const req of moshling.moshlingRequirements) {
                        // the path in the requirement might have a colour, e.g., _blue.swf
                        const reqPathBase = req.path.replace(/_(red|blue|yellow|black|pink|purple)\.swf$/, '.swf');
                        const baseSeedDetails = seedAssetMap.get(reqPathBase);
                        if (baseSeedDetails) {
                            req.id = parseInt(baseSeedDetails.id, 10); // inject the base seed ID
                            req.storeInfo = {
                                '@id': baseSeedDetails.id,
                                '@level': baseSeedDetails.level,
                                '@membersOnly': baseSeedDetails.membersOnly,
                                '@price': baseSeedDetails.price
                            };
                        } else {
                            req.storeInfo = {};
                            pretty.warn(`Could not find base seed for requirement path: ${req.path} (Base: ${reqPathBase})`);
                        }
                    }
                }
            }
        }
    }
}

module.exports = {
    getMoshlingCount,
    formatUserMoshlings,
    getUserZooData,
    augmentMoshlingRequirements,
};