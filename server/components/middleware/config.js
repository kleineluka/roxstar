const fs = require('fs');
const express = require('express');
const router = express.Router();
const pretty = require('../utils/pretty.js');

/**
 * Sets the headers for the response.
 * @param {number} max_alive - The maximum number of connections to keep alive.
 **/
async function set_headers(res, max_alive) {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Connection', 'Keep-Alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=' + max_alive);
    return res;
}

/**
 * Sends the mission and location release properties file.
 */
router.get('/media/game/mission-and-location-release/59.537/mission-and-location-release.properties', async (req, res) => {
    const location_file = await fs.promises.readFile('resources/media/game/mission-and-location-release/59.537/mission-and-location-release.properties', 'utf8');
    res = await set_headers(res, 89);
    res.type('text/plain').send(location_file);
});

/**
 * Sends the null services configuration.
 */
router.get('/nullservices/rest/configuration', async (req, res) => {
    const pretty_json = JSON.stringify(global.config_provided, null, 4);
    res = await set_headers(res, 89);
    res.type('text/plain').send(pretty_json);
});

/**
 * Send an OK response to eventing requests. Probably just in the client for analytics.
 */
router.post('/services/eventing/pageView', (req, res) => {
    pretty.debug(`Received pageView event for path: ${req.headers.referer || 'Unknown'}`);
    res.sendStatus(200);
});

/**
 * Sends the static Moshling egg status XML response.
 */
router.get('/moshi/services/rest/moshling/egg', async (req, res) => {
    const staticXmlResponse = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><eggStatus allowedToPolish="false" availableForCollection="false" eggInHatchery="false"/>';
    res = await set_headers(res, 89);
    res.type('text/xml').send(staticXmlResponse);
    pretty.debug('Sent static Moshling egg status.');
});

module.exports = {
    router
};
