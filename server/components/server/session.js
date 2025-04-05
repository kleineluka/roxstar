const database = require('../database.js');
const pretty = require('../utils/pretty.js');
const shared = require('../utils/shared.js');

/**
 * Generates a random key of a specified length.
 * @param {number} key_length - The length of the key to be generated.
 * @returns {string} - The generated key.
 */
function make_key(key_length) {
    const char_map = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    let gen_key = "";
    for (let i = 0; i < key_length; i++) {
        gen_key += char_map.charAt(Math.floor(Math.random() * char_map.length));
    }
    return gen_key;
}

// confirm a key
async function confirm_key(username, key) {
    if (!username) {
        throw new Error('Username is required.');
    }
    try {
        // query the database to get the user with the provided username
        const [users] = await database.getQuery('SELECT sessionKey FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            throw new Error('User not found.');
        }
        const user = users[0];
        // check if the session key matches
        if (user.sessionKey === key) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error confirming session key:', error);
        throw error;
    }
}

// export the functions
module.exports = {
    make_key,
    confirm_key,
};
