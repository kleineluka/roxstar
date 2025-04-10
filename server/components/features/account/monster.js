const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Changes a user's monster type and clears their dress-up items (for monster-specific items).
 * @param {number} userId - The ID of the user.
 * @param {string} monsterType - The new monster type string.
 * @returns {Promise<boolean>} - True if monster type changed successfully, false otherwise.
 */
async function changeUserMonster(userId, monsterType) {
    if (!userId || !monsterType) {
        pretty.error(`changeUserMonster called with invalid userId (${userId}) or monsterType (${monsterType}).`);
        return false;
    }
    try {
        // update the monster type in the user's record
        let queryUsers = 'UPDATE users SET monster = ? WHERE id = ?';
        let valuesUsers = [monsterType, userId];
        const usersResult = await database.runQuery(queryUsers, valuesUsers);
        if (!usersResult || usersResult.changes === 0) {
            pretty.warn(`changeUserMonster: No user found or monster type not updated for user ID ${userId}.`);
            return false; 
        }
        // delete dress-up items from previous monster
        let queryDressup = 'DELETE FROM dressup WHERE user_id = ?';
        const dressupResult = await database.runQuery(queryDressup, [userId]);
        // should be okay if the above fails (since they may not have any items)
        pretty.debug(`Successfully changed monster type to "${monsterType}" and cleared dress-up items for user ID ${userId}.`);
        return true; 
    } catch (error) {
        pretty.error(`Error changing monster type for user ID ${userId}:`, error);
        return false;
    }
}

/**
 * Validates a monster name based on length, allowed characters, and censor list.
 * @param {string} monsterName - The monster name to validate.
 * @returns {boolean} - True if we can use the name, false otherwise.
 */
function validateMonsterName(monsterName) {
    const minLength = global.config_server['monster-name-length-minimum'];
    const maxLength = global.config_server['monster-name-length-limit'];
    // make sure the monster name is a string
    if (!monsterName || typeof monsterName !== 'string') {
        pretty.debug(`Monster name validation failed: Input is not a valid string.`);
        return false;
    }
    // check the length of the monster name
    if (monsterName.length < minLength || monsterName.length > maxLength) {
        pretty.debug(`Monster name validation failed: Length (${monsterName.length}) out of range [${minLength}-${maxLength}].`);
        return false;
    }
    // check for invalid characters (alphanumeric, hyphen, underscore)
    if (!/^[a-zA-Z0-9-_]+$/.test(monsterName)) {
        pretty.debug(`Monster name validation failed: Invalid characters in "${monsterName}".`);
        return false;
    }
    // check against the censor list
    if (global.config_censor.includes(monsterName.toLowerCase())) {
        pretty.debug(`Monster name validation failed: Monster name "${monsterName}" is censored.`);
        return false;
    }
    return true;
}

// Add this function somewhere in the file
/**
 * Parses the colorama JSON string and formats it for XML attributes.
 * @param {string|null} coloramaJson - The JSON string from the database (e.g., '["#FF0000", "#00FF00", "#0000FF"]').
 * @returns {object} - An object with '@customcolour1', '@customcolour2', '@customcolour3' keys, or an empty object if invalid.
 */
function getUserColoramaData(coloramaJson) {
    if (!coloramaJson || typeof coloramaJson !== 'string') {
        return {};
    }
    try {
        const colors = JSON.parse(coloramaJson);
        if (Array.isArray(colors) && colors.length >= 3) {
            // only take the first three colors, ensure they are strings
            const color1 = typeof colors[0] === 'string' ? colors[0] : null;
            const color2 = typeof colors[1] === 'string' ? colors[1] : null;
            const color3 = typeof colors[2] === 'string' ? colors[2] : null;
            // only include attributes if the color is valid
            const attributes = {};
            if (color1) attributes['@customcolour1'] = color1;
            if (color2) attributes['@customcolour2'] = color2;
            if (color3) attributes['@customcolour3'] = color3;
            return attributes;
        } else {
            pretty.debug(`Parsed colorama data is not an array or has less than 3 elements: ${coloramaJson}`);
            return {};
        }
    } catch (error) {
        pretty.warn(`Failed to parse colorama JSON: "${coloramaJson}"`, error);
        return {}; 
    }
}


