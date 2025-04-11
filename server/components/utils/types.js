const pretty = require('./pretty.js');

/**
 * Map of monster type names (lowercase) to their corresponding numeric IDs used by the client.
 */
const monsterTypeNameToId = {
    "diavlo": 1,
    "furi": 2,
    "zommer": 3,
    "poppet": 4,
    "katsuma": 5,
    "luvli": 6
};

/**
 * Gets the numeric ID for a monster type string.
 * @param {string} monsterTypeString - The monster type name (e.g., 'katsuma', 'Poppet'). Case-insensitive.
 * @returns {number} - The corresponding ID, or a default ID (e.g., 5 for Katsuma) if not found.
 */
function getMonsterTypeId(monsterTypeString) {
    const defaultId = 5; // default to katsuma if not found
    if (!monsterTypeString || typeof monsterTypeString !== 'string') {
        pretty.debug(`getMonsterTypeId called with invalid input: ${monsterTypeString}. Returning default ${defaultId}.`);
        return defaultId;
    }
    const lowerCaseType = monsterTypeString.toLowerCase();
    return monsterTypeNameToId[lowerCaseType] ?? defaultId;
}

module.exports = {
    getMonsterTypeId,
};