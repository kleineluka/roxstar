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

module.exports = {
    changeUserMonster,
    validateMonsterName,
};