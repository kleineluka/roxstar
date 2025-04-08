const bcrypt = require('bcrypt');
const pretty = require('../../utils/pretty.js');
const database = require('../../server/database.js');
const session = require('../../server/session.js');
const notifs = require('../../utils/notifs.js'); 

/**
 * Handles user login requests.
 * @async
 * @param {Object} req - The request object containing user credentials.
 * @param {Object} res - The response object for sending responses to the client.
 * @returns {string} - A redirect URL based on the login status.
 */
async function login(req, res) {
    let session_clock = (req.body['remember-me'] === 'on') ? global.config_server['session-remember-me-true'] : global.config_server['session-remember-me-false'];
    if (!req.body.username || !req.body.password) {
        notifs.sendToast(req, res, 'Please make sure you entered your username and password!', '#be9ddf', '../public/login.html');
        return 'no_redirect'; 
    }
    try {
        const userRow = await database.getQuery(`SELECT * FROM users WHERE username = ?`, [req.body.username]);
        if (!userRow) {
            notifs.sendToast(req, res, 'Your username or password is incorrect.', '#be9ddf', '../public/login.html');
            return 'no_redirect';
        }
        if (userRow.activation_status === 'banned') { 
            notifs.sendToast(req, res, 'Your account is banned.', '#be9ddf', '../public/login.html');
            return 'no_redirect';
        }
        const password_match = await bcrypt.compare(req.body.password, userRow.password);
        if (!password_match) {
            notifs.sendToast(req, res, 'Your username or password is incorrect.', '#be9ddf', '../public/login.html');
            return 'no_redirect';
        } else {
            // store data client-side
            req.session.loggedIn = true;
            req.session.username = userRow.username;
            req.session.userId = userRow.id; 
            let sessionKey = session.makeKey(global.config_server['login-key-length']);
            req.session.sessionKey = sessionKey;
            req.session.save();
            // optionally, store a cookie to remember the user
            let rememberMe = req.body['remember-me'] === 'on' ? session.makeKey(32) : null;
            res.cookie('username', userRow.username, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
            res.cookie('id', userRow.id, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
            res.cookie('rememberMe', rememberMe, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
            await session.updateUserSession(userRow.id, sessionKey, req.ip, rememberMe);
            // redirect the user based on activation status
            if (userRow.activation_status === 'active') {
                return 'monsters'; // redirect to monsters page
            } else {
                return 'needsActivation'; // redirect to activation page
            }
        }
    } catch (error) {
        pretty.error('Login function encountered an error:', error);
        notifs.sendToast(req, res, 'An internal error occurred during login. Please try again.', '#FF0000', '../public/login.html');
        return 'no_redirect'; 
    }
}

module.exports = {
    login,
};