// --- Imports ---
const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests for the monsters page, rendering the game for a logged-in user.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.debug("Monsters page access attempt without userId in session. Redirecting to login.");
        req.session.toast = { message: 'Please log in to access your monster.', color: '#be9ddf' };
        await new Promise(resolve => req.session.save(resolve));
        return res.redirect('../../web/login.html');
    }
    try {
        const userRow = await database.getQuery(
            `SELECT username, activation_status, settings FROM users WHERE id = ?`, [userId]);
        if (!userRow) {
            pretty.warn(`User ID ${userId} found in session but not in database. Invalidating session.`);
            req.session.destroy((err) => {
                if (err) {
                    pretty.error("Error destroying invalid session:", err);
                }
                res.redirect('../../web/login.html');
            });
            return;
        }
        if (userRow.activation_status === 'banned') {
            pretty.debug(`Banned user ID ${userId} attempted to access monsters page.`);
            req.session.toast = { message: 'Your account is banned.', color: '#be9ddf' };
            await new Promise(resolve => req.session.save(resolve));
            return res.redirect('../../web/login.html');
        }
        if (userRow.activation_status !== 'Member') {
            pretty.debug(`User ID ${userId} attempted to access monsters page with status "${userRow.activation_status}". Redirecting.`);
            const needsActivation = userRow.activation_status === 'needsActivation' || userRow.activation_status === 'noEmail';
            const message = needsActivation
                ? 'Your account is not activated, please finish activating here!'
                : 'Your account status prevents access. There seems to be an issue here, make a new account or report the bug.';
            const redirectUrl = needsActivation ? '/activation' : '/login';
            req.session.toast = { message: message, color: '#be9ddf' };
            await new Promise(resolve => req.session.save(resolve));
            return res.redirect(redirectUrl);
        }
        let userSettings = {};
        const defaultSettings = { 0: 1, 1: 3 };
        if (!userRow.settings) {
            pretty.warn(`User ID ${userId} has missing settings string. Using defaults.`);
            userSettings = defaultSettings;
        } else {
            try {
                userSettings = JSON.parse(userRow.settings);
                if (!Array.isArray(userSettings) || userSettings.length < 2) {
                    pretty.warn(`User ID ${userId} has invalid settings format: ${userRow.settings}. Using defaults.`);
                    userSettings = defaultSettings;
                }
            } catch (parseError) {
                pretty.error(`Error parsing settings JSON for user ID ${userId}:`, parseError);
                req.session.toast = { message: 'Failed to load your settings. Please try logging in again.', color: '#ffaaaa' };
                await new Promise(resolve => req.session.save(resolve));
                return res.redirect('../../web/login.html');
            }
        }
        const userName = userRow.username;
        const userQuality = userSettings[1] ?? defaultSettings[1];
        const userSound = userSettings[0] ?? defaultSettings[0];
        const flashVars = `siteroot=../&clientroot=${global.config_server['final-url']}/media/game/&cookie=mcAuth=${userId}|User|${userName}|${userId}; lastUsername=${userName}; trgt=Yj0w&shellmode=ownMonster&browserurl=${global.config_server['final-url']}/monsters&forumsurl=${global.config_server['forums-url']}&quality=${userQuality}&sound=${userSound}`;
        const shellData = `${global.config_server['final-url']}/media/game/shell/1.10/flash/shell.swf`;
        pretty.debug(`Rendering monsters page for user ID ${userId} (${userName}).`);
        res.render('../../web/monsters.html', {
            shell_data: shellData,
            flash_vars: flashVars
        });
    } catch (error) {
        pretty.error(`Error loading monsters page for user ID ${userId}:`, error);
        req.session.toast = { message: 'An internal server error occurred while loading the game. Please try again.', color: '#ffaaaa' };
        try { await new Promise(resolve => req.session.save(resolve)); } catch (saveErr) { pretty.error("Failed to save session during error handling:", saveErr); }
        res.redirect('../../web/login');
    }
});

module.exports = router;