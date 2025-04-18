const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const database = require('../../server/database.js');

/**
 * Handles GET requests to free a caught Moshling (clears session state).
 */
router.get('/:tempId', async (req, res) => {
    const userId = req.session.userId;
    const tempInstanceId = req.params.tempId;
    if (!userId) {
        pretty.warn('Moshling free request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!tempInstanceId) {
        pretty.warn(`Moshling free request for user ${userId} missing temporary ID.`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing Moshling ID</error>');
    }
    // clear the session variables
    const sessionKey = `caughtMoshlingId_${tempInstanceId}`;
    let sessionCleared = false;

    if (req.session[sessionKey]) {
        delete req.session[sessionKey];
        pretty.debug(`Cleared Moshling session key ${sessionKey} for user ${userId}.`);
        sessionCleared = true;
    } else {
        pretty.warn(`Moshling free request for user ${userId}: No session data found for temp ID ${tempInstanceId}. Already freed or invalid ID?`);
    }
    // clear garden if applicable
    let gardenCleared = false;
    if (sessionCleared && req.session.garden_caught === true) {
        delete req.session.garden_caught;
        try {
            const defaultGardenStr = global.config_garden?.default_plot || '0~black~-1~0~0~0|1~black~-1~0~0~0|2~black~-1~0~0~0';
            await database.runQuery('UPDATE users SET garden = ? WHERE id = ?', [defaultGardenStr, userId]);
            pretty.debug(`Cleared garden for user ${userId} after freeing garden catch.`);
            gardenCleared = true;
        } catch (dbError) {
            pretty.error(`Failed to clear garden for user ${userId} after freeing Moshling:`, dbError);
        }
    }
    // save session
    if (sessionCleared || gardenCleared) {
        req.session.save((err) => {
            if (err) {
                pretty.error(`Session save error during Moshling free for user ${userId}:`, err);
            }
            const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
            res.type('text/xml').send(successXml);
        });
    } else {
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        res.type('text/xml').send(successXml);
    }
});

module.exports = router;