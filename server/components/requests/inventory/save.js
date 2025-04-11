const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles POST requests to save changes to item positions or move items to the dock.
 * Expects XML body with <changeitem> elements.
 * 'update' type changes position/room.
 * 'delete' type moves the item to the dock (room_id = -1, position = 0,0,0).
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Item save request without userId in session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    const changes = req.body?.items?.changeitem;
    if (!changes) {
        pretty.warn(`Item save request for user ${userId} received empty or invalid XML body.`);
        const successXml = xmlbuilder.create({ status: { '@code': 0, '@text': 'success' } }).end();
        return res.type('text/xml').send(successXml);
    }
    const changeList = Array.isArray(changes) ? changes : [changes];
    try {
        for (const itemChange of changeList) {
            const attributes = itemChange.$;
            if (!attributes || !attributes.id || !attributes.type) {
                pretty.warn(`Skipping invalid item change entry for user ${userId}: ${JSON.stringify(itemChange)}`);
                continue;
            }
            const itemInstanceId = parseInt(attributes.id, 10);
            const changeType = attributes.type.toLowerCase();
            if (isNaN(itemInstanceId)) {
                pretty.warn(`Skipping item change with invalid ID for user ${userId}: ${attributes.id}`);
                continue;
            }
            if (changeType === 'update') {
                // update item position and room
                const roomId = parseInt(attributes.roomId, 10);
                const x = parseFloat(attributes.x || 0);
                const y = parseFloat(attributes.y || 0);
                const z = parseFloat(attributes.z || 0);
                if (isNaN(roomId)) {
                    pretty.warn(`Skipping item update with invalid roomId for user ${userId}, item ${itemInstanceId}`);
                    continue;
                }
                pretty.debug(`Updating item ${itemInstanceId} for user ${userId}: Room=${roomId}, Pos=(${x},${y},${z})`);
                await database.runQuery(
                    'UPDATE items SET room_id = ?, x = ?, y = ?, z = ? WHERE id = ? AND user_id = ?',
                    [roomId, x, y, z, itemInstanceId, userId]
                );
            } else if (changeType === 'delete') {
                // 'delete' means move back to inventory/dock (i assume?)
                const dockRoomId = -1;
                const defaultPos = 0;
                pretty.debug(`Moving item ${itemInstanceId} to dock for user ${userId}`);
                await database.runQuery(
                    // set room_id to -1 (dock) and reset position
                    'UPDATE items SET room_id = ?, x = ?, y = ?, z = ? WHERE id = ? AND user_id = ?',
                    [dockRoomId, defaultPos, defaultPos, defaultPos, itemInstanceId, userId]
                );
            } else {
                pretty.warn(`Unknown item change type "${changeType}" for user ${userId}, item ${itemInstanceId}`);
            }
        }
        // send success response after processing all changes
        const successXml = xmlbuilder.create({ status: { '@code': 0, '@text': 'success' } }).end();
        res.type('text/xml').send(successXml);
        pretty.print(`Processed item save request for user ${userId}.`, 'ACTION');
    } catch (error) {
        pretty.error(`Error processing item save request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ status: { '@code': 1, '@text': 'Internal Server Error' } })
            .end({ pretty: global.config_server['pretty-print-replies'] || false });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;