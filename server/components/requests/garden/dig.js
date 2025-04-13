const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const gardenUtils = require('../../features/world/garden.js');

/**
 * Handles GET requests to dig up a plant from a garden spot.
 */
router.get('/:spotId', async (req, res) => {
    const userId = req.session.userId;
    const spotId = parseInt(req.params.spotId, 10);
    if (!userId) {
        pretty.warn('Garden digup request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (isNaN(spotId) || spotId < 0 || spotId > 2) {
        pretty.warn(`Garden digup request for user ${userId} has invalid spotId: ${req.params.spotId}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Invalid spot ID</error>');
    }
    const defaultSegmentTemplate = global.config_garden?.default_segment;
    const defaultGardenStr = global.config_garden?.default_plot;
    if (!defaultSegmentTemplate || !defaultGardenStr) {
        pretty.error("Garden config missing 'defaultPlotSegment' or 'defaultGardenString'.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    const defaultPlotSegment = defaultSegmentTemplate.replace('{position}', String(spotId));
    try {
        const user = await database.getQuery('SELECT garden FROM users WHERE id = ?', [userId]);
        const currentGardenString = user?.garden || defaultSegmentTemplate;
        const parsedGarden = gardenUtils.parseGardenString(currentGardenString);
        // find the target plot in the parsed array
        const targetPlotIndex = parsedGarden.findIndex(p => p.position === spotId);
        if (targetPlotIndex === -1) {
            // should not happen if parseGardenString works correctly
            pretty.error(`Logic error: Could not find plot ${spotId} in parsed garden for user ${userId}.`);
            return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Internal error processing garden</error>');
        }
        // make sure the plot is not empty already
        if (parsedGarden[targetPlotIndex].seedId === -1) {
            pretty.debug(`User ${userId} tried to dig up already empty plot ${spotId}.`);
            const successXml = xmlbuilder.create({ digupresponse: { status: { '@code': 0, '@text': 'success' } } }).end();
            return res.type('text/xml').send(successXml); // technically success
        }
        // reconstruct the garden string with the target plot reset
        const plotStrings = currentGardenString.split('|');
        if (plotStrings.length === 3) { // basic sanity check
            plotStrings[spotId] = defaultPlotSegment; // replace the specific plot string
            const updatedGardenString = plotStrings.join('|');
            // update database
            const updateResult = await database.runQuery(
                'UPDATE users SET garden = ? WHERE id = ?',
                [updatedGardenString, userId]
            );
            if (!updateResult || updateResult.changes === 0) {
                pretty.error(`Failed to update garden after digup for user ${userId}, plot ${spotId}.`);
            } else {
                pretty.print(`User ${userId} dug up plot ${spotId}.`, 'ACTION');
            }
        } else {
            pretty.error(`Failed to reconstruct garden string for user ${userId}. Original: ${currentGardenString}`);
            const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Garden update failed' } } }).end();
            return res.status(500).type('text/xml').send(xmlError);
        }
        // the root element name is 'digupresponse'
        const successXml = xmlbuilder.create({ digupresponse: { status: { '@code': 0, '@text': 'success' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(successXml);
    } catch (error) {
        pretty.error(`Error processing garden digup request for user ID ${userId}, plot ${spotId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;