const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const shopsUtils = require('../../features/world/shops.js');
const inventoryUtils = require('../../features/account/inventory.js'); // giveUserClothes helper

/**
 * Handles GET requests to buy a clothing item from a shop.
 */
router.get('/:shopId/:itemId', async (req, res) => {
    const userId = req.session.userId;
    const shopId = req.params.shopId;
    const itemId = req.params.itemId;
    if (!userId) {
        pretty.warn('Clothing buy request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!shopId || !itemId) {
        pretty.warn(`Clothing buy request missing parameters for user ${userId}. Shop: ${shopId}, Item: ${itemId}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing shop or item ID</error>');
    }
    // clothes are stored separately than items
    if (!global.storage_clothes || !global.storage_clothes[itemId]) {
        pretty.warn(`Clothing buy request for unknown item ID: ${itemId}`);
        return res.status(404).type('text/xml').send('<error code="INVALID_ITEM">Item not found</error>');
    }
    const baseItemData = global.storage_clothes[itemId];
    try {
        const validity = await shopsUtils.checkShopPurchaseValidity(userId, shopId, itemId, baseItemData);
        if (!validity.valid) {
            pretty.warn(`Clothing purchase validation failed for user ${userId}, item ${itemId}: ${validity.reason}`);
            const errorResponse = { status: { '@code': 1, '@text': validity.reason || 'Purchase failed' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            const statusCode = validity.reason === "Insufficient Rox." || validity.reason === "Level requirement not met." ? 403 : 400;
            return res.status(statusCode).type('text/xml').send(xml);
        }
        // deduct rox
        const itemCost = parseInt(baseItemData.rocks || 0, 10);
        const newRoxBalance = await shopsUtils.deductRoxForPurchase(userId, itemCost);
        if (newRoxBalance === null) {
            pretty.error(`Failed to deduct Rox for clothing purchase by user ${userId}, item ${itemId}.`);
            const errorResponse = { status: { '@code': 1, '@text': 'Rox deduction failed' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            return res.status(500).type('text/xml').send(xml);
        }
        // grant item
        const newItemInstanceId = await inventoryUtils.giveUserClothes(userId, itemId);
        if (newItemInstanceId === null) {
            // todo: give rocks back on failure?
            pretty.error(`Failed to give clothing item ${itemId} to user ${userId} after purchase.`);
            const errorResponse = { status: { '@code': 1, '@text': 'Failed to add item to inventory' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            return res.status(500).type('text/xml').send(xml);
        }
        // format it
        const formattedItem = {
            item: {
                '@id': newItemInstanceId,
                '@srcId': itemId,
                '@name': baseItemData.name,
                '@description': baseItemData.description || '',
                '@asset': baseItemData.asset,
                '@type': baseItemData.type || 'clothing',
                '@zone': baseItemData.zone || '',
                '@animated': baseItemData.animated || 'false',
                '@handler': baseItemData.handler || '',
                '@args': baseItemData.args || '',
                '@health': baseItemData.health || 0,
                '@happiness': baseItemData.happiness || 0
            }
        };
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            monster: { '@rocks': newRoxBalance },
            items: [formattedItem] // array containing the item object
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.print(`User ${userId} purchased clothing item ${itemId} (Instance: ${newItemInstanceId}) from shop ${shopId}.`, 'ACTION');
    } catch (error) {
        pretty.error(`Error processing clothing buy request for user ${userId}, item ${itemId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;