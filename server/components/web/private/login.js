const bcrypt = require('bcrypt');
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
    if (!req.session.tkn) {
        notifs.sendToast(req, res, 'Your session is invalid, please try restarting!', '#be9ddf', '../public/login.html');
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
        }
        const key_session = req.sessionID;
        const key_login = await session.makeKey(global.config_server['login-key-length']);
        req.session.loggedIn = true;
        req.session.username = userRow.username;
        req.session.userId = userRow.id; 
        req.session.save((err) => {
            if (err) {
                pretty.error("Session save error:", err); 
                notifs.toast(req, res, 'Failed to save session.', '#FF0000', '../public/login.html'); 
                return; 
            }
            res.cookie('username', userRow.username, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
            res.cookie('id', userRow.id, { maxAge: session_clock * 1000, httpOnly: true, path: '/' }); 
            res.cookie('lastUsername', userRow.username, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
            res.cookie('rsAuth', `${userRow.id}|${sessions.getRandomBytes()}|User|${userRow.username}`, { maxAge: session_clock * 1000, httpOnly: true, path: '/' }); 
            session.updateUserSession(userRow.id, key_session, key_login, req.ip)
                .then(() => {
                    if (userRow.activation_status === 'active') { 
                        res.redirect('../public/monsters.html');
                    } else if (userRow.activation_status === 'needsActivation') {
                        res.redirect('../public/activation.html');
                    } else {
                        res.redirect('../public/login.html'); 
                    }
                })
                .catch(updateError => {
                    pretty.error("Failed to update user session:", updateError); 
                    notifs.toast(req, res, 'Login failed during final update.', '#FF0000', '../public/login.html');
                });
        });
    } catch (error) {
        pretty.error('Login function encountered an error:', error);
        notifs.sendToast(req, res, 'An internal error occurred during login. Please try again.', '#FF0000', '../public/login.html');
        return 'no_redirect'; 
    }
}

module.exports = {
    login,
};