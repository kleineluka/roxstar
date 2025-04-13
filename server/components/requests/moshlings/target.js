const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const gardenUtils = require('../../features/world/garden.js');

/**
 * Helper to send the standard success XML response.
 * @param {object} res - The Express response object.
 */
function sendSuccessXml(res) {
    const responseData = { status: { '@code': 0, '@text': 'success' } };
    const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
        .end({ pretty: global.config_server['pretty-print-replies'] });
    res.type('text/xml').send(xml);
}

/**
 * Handles POST requests to set the target Moshling in the session.
 * Expects JSON body: { "uuid": "moshling-uuid-string" }
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    const targetUuid = req.body?.uuid;
    if (!userId) {
        pretty.warn('Moshling target POST request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUuid || typeof targetUuid !== 'string') {
        pretty.warn(`Moshling target POST request for user ${userId} missing or invalid UUID.`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing or invalid UUID</error>');
    }
    // make sure it works
    const targetInfo = gardenUtils.getMoshlingTargetInfo(targetUuid);
    if (!targetInfo) {
        pretty.warn(`Moshling target POST request for user ${userId} specified an unknown UUID: ${targetUuid}`);
        return res.status(404).type('text/xml').send('<error code="NOT_FOUND">Invalid Moshling UUID</error>');
    }
    // ensure it's actually a seed-catchable moshling
    if (targetInfo.catchType !== 'seed') {
        pretty.warn(`Moshling target POST request for user ${userId} specified a non-seed Moshling UUID: ${targetUuid}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_TYPE">Moshling not catchable via seeds</error>');
    }
    // set session variables
    // todo: make it use database as well
    req.session.targetMoshlingUuid = targetUuid; // store the UUID
    req.session.save((err) => {
        if (err) {
            pretty.error(`Session save error setting target Moshling for user ${userId}:`, err);
            const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Session Error' } } }).end();
            return res.status(500).type('text/xml').send(xmlError);
        }
        pretty.debug(`Set target Moshling UUID for user ${userId} to: ${targetUuid}`);
        sendSuccessXml(res); // send standard success response
    });
});

/**
 * Handles GET requests to clear the target Moshling from the session.
 * Triggered by the presence of the '?clear' query parameter (value doesn't matter).
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Moshling target GET request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // use 'in' operator to check for the presence of the key, regardless of value
    if ('clear' in req.query) {
        // clear the target in session
        if (req.session.targetMoshlingUuid) {
            delete req.session.targetMoshlingUuid;
            pretty.debug(`Cleared target Moshling UUID for user ${userId}.`);
            req.session.save((err) => {
                if (err) {
                    pretty.error(`Session save error clearing target Moshling for user ${userId}:`, err);
                    const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Session Error' } } }).end();
                    return res.status(500).type('text/xml').send(xmlError);
                }
                sendSuccessXml(res); // send standard success response
            });
        } else {
            // no target was set, just send success
            pretty.debug(`Attempted to clear target Moshling for user ${userId}, but none was set.`);
            sendSuccessXml(res);
        }
    } else {
        // GET request without ?clear - shouldn't happen i think?
        pretty.warn(`Moshling target GET request received without '?clear' parameter for user ${userId}.`);
        res.status(400).type('text/xml').send('<error code="INVALID_REQUEST">Missing clear parameter for GET</error>');
    }
});

module.exports = router;