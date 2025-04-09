const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const notifs = require('../../utils/notifs.js');
const pretty = require('../../utils/pretty.js');
const database = require('../../server/database.js');
const session = require('../../server/session.js');

/**
 * This handles /login GET requests from the client.
 */
router.get("/", async (req, res) => { 
    console.log('Login page accessed. Checking session for toast message.');
    if (req.session.toast) {
        let toast_message = req.session.toast.message;
        let toast_color = req.session.toast.color;
        delete req.session.toast;
        await req.session.save();
        notifs.sendToast(req, res, toast_message, toast_color, '../../web/login.html');
    } else {
        res.render('../../web/login.html');
    }
});

/**
 * This handles /login POST requests from the client.
 */
router.post("/", global.body_parser.urlencoded({ extended: true }), async (req, res) => {
    let loginResult;
    let session_clock = (req.body['remember-me'] === 'on') ? global.config_server['session-remember-me-true'] : global.config_server['session-remember-me-false'];
    if (!req.body.username || !req.body.password) {
        notifs.sendToast(req, res, 'Please make sure you entered your username and password!', '#be9ddf', '../../web/login.html');
        loginResult = 'no_redirect';
    } else {
        try {
            const userRow = await database.getQuery(`SELECT * FROM users WHERE username = ?`, [req.body.username]);
            if (!userRow) {
                notifs.sendToast(req, res, 'Your username or password is incorrect.', '#be9ddf', '../../web/login.html');
                loginResult = 'no_redirect';
            } else if (userRow.activation_status === 'banned') {
                notifs.sendToast(req, res, 'Your account is banned.', '#be9ddf', '../../web/login.html');
                loginResult = 'no_redirect';
            } else {
                const password_match = await bcrypt.compare(req.body.password, userRow.password);
                if (!password_match) {
                    notifs.sendToast(req, res, 'Your username or password is incorrect.', '#be9ddf', '../../web/login.html');
                    loginResult = 'no_redirect';
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
                        loginResult = 'monsters'; // redirect to monsters page
                    } else {
                        loginResult = 'needsActivation'; // redirect to activation page
                    }
                }
            }
        } catch (error) {
            pretty.error('Login function encountered an error:', error);
            notifs.sendToast(req, res, 'An internal error occurred during login. Please try again.', '#FF0000', '../../web/login.html');
            loginResult = 'no_redirect';
        }
    }
    if (loginResult != 'no_redirect') {
        const redirection = (loginResult !== 'needsActivation') ? '/monsters' : '/activation';
        res.redirect(redirection);
    }
});

module.exports = router;