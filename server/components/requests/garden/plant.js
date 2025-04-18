const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const formats = require('../../utils/formats.js');

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
    const availableColors = global.config_garden?.seeds;
    const defaultGardenStr = global.config_garden?.default_plot;
    if (!availableColors || !Array.isArray(availableColors) || availableColors.length === 0 || !defaultGardenStr) {
        pretty.error("Garden plant failed: Garden color config/default missing.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server config error</error>');
    }
    if (!global.storage_seeds) {
        pretty.error("Garden plant failed: Seed storage not loaded.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server config error</error>');
    }
    // get seed data from request
    const seedsToPlant = req.body?.plantseeds?.seeds?.[0]?.seed;
    if (!seedsToPlant) {
        pretty.warn(`Garden plant request for user ${userId} received empty or invalid XML body. Body: ${JSON.stringify(req.body)}`);
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        return res.type('text/xml').send(successXml);
    }
    const plantList = Array.isArray(seedsToPlant) ? seedsToPlant : [seedsToPlant];
    try {
        // fetch garden status + process each seed
        let currentGardenString = (await database.getQuery('SELECT garden FROM users WHERE id = ?', [userId]))?.garden || defaultGardenStr;
        for (const seedElement of plantList) {
            const attributes = seedElement.$;
            if (!attributes || attributes.type === undefined || attributes.position === undefined) {
                pretty.warn(`Skipping invalid seed plant entry for user ${userId}: ${JSON.stringify(seedElement)}`);
                continue;
            }
            const instanceId = parseInt(attributes.type, 10); // seed?
            const plotPosition = parseInt(attributes.position, 10);
            if (isNaN(instanceId) || isNaN(plotPosition) || plotPosition < 0 || plotPosition > 2) {
                pretty.warn(`Skipping seed plant with invalid instance ID (${attributes.type}) or position (${attributes.position}) for user ${userId}.`);
                continue;
            }
            //  assign random colour
            let plotColor = formats.getRandomItem(availableColors);
            let plotSeedTypeId = instanceId;
            // split current garden string 
            currentGardenString = (await database.getQuery('SELECT garden FROM users WHERE id = ?', [userId]))?.garden || defaultGardenStr;
            let gardenPositions = currentGardenString.split('|');
            let foundPlot = false;
            for (let i = 0; i < gardenPositions.length; i++) {
                let gardenPositionData = gardenPositions[i].split('~');
                const currentPlotPos = parseInt(gardenPositionData[0], 10);
                if (currentPlotPos === plotPosition) {
                    foundPlot = true;
                    // check if plot is already occupied
                    if (parseInt(gardenPositionData[2], 10) !== -1) {
                        pretty.warn(`User ${userId} trying to plant in occupied plot ${plotPosition}.`);
                        break; // break inner loop, move to next seed in outer loop
                    }
                    // parse swf (super flawed but oh well..)
                    const initialSeedData = global.storage_seeds[plotSeedTypeId];
                    if (initialSeedData && initialSeedData.asset) {
                        const assetParts = initialSeedData.asset.split('_');
                        // check against known colours
                        let colorFoundInPath = null;
                        for (const color of availableColors) {
                            // match like "_color.swf"
                            if (initialSeedData.asset.includes(`_${color}.swf`)) {
                                colorFoundInPath = color;
                                break;
                            }
                        }
                        if (colorFoundInPath) {
                            plotColor = colorFoundInPath;
                            pretty.debug(`Overriding random color with parsed color: ${plotColor}`);
                            const basePath = initialSeedData.asset.replace(`_${colorFoundInPath}.swf`, '.swf');
                            let actualSeedTypeId = -1; // default if not found
                            for (const typeId in global.storage_seeds) {
                                if (global.storage_seeds[typeId].asset === basePath) {
                                    actualSeedTypeId = parseInt(typeId, 10);
                                    break;
                                }
                            }
                            if (actualSeedTypeId !== -1) {
                                plotSeedTypeId = actualSeedTypeId; // correct the seed type ID
                                pretty.debug(`Corrected seed type ID based on SWF parse: ${plotSeedTypeId}`);
                            } else {
                                pretty.warn(`Could not find seed type ID matching base path ${basePath} derived from ${initialSeedData.asset}`);
                            }
                        }
                    } else {
                        pretty.warn(`Could not find initial seed data or asset for potentially incorrect type ID: ${plotSeedTypeId}`);
                    }
                    // update the garden's plot
                    gardenPositionData[1] = plotColor;
                    gardenPositionData[2] = String(plotSeedTypeId); // store the type id and pray it's correct
                    gardenPositionData[3] = String(clock.getTimestamp());
                    gardenPositionData[4] = '0'; // prior time
                    gardenPositionData[5] = '1'; // active (1=active?)
                    // reconstruct the segment and update the array
                    gardenPositions[i] = gardenPositionData.join('~');
                    currentGardenString = gardenPositions.join('|');
                    // update database
                    await database.runQuery('UPDATE users SET garden = ? WHERE id = ?', [currentGardenString, userId]);
                    pretty.debug(`Updated garden for user ${userId} after planting in plot ${plotPosition}. New state: ${currentGardenString}`);
                    // delete seed regardless of what happens because, for some amazing reason
                    // they decided that the client is in control of buying and managing stock here
                    try {
                        const seedToDelete = await database.getQuery(
                            'SELECT id FROM seeds WHERE user_id = ? AND item_id = ? LIMIT 1',
                            [userId, instanceId]
                        );
                        if (seedToDelete) {
                            const deleteResult = await database.runQuery(
                                'DELETE FROM seeds WHERE id = ? AND user_id = ?',
                                [seedToDelete.id, userId]
                            );
                            if (deleteResult && deleteResult.changes > 0) {
                                pretty.debug(`Deleted seed instance ID ${seedToDelete.id} for user ${userId}.`);
                            } else {
                                pretty.warn(`Failed to delete seed instance ID ${seedToDelete.id} for user ${userId}. Instance ID sent by client: ${instanceId}`);
                            }
                        } else {
                            pretty.warn(`Could not find seed to delete for user ${userId} (item_id = instance_id ${instanceId}).`);
                        }
                    } catch (deleteError) {
                        pretty.error(`Error during flawed seed deletion for user ${userId}:`, deleteError);
                    }
                    break; // end inner loop
                } // end currentPlotPos === plotPosition
            } // end outer loop
            if (!foundPlot) {
                pretty.warn(`Plot ${plotPosition} not found in garden string for user ${userId}. String: ${currentGardenString}`);
            }
        } // end initial loop
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