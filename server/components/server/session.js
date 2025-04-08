const crypto = require('crypto');
const database = require('./database.js');
const pretty = require('../utils/pretty.js');
const clock = require('../utils/clock.js');

/**
 * Generates a random string of bytes.
 * @param {number} byteLength - The length of the random string in bytes.
 * @returns {string} - The generated random string (hex encoded).
 **/
function getRandomBytes(byteLength = 16) {
    return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Generates a cryptographically secure random key string.
 * @param {number} key_length - The desired length of the key string in characters.
 * @returns {string} - The securely generated key string (hex encoded).
 * @throws {Error} - If crypto module is unavailable or generation fails.
 */
function makeKey(key_length) {
    if (key_length <= 0) {
        pretty.error("Key length must be positive.");
        throw new Error("Key length must be positive.");
    }
    // each byte becomes 2 hex characters so, we need key_length / 2 bytes (math.ceil for odd lengths)
    const numBytes = Math.ceil(key_length / 2);
    try {
        const randomBytes = crypto.randomBytes(numBytes);
        // convert bytes to a hex string- resulting string length will be numBytes * 2.
        const hexString = randomBytes.toString('hex');
        // slice the string to the exact desired length.
        return hexString.slice(0, key_length);
    } catch (error) {
        pretty.error("Failed to generate secure random bytes:", error);
        throw new Error("Could not generate secure key.");
    }
}

/**
 * Confirms if the provided session key matches the one stored in the database for the given username.
 * @param {string} username - The username of the user.
 * @param {string} key - The session key to be confirmed.
 * @returns {boolean} - Returns true if the key matches, false otherwise.
 **/
async function confirmKey(username, key) {
    if (!username) {
        throw new Error('Username is required for key confirmation.');
    }
    if (!key) {
        pretty.print(`confirmKey called for user "${username}" without a key.`, 'WARN');
        return false; 
    }
    try {
        const userRow = await database.getQuery('SELECT session_key FROM users WHERE username = ?', [username]);
        if (!userRow) {
            return false;
        }
        if (userRow.session_key === key) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        pretty.error(`Database error confirming key for user "${username}":`, error);
        throw error; 
    }
}

/**
 * Updates the user's session information in the database, optionally including 'remember_me'.
 * @param {number} id - The user ID.
 * @param {string} sessionKey - The new session key.
 * @param {string} ip - The user's IP address.
 * @param {string} rememberMe - Optional. If true, updates the 'remember_me' field in the database.
 **/
async function updateUserSession(id, sessionKey, ip, rememberMe = null) {
    const timestamp = await clock.getTimestamp();
    try {
        // parameters to always include
        let updateQuery = `
            UPDATE users
            SET last_ip = ?,
                last_active = ?,
                session_key = ?
        `;
        let queryParams = [ip, timestamp, sessionKey];
        // if rememberMe is provided, add it to the query and params
        if (rememberMe) {
            updateQuery += `, remember_me = ?`;
            queryParams.push(rememberMe); 
        }
        updateQuery += ` WHERE id = ?`; 
        queryParams.push(id);
        const result = await database.runQuery(updateQuery, queryParams);
        if (result && result.changes > 0) { 
            pretty.debug(`Successfully updated user ${id} session info${rememberMe === true ? ' and set remember_me.' : '.'}`); // Conditional debug message
            return true;
        } else {
            pretty.warn(`User update attempt failed for ID ${id}. User not found or data unchanged.`);
            return false;
        }
    } catch (error) {
        console.error(`Error updating user ${id} session:`, error);
        throw error;
    }
}

/**
 * Middleware to check if the user is authenticated.
 */
async function getUserAuthentication(req, res, next) {
    try {
        // ensure that the cookies necessary are provided
        if (!req.cookies.username || !req.cookies.id || !req.cookies.sessionId) {
            throw new Error('Missing cookies');
        }
        // confirm that the user is logged in
        const loggedIn = await confirmKey(req.cookies.username, req.cookies.sessionId);
        if (!loggedIn) {
            throw new Error('User not logged in');
        }
        // set the user id and username in the request object
        req.userID = req.cookies.id;
        req.username = req.cookies.username;
        next();
    } catch (error) {
        // failed to login, redirect back to the login page
        res.redirect('/login');
    }
}

// export the functions
module.exports = {
    getRandomBytes,
    makeKey,
    confirmKey,
    updateUserSession,
    getUserAuthentication
};
