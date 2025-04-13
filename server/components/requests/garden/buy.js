const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const shopsUtils = require('../../features/world/shops.js');
const inventoryUtils = require('../../features/account/inventory.js');

/**
 * Handles GET requests to buy a seed item from a shop.
 */
router.get('/:shopId/:itemId', async (req, res) => {
    const userId = req.session.userId;
    const shopId = req.params.shopId;
    const itemId = req.params.itemId;
    if (!userId) {
        pretty.warn('Seed buy request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!shopId || !itemId) {
        pretty.warn(`Seed buy request missing parameters for user ${userId}. Shop: ${shopId}, Item: ${itemId}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing shop or item ID</error>');
    }
    // validate against seed storage
    if (!global.storage_seeds || !global.storage_seeds[itemId]) {
        pretty.warn(`Seed buy request for unknown seed ID: ${itemId}`);
        return res.status(404).type('text/xml').send('<error code="INVALID_ITEM">Seed not found</error>');
    }
    const baseSeedData = global.storage_seeds[itemId];
    try {
        // check purchase validity
        const validity = await shopsUtils.checkShopPurchaseValidity(userId, shopId, itemId, baseSeedData);
        if (!validity.valid) {
            pretty.warn(`Seed purchase validation failed for user ${userId}, item ${itemId}: ${validity.reason}`);
            const errorResponse = { status: { '@code': 1, '@text': validity.reason || 'Purchase failed' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            const statusCode = validity.reason === "Insufficient Rox." || validity.reason === "Level requirement not met." ? 403 : 400;
            return res.status(statusCode).type('text/xml').send(xml);
        }
        // deduct rox
        const itemCost = parseInt(baseSeedData.rocks || 0, 10);
        const newRoxBalance = await shopsUtils.deductRoxForPurchase(userId, itemCost);
        if (newRoxBalance === null) {
            pretty.error(`Failed to deduct Rox for seed purchase by user ${userId}, item ${itemId}.`);
            const errorResponse = { status: { '@code': 1, '@text': 'Rox deduction failed' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            return res.status(500).type('text/xml').send(xml);
        }
        // give seed
        const newSeedInstanceId = await inventoryUtils.giveUserSeed(userId, itemId);
        if (newSeedInstanceId === null) {
            // todo: refund rox?
            pretty.error(`Failed to give seed ${itemId} to user ${userId} after purchase.`);
            const errorResponse = { status: { '@code': 1, '@text': 'Failed to add seed to inventory' } };
            const xml = xmlbuilder.create({ xml: errorResponse }).end();
            return res.status(500).type('text/xml').send(xml);
        }
        // format the purchased data
        const formattedSeed = {
            item: {
                '@id': newSeedInstanceId,
                '@srcId': itemId,
                '@name': baseSeedData.name,
                '@description': baseSeedData.description || '',
                '@asset': baseSeedData.asset,
                '@type': 'seed',
                '@subscription': String(baseSeedData.subscription === true || baseSeedData.subscription === 'true'),
                '@rocks': baseSeedData.rocks || 0,
                '@level': baseSeedData.level || 1,
                '@locationId': baseSeedData.locationId || -1,
                '@health': baseSeedData.health || 0,
                '@happiness': baseSeedData.happiness || 0
            }
        };
        // format the response data
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            monster: { '@rocks': newRoxBalance },
            items: [formattedSeed] // array containing the single seed item
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.print(`User ${userId} purchased seed ${itemId} (Instance: ${newSeedInstanceId}) from shop ${shopId}.`, 'ACTION');
    } catch (error) {
        pretty.error(`Error processing seed buy request for user ${userId}, item ${itemId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;