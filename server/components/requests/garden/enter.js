const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const gardenUtils = require('../../features/world/garden.js');

/**
 * Handles GET requests for entering the garden.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Garden enter request without userId in session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    let originalGardenString = ''; // store original string for update later
    try {
        // fetch user's garden string
        const user = await database.getQuery('SELECT garden, session_key FROM users WHERE id = ?', [userId]);
        if (!user) {
            pretty.error(`User ${userId} not found for garden enter.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">User not found</error>');
        }
        originalGardenString = user.garden;
        const parsedGarden = gardenUtils.parseGardenString(originalGardenString);
        // determine target moshling
        let targetMoshlingInfo = null;
        let displayTargetElement = {};
        const targetUuid = req.session.targetMoshlingUuid;
        if (targetUuid) {
            targetMoshlingInfo = gardenUtils.getMoshlingTargetInfo(targetUuid);
        } else {
            // suggest one if none is targeted
            const suggestedUuid = gardenUtils.suggestMoshlingUUID();
            if (suggestedUuid) {
                targetMoshlingInfo = gardenUtils.getMoshlingTargetInfo(suggestedUuid);
                // don't set target in session if merely suggested
            }
        }
        // format target element if info was found
        if (targetMoshlingInfo) {
            displayTargetElement = {
                targetMoshling: {
                    '@name': targetMoshlingInfo.name,
                    '@asset': targetMoshlingInfo.asset,
                    '@uuid': targetMoshlingInfo.uuid
                }
            };
        }
        // check for caught moshling (only if no target was explicitly set)
        let caughtMoshlingElement = {};
        if (!targetUuid) { // only check if user didn't just target something
            const caughtMoshlingData = await gardenUtils.checkCatchableMoshling(req, parsedGarden);
            if (caughtMoshlingData) {
                caughtMoshlingElement = { moshlings: caughtMoshlingData };
                displayTargetElement = {};
            }
        }
        // format plot data
        const plotElements = parsedGarden.map(plotState =>
            gardenUtils.formatPlotData(plotState, targetMoshlingInfo) // pass target info to formatPlotData
        );
        // construct base response
        const responseData = {
            '@easyStarterSetup': 'false',
            status: { '@code': 0, '@text': 'success' },
            additionalSeeds: { // constant value for now
                '@showTutorial': 'false',
                '@type': 'seed'
            },
            plots: plotElements, // array of { plot: {...} }
            // conditionally add target or caught moshling
            ...(Object.keys(displayTargetElement).length > 0 && displayTargetElement),
            ...(Object.keys(caughtMoshlingElement).length > 0 && caughtMoshlingElement),
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.debug(`Sent garden data for user ${userId}.`);
        // clear targetMoshlingUuid from session if it was set
        if (req.session.targetMoshlingUuid) {
            delete req.session.targetMoshlingUuid;
            // need to save session if modified
            req.session.save(err => {
                if (err) pretty.error(`Failed to save session after clearing targetMoshlingUuid for user ${userId}:`, err);
                else pretty.debug(`Cleared targetMoshlingUuid for user ${userId}.`);
                // now update prior time after session is saved
                gardenUtils.updateGardenPriorTime(userId, originalGardenString);
            });
        } else if (req.session.garden_caught) {
            // also save session if garden_caught was set
            req.session.save(err => {
                if (err) pretty.error(`Failed to save session after setting garden_caught for user ${userId}:`, err);
                else pretty.debug(`Saved session with garden_caught for user ${userId}.`);
                // Update prior time
                gardenUtils.updateGardenPriorTime(userId, originalGardenString);
            });
        }
        else {
            // if session wasn't modified, just update prior time
            gardenUtils.updateGardenPriorTime(userId, originalGardenString);
        }
    } catch (error) {
        pretty.error(`Error processing garden enter for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
        // attempt to update prior time even on error? Maybe not.
        // if (originalGardenString) {
            // gardenUtils.updateGardenPriorTime(userId, originalGardenString);
        // }
    }
});

module.exports = router;