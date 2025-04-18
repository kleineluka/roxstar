const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const socialUtils = require('../../features/account/socials.js');
const moshlingUtils = require('../../features/account/moshlings.js');

/**
 * Handles POST requests to keep a caught Moshling.
 * Expects XML body like: <moshling id="TEMP_INSTANCE_ID"/>
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Moshling keep request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // get the moshling id from the request body
    const attributes = req.body?.keepmoshling?.$;
    const tempInstanceId = attributes?.id;
    if (!tempInstanceId) {
        pretty.warn(`Moshling keep request for user ${userId} missing temporary ID. Body: ${JSON.stringify(req.body)}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing Moshling ID</error>');
    }
    // check if the tempInstanceId is valid
    const sessionKey = `caughtMoshlingId_${tempInstanceId}`;
    const moshlingSrcId = req.session[sessionKey]; // get the srcId stored by formatCaughtMoshlingData
    if (!moshlingSrcId) {
        pretty.warn(`Moshling keep request for user ${userId}: No srcId found in session for temp ID ${tempInstanceId}. Session might have expired or ID is invalid.`);
        return res.status(400).type('text/xml').send('<error code="INVALID_SESSION">Invalid or expired Moshling catch session</error>');
    }
    // prevent replay attacks or keeping the same temp ID multiple times
    delete req.session[sessionKey];
    const wasGardenCatch = req.session.garden_caught === true;
    if (wasGardenCatch) {
        delete req.session.garden_caught;
    }
    req.session.save(err => { if (err) pretty.error(`Session save error after clearing moshling keep data for user ${userId}:`, err); });
    try {
        // add moshling to their collection
        const timestamp = clock.getTimestamp();
        const insertResult = await database.runQuery(
            `INSERT INTO moshlings (user_id, srcId, in_room, date) VALUES (?, ?, 'false', ?)`,
            [userId, moshlingSrcId, timestamp]
        );
        if (!insertResult || insertResult.lastID === 0) {
            pretty.error(`Failed to insert kept Moshling (srcId: ${moshlingSrcId}) for user ${userId}.`);
            const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Database error' } } }).end();
            return res.status(500).type('text/xml').send(xmlError);
        }
        const newDbInstanceId = insertResult.lastID;
        pretty.print(`User ${userId} kept Moshling srcId ${moshlingSrcId}. New DB ID: ${newDbInstanceId}`, 'ACTION');
        if (wasGardenCatch) {
            const defaultGardenStr = global.config_garden?.default_plot || '0~black~-1~0~0~0|1~black~-1~0~0~0|2~black~-1~0~0~0';
            await database.runQuery('UPDATE users SET garden = ? WHERE id = ?', [defaultGardenStr, userId]);
            pretty.debug(`Cleared garden for user ${userId} after keeping garden catch.`);
        }
        // log to bff news
        await socialUtils.logBffNews(userId, 'CaughtMoshling', moshlingSrcId);
        // updated moshling count
        const allMoshlings = await database.getAllQuery('SELECT srcId FROM moshlings WHERE user_id = ?', [userId]);
        const uniqueMoshlingCount = moshlingUtils.getMoshlingCount(allMoshlings);
        const responseData = {
            moshlingResponse: {
                status: { '@code': 0, '@text': 'success' },
                moshlingStats: {
                    '@ownedUniqueMoshlings': uniqueMoshlingCount
                }
            }
        };
        const xml = xmlbuilder.create(responseData, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });

        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error processing Moshling keep request for user ${userId}, srcId ${moshlingSrcId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } }).end();
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;