const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const formats = require('../../utils/formats.js');
const gardenUtils = require('../../features/world/garden.js');
const inventoryUtils = require('../../features/account/inventory.js');

/**
 * Handles POST requests to plant seeds in the garden.
 * Expects XML body like: <plantseeds><seeds><seed type="SEED_INSTANCE_ID" position="PLOT_INDEX" /></seeds></plantseeds>
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Garden plant request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    const seedsToPlant = req.body?.plantseeds?.seeds?.[0]?.seed;
    if (!seedsToPlant) {
        pretty.warn(`Garden plant request for user ${userId} received empty or invalid XML body. Body: ${JSON.stringify(req.body)}`);
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        return res.type('text/xml').send(successXml); // no seeds to plant? maybe need to change
    }
    const plantList = Array.isArray(seedsToPlant) ? seedsToPlant : [seedsToPlant];
    if (!global.config_garden?.seeds || global.config_garden.seeds.length === 0 || !global.config_garden.default_plot) {
        pretty.error("Garden plant failed: Garden color config and/or default garden config missing or empty.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    if (!global.storage_seeds) {
        pretty.error("Garden plant failed: Seed storage not loaded.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    try {
        // current garden state
        const user = await database.getQuery('SELECT garden FROM users WHERE id = ?', [userId]);
        const currentGardenString = user?.garden || defaultGardenStr;
        const parsedGarden = gardenUtils.parseGardenString(currentGardenString);
        let gardenWasModified = false;
        // each seed gets planted
        for (const seedElement of plantList) {
            const attributes = seedElement.$;
            if (!attributes || !attributes.type || attributes.position === undefined) {
                pretty.warn(`Skipping invalid seed plant entry for user ${userId}: ${JSON.stringify(seedElement)}`);
                continue;
            }
            // IMPORTANT: The 'type' attribute from the client is the INSTANCE ID of the seed in the user's inventory (seeds table)
            const seedInstanceId = parseInt(attributes.type, 10);
            const plotPosition = parseInt(attributes.position, 10);
            if (isNaN(seedInstanceId) || isNaN(plotPosition) || plotPosition < 0 || plotPosition > 2) {
                pretty.warn(`Skipping seed plant with invalid instance ID (${attributes.type}) or position (${attributes.position}) for user ${userId}.`);
                continue;
            }
            // make sure they own the seed instance
            const ownedSeed = await database.getQuery(
                'SELECT item_id FROM seeds WHERE id = ? AND user_id = ?',
                [seedInstanceId, userId]
            );
            if (!ownedSeed) {
                pretty.warn(`User ${userId} attempted to plant seed instance ${seedInstanceId} which they do not own. Skipping.`);
                continue; // skip this seed
            }
            const seedTypeId = ownedSeed.item_id; // this is the actual type ID from storage_seeds
            // make sure the plot is empty
            const targetPlot = parsedGarden.find(p => p.position === plotPosition);
            if (!targetPlot || targetPlot.seedId !== -1) {
                pretty.warn(`User ${userId} attempted to plant seed instance ${seedInstanceId} in non-empty plot ${plotPosition}. Skipping.`);
                continue; // plot not found or already occupied
            }
            // choose a random color from the config
            const randomColor = formats.getRandomItem(global.config_garden.seeds);
            // update the parsedGarden state
            targetPlot.seedId = seedTypeId;
            targetPlot.color = randomColor; // assign random color
            targetPlot.plantTime = clock.getTimestamp();
            targetPlot.priorTime = 0; // reset prior time
            targetPlot.active = 1; // mark as active
            gardenWasModified = true;
            // remove the seed from the user's inventory
            const deleted = await inventoryUtils.deleteUserSeedInstance(userId, seedInstanceId);
            if (!deleted) {
                pretty.error(`Failed to delete seed instance ${seedInstanceId} for user ${userId} after planting. Garden state might be inconsistent.`);
            } else {
                pretty.debug(`Planted seed type ${seedTypeId} (Instance: ${seedInstanceId}) in plot ${plotPosition} for user ${userId} with color ${randomColor}.`);
            }
        } // end of for loop
        // update database if needed
        if (gardenWasModified) {
            const updatedGardenString = parsedGarden.map(p =>
                `${p.position}~${p.color}~${p.seedId}~${p.plantTime}~${p.priorTime}~${p.active}`
            ).join('|');
            await database.runQuery('UPDATE users SET garden = ? WHERE id = ?', [updatedGardenString, userId]);
            pretty.print(`Updated garden state for user ${userId}.`, 'ACTION');
        }
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        res.type('text/xml').send(successXml);
    } catch (error) {
        pretty.error(`Error processing garden plant request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;