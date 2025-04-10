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

module.exports = {
    getMoshlingCount,
    formatUserMoshlings,
};