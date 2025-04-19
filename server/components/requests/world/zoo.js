const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles POST requests to save which Moshlings are placed in the room/zoo.
 * Expects XML body like: <updateMoshlingsInRoom><moshling srcId="MOSHLING_TYPE_ID"/></updateMoshlingsInRoom>
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Zoo save request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    const moshlingElements = req.body?.updateMoshlingsInRoom?.moshling;
    if (!moshlingElements) {
        pretty.warn(`Zoo save request for user ${userId} received empty or invalid XML body. Body: ${JSON.stringify(req.body)}`);
    }
    // ensure moshlingList is always an array, even if only one or zero moshlings are sent
    const moshlingList = !moshlingElements ? [] : (Array.isArray(moshlingElements) ? moshlingElements : [moshlingElements]);
    // extract the srcId attribute from each element's '$' property
    const srcIdsToPlace = moshlingList
        .map(mosh => parseInt(mosh?.$?.srcId, 10)) // get srcId attribute and parse as int
        .filter(id => !isNaN(id)); // filter out any invalid IDs
    pretty.debug(`User ${userId} zoo save request. Moshlings to place (srcIds): [${srcIdsToPlace.join(', ')}]`);
    try {
        // set all to false
        pretty.debug(`Resetting in_room status for all moshlings of user ${userId}.`);
        const resetResult = await database.runQuery(
            "UPDATE moshlings SET in_room = 'false' WHERE user_id = ?",
            [userId]
        );
        if (!resetResult || resetResult.changes === 0) {
            pretty.debug(`No moshlings found or already reset for user ${userId}.`);
        }
        // set to true
        let updateCount = 0;
        if (srcIdsToPlace.length > 0) {
            pretty.debug(`Setting in_room = true for specified moshlings for user ${userId}...`);
            for (const srcId of srcIdsToPlace) {
                // find one instance of this srcId that is currently not in the room
                const moshlingToUpdate = await database.getQuery(
                    "SELECT id FROM moshlings WHERE user_id = ? AND srcId = ? AND in_room = 'false' LIMIT 1",
                    [userId, srcId]
                );
                if (moshlingToUpdate) {
                    // update only that specific instance
                    const updateOneResult = await database.runQuery(
                        "UPDATE moshlings SET in_room = 'true' WHERE id = ? AND user_id = ?",
                        [moshlingToUpdate.id, userId]
                    );
                    if (updateOneResult && updateOneResult.changes > 0) {
                        updateCount++;
                        pretty.debug(`Set moshling instance ${moshlingToUpdate.id} (srcId: ${srcId}) to in_room=true.`);
                    } else {
                        pretty.warn(`Failed to set moshling instance ${moshlingToUpdate.id} (srcId: ${srcId}) to in_room=true.`);
                    }
                } else {
                    pretty.warn(`No available instance (in_room=false) found for srcId ${srcId} for user ${userId}.`);
                }
            }
            pretty.debug(`Finished setting in_room status. ${updateCount} instances updated.`);
        }
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        res.type('text/xml').send(successXml);
        pretty.print(`Processed zoo save request for user ${userId}.`, 'ACTION');
    } catch (error) {
        pretty.error(`Error processing zoo save request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;