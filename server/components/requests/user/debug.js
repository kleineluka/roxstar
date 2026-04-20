const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');
const database = require('../../server/database.js');
const session = require('../../server/session.js');

router.get("/:slot", async (req, res) => {
    if (!global.config_server['debug']) {
        return res.status(403).send('Debug mode is not enabled.');
    }
    const accounts = global.config_server['debug-accounts'];
    if (!accounts) {
        return res.status(500).send('No debug accounts configured.');
    }
    const slot = req.params.slot;
    const account = accounts[slot];
    if (!account || !account.username) {
        return res.status(400).send(`No debug account configured for slot "${slot}".`);
    }
    try {
        const userRow = await database.getQuery(`SELECT * FROM users WHERE username = ?`, [account.username]);
        if (!userRow) {
            return res.status(404).send(`Debug account "${account.username}" not found in database.`);
        }
        if (userRow.activation_status === 'banned') {
            return res.status(403).send(`Debug account "${account.username}" is banned.`);
        }
        let session_clock = global.config_server['session-remember-me-true'];
        req.session.loggedIn = true;
        req.session.username = userRow.username;
        req.session.userId = userRow.id;
        let sessionKey = session.makeKey(global.config_server['login-key-length']);
        req.session.sessionKey = sessionKey;
        req.session.save();
        res.cookie('username', userRow.username, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
        res.cookie('id', userRow.id, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
        res.cookie('rememberMe', null, { maxAge: session_clock * 1000, httpOnly: true, path: '/' });
        await session.updateUserSession(userRow.id, sessionKey, req.ip, null);
        pretty.print(`Debug auto-login: "${userRow.username}" (slot ${slot})`, 'DEBUG');
        if (userRow.activation_status === 'Member') {
            res.redirect('/monsters');
        } else {
            res.redirect('/activation');
        }
    } catch (error) {
        pretty.error('Debug login error:', error);
        res.status(500).send('Debug login failed.');
    }
});

module.exports = router;
