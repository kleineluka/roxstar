const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js');
const shopsUtils = require('../../features/world/shops.js');

/**
 * Core logic for processing an item sell request.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
async function processItemSell(req, res) {
    const userId = req.session.userId;
    const gamble = req.params.gamble?.toLowerCase() === 'true';
    const itemInstanceId = parseInt(req.params.itemInstanceId, 10);
    if (!userId) {
        pretty.warn('Item sell request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (isNaN(itemInstanceId)) {
        pretty.warn(`Item sell request missing or invalid item instance ID for user ${userId}.`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing or invalid item ID</error>');
    }
    if (!global.storage_items) {
        pretty.error(`Item sell request failed: global.storage_items not loaded.`);
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    if (!global.config_game.gamble_odds) {
        pretty.error(`Item sell request failed: global.config_game.gamble_odds not loaded.`);
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    try {
        // get items details
        const item = await database.getQuery(
            'SELECT id, item_id FROM items WHERE id = ? AND user_id = ?',
            [itemInstanceId, userId]
        );
        if (!item) {
            pretty.warn(`Item sell request failed: Item instance ${itemInstanceId} not found or not owned by user ${userId}.`);
            return res.status(404).type('text/xml').send('<error code="ITEM_NOT_FOUND">Item not found</error>');
        }
        const baseItemData = global.storage_items[item.item_id];
        if (!baseItemData) {
            pretty.error(`Item sell failed: Base item data not found for item_id ${item.item_id} (instance ${itemInstanceId}).`);
            return res.status(500).type('text/xml').send('<error code="ITEM_DATA_MISSING">Base item data missing</error>');
        }
        // calculate sale price
        let percentage;
        const baseItemPrice = baseItemData.rocks || 0;
        if (gamble) {
            const odds = Object.values(global.config_game.gamble_odds);
            if (odds.length > 0) {
                percentage = formats.getRandomItem(odds);
                pretty.debug(`User ${userId} gambling on item ${itemInstanceId}. Rolled percentage: ${percentage}%`);
            } else {
                pretty.warn(`Gamble odds config is empty. Defaulting gamble percentage to 40%.`);
                percentage = 40;
            }
        } else {
            percentage = 40;
        }
        const roxFromSale = Math.round((percentage / 100.0) * baseItemPrice);
        // update the rox
        const newRoxBalance = await shopsUtils.addRoxFromSale(userId, roxFromSale);
        if (newRoxBalance === null) {
            pretty.error(`Failed to add Rox from sale for user ${userId}, item instance ${itemInstanceId}.`);
        }
        // remove the item from the database
        pretty.debug(`Deleting item ${itemInstanceId} after sale for user ${userId}`);
        const deleteResult = await database.runQuery(
            'DELETE FROM items WHERE id = ? AND user_id = ?',
            [itemInstanceId, userId]
        );
        if (!deleteResult || deleteResult.changes === 0) {
            pretty.error(`Failed to delete item ${itemInstanceId} after sale for user ${userId}.`);
        }
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            resell: {
                '@gamble': String(gamble),
                '@percentage': percentage,
                '@rocks': roxFromSale
            }
        };
        // todo: unsure if needed?
        // if (newRoxBalance !== null) {
        //     responseData.monster = { '@rocks': newRoxBalance };
        // }
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.print(`User ${userId} sold item ${itemInstanceId} (Type: ${item.item_id}) for ${roxFromSale} Rox. Gamble: ${gamble}`, 'ACTION');
    } catch (error) {
        pretty.error(`Error processing item sell request for user ${userId}, item ${itemInstanceId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
}

router.get('/:gamble/:itemInstanceId', processItemSell);
router.post('/:gamble/:itemInstanceId', processItemSell);
module.exports = router;