/**
 * Gets the list of body parts and layers for a specific monster type.
 * @param {string} monsterType - The type of monster (e.g., 'katsuma', 'poppet').
 * @returns {Array<object>} - An array of part objects for XML building.
 */
function getMonsterParts(monsterType) {
    let parts = [];
    switch (monsterType) {
        case 'zommer':
            parts = [
                { part: { '@id': 'none', '@layer': '1' } }, { part: { '@id': 'farArm', '@layer': '1' } },
                { part: { '@id': 'farLeg', '@layer': '1' } }, { part: { '@id': 'tail', '@layer': '1' } },
                { part: { '@id': 'nearLeg', '@layer': '1' } }, { part: { '@id': 'body', '@layer': '1' } },
                { part: { '@id': 'nearArm', '@layer': '1' } }, { part: { '@id': 'farEar', '@layer': '1' } },
                { part: { '@id': 'headShape', '@layer': '1' } }, { part: { '@id': 'nearEar', '@layer': '1' } }
            ];
            break;
        case 'luvli':
            parts = [
                { part: { '@id': 'none', '@layer': '1' } }, { part: { '@id': 'farWing', '@layer': '1' } },
                { part: { '@id': 'farLeg', '@layer': '1' } }, { part: { '@id': 'nearLeg', '@layer': '1' } },
                { part: { '@id': 'frontGreen', '@layer': '1' } }, { part: { '@id': 'body', '@layer': '1' } },
                { part: { '@id': 'nearWing', '@layer': '1' } }
            ];
            break;
        case 'katsuma':
            parts = [
                { part: { '@id': 'none', '@layer': '1' } }, { part: { '@id': 'farArm', '@layer': '1' } },
                { part: { '@id': 'farLeg', '@layer': '1' } }, { part: { '@id': 'tail', '@layer': '1' } },
                { part: { '@id': 'nearLeg', '@layer': '1' } }, { part: { '@id': 'body', '@layer': '1' } },
                { part: { '@id': 'nearArm', '@layer': '1' } }, { part: { '@id': 'farEar', '@layer': '1' } },
                { part: { '@id': 'headShape', '@layer': '1' } }, { part: { '@id': 'nearEar', '@layer': '1' } }
            ];
            break;
        case 'poppet':
            parts = [
                { part: { '@id': 'none', '@layer': '1' } }, { part: { '@id': 'farLeg', '@layer': '1' } },
                { part: { '@id': 'farArm', '@layer': '1' } }, { part: { '@id': 'tail', '@layer': '1' } },
                { part: { '@id': 'nearLeg', '@layer': '1' } }, { part: { '@id': 'body', '@layer': '1' } },
                { part: { '@id': 'nearArm', '@layer': '1' } }, { part: { '@id': 'headShape', '@layer': '1' } }
            ];
            break;
        case 'furi':
            parts = [
                { part: { '@id': 'none', '@layer': '1' } }, { part: { '@id': 'farArm', '@layer': '1' } },
                { part: { '@id': 'farFoot', '@layer': '1' } }, { part: { '@id': 'nearFoot', '@layer': '1' } },
                { part: { '@id': 'body', '@layer': '1' } }, { part: { '@id': 'nearArm', '@layer': '1' } }
            ];
            break;
        case 'diavlo':
            parts = [
                { part: { '@id': 'none', '@layer': '1' } }, { part: { '@id': 'farWing', '@layer': '1' } },
                { part: { '@id': 'farArm', '@layer': '1' } }, { part: { '@id': 'tail', '@layer': '1' } },
                { part: { '@id': 'body', '@layer': '1' } }, { part: { '@id': 'nearWing', '@layer': '1' } },
                { part: { '@id': 'nearArm', '@layer': '1' } }, { part: { '@id': 'farLeg', '@layer': '1' } },
                { part: { '@id': 'nearLeg', '@layer': '1' } }
            ];
            break;
        default:
            pretty.warn(`Unknown monster type "${monsterType}" requested for parts.`);
            parts = [{ part: { '@id': 'none', '@layer': '1' } }]; // Default empty structure
    }
    return parts;
}

module.exports = {
    changeUserMonster,
    validateMonsterName,
    getUserColoramaData,
    getMonsterParts,
};