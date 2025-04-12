const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const shopsUtils = require('../../features/world/shops.js');
const inventoryUtils = require('../../features/account/inventory.js');

/**
 * Handles GET requests to buy an item from a shop.
 */
router.get('/:shopId/:itemId', async (req, res) => {
    const userId = req.session.userId;
    const shopId = req.params.shopId; 
    const itemId = req.params.itemId;
    if (!userId) {
        pretty.warn('Item buy request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!shopId || !itemId) {
        pretty.warn(`Item buy request missing parameters for user ${userId}. Shop: ${shopId}, Item: ${itemId}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing shop or item ID</error>');
    }
    if (!global.storage_items || !global.storage_items[itemId]) {
        pretty.warn(`Item buy request for unknown item ID: ${itemId}`);
        return res.status(404).type('text/xml').send('<error code="INVALID_ITEM">Item not found</error>');
    }
    const baseItemData = global.storage_items[itemId];
    try {
        const validity = await shopsUtils.checkShopPurchaseValidity(userId, shopId, itemId, baseItemData);
        if (!validity.valid) {
            pretty.warn(`Item purchase validation failed for user ${userId}, item ${itemId}: ${validity.reason}`);
            const errorResponse = { status: { '@code': 1, '@text': validity.reason || 'Purchase failed' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            const statusCode = validity.reason === "Insufficient Rox." || validity.reason === "Level requirement not met." ? 403 : 400;
            return res.status(statusCode).type('text/xml').send(xml);
        }
        // deduct rox
        const itemCost = parseInt(baseItemData.rocks || 0, 10);
        const newRoxBalance = await shopsUtils.deductRoxForPurchase(userId, itemCost);
        if (newRoxBalance === null) {
            pretty.error(`Failed to deduct Rox for purchase by user ${userId}, item ${itemId}.`);
            const errorResponse = { status: { '@code': 1, '@text': 'Rox deduction failed' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            return res.status(500).type('text/xml').send(xml);
        }
        // give item
        const newItemInstanceId = await inventoryUtils.giveItemToUser(userId, itemId);
        if (newItemInstanceId === null) {
            pretty.error(`Failed to give item ${itemId} to user ${userId} after purchase.`);
            const errorResponse = { status: { '@code': 1, '@text': 'Failed to add item to inventory' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            return res.status(500).type('text/xml').send(xml);
        }
        // format the purchased item to send back
        const formattedItem = {
            item: {
                '@name': baseItemData.name,
                '@description': baseItemData.description || '',
                '@asset': baseItemData.asset,
                '@id': newItemInstanceId,
                '@srcId': itemId,
                '@state': baseItemData.state || '',
                '@type': baseItemData.type,
                '@typeStatus': baseItemData.typeStatus || '',
                '@rocks': baseItemData.rocks || 0,
                '@roomId': -1,
                '@x': 0,
                '@y': 0,
                '@z': 0,
                '@tiled': baseItemData.tiled || 'false',
                '@structureId': baseItemData.structureId || '',
                '@layer': baseItemData.layer || 0,
                '@animated': baseItemData.animated || 'false',
                '@replacedefault': baseItemData.replacedefault || 'false',
                '@handler': baseItemData.handler || '',
                '@args': baseItemData.args || '',
                '@health': baseItemData.health || 0,
                '@happiness': baseItemData.happiness || 0
            }
        };
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            monster: { '@rocks': newRoxBalance },
            items: [formattedItem]
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });

        res.type('text/xml').send(xml);
        pretty.print(`User ${userId} purchased item ${itemId} (Instance: ${newItemInstanceId}) from shop ${shopId}.`, 'ACTION');
    } catch (error) {
        pretty.error(`Error processing item buy request for user ${userId}, item ${itemId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;