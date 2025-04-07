const database = require('../../server/database.js'); 
const pretty = require('../../utils/pretty.js');

/**
 * Validates a username based on length, allowed characters, and censor list.
 * @param {string} username - The username to validate.
 * @returns {boolean} - True if the username is valid according to basic rules, false otherwise.
 */
function isUserSyntaxValid(username) {
    const minLength = global.config_server['username-length-minimum'];
    const maxLength = global.config_server['username-length-limit'];
    // base case: if the username is empty, return false
    if (!username || typeof username !== 'string') {
        pretty.debug(`Username validation failed: Input is not a valid string.`);
        return false;
    }
    // make sure the username isn't too long or too short
    if (username.length < minLength || username.length > maxLength) {
        pretty.debug(`Username validation failed: Length (${username.length}) out of range [${minLength}-${maxLength}].`);
        return false;
    }
    // check for valid characters
    if (!/^[a-zA-Z0-9-_]+$/.test(username)) {
        pretty.debug(`Username validation failed: Invalid characters in "${username}".`);
        return false;
    }
    // check the username against the censor list
    if (global.config_censor.includes(username.toLowerCase())) {
        pretty.debug(`Username validation failed: Username "${username}" is censored.`);
        return false;
    }
    return true;
}

/**
 * Determines if a username is allowed (passes syntax validation and optionally isn't already taken).
 * @param {string} requestedUsername - The username to check.
 * @param {boolean} [skipDatabaseCheck=false] - If true, skips checking the database for existence.
 * @returns {Promise<boolean>} - True if the username is allowed, false otherwise.
 */
async function isUsernameAllowed(requestedUsername, skipDatabaseCheck = false) {
    if (!isUserSyntaxValid(requestedUsername)) {
        return false;
    }
    if (!skipDatabaseCheck) {
        try {
            pretty.debug(`Checking database for username: "${requestedUsername}"`);
            const existingUser = await database.getQuery('SELECT 1 FROM users WHERE username = ? LIMIT 1', [requestedUsername]);
            // if getQuery returns a row (even { '1': 1 }), it means the user exists.
            if (existingUser) {
                pretty.debug(`Username allowed check failed: "${requestedUsername}" already exists.`);
                return false;
            } else {
                pretty.debug(`Username "${requestedUsername}" is available.`);
            }
        } catch (error) {
            pretty.error(`Database error checking username existence for "${requestedUsername}":`, error);
            return false;
        }
    }
    return true; 
}

// --- Exports ---
module.exports = {
    isUserSyntaxValid, 
    isUsernameAllowed,
};