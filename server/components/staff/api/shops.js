const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pretty = require('../../utils/pretty.js');
const { logStaff } = require('../utils/log.js');

const STORES_PATH = path.resolve(__dirname, '../../../storage/stores.json');

/**
 * GET /staff/api/shops
 * Returns all shops from storage_stores.
 */
router.get('/', (req, res) => {
    try {
        const shops = Object.entries(global.storage_stores).map(([id, shop]) => ({
            id,
            name: shop.name,
            type: shop.type,
            status: shop.status,
            randomize: shop.randomize,
            maxToShow: shop.maxToShow,
            discount: shop.discount,
            itemCount: shop.itemIds ? shop.itemIds.split(',').filter(Boolean).length : 0,
        }));
        res.json({ shops });
    } catch (err) {
        pretty.error('Staff shops list error:', err);
        res.status(500).json({ error: 'Failed to list shops.' });
    }
});

/**
 * GET /staff/api/shops/catalog/:type
 * Returns the sorted item catalog for a given shop type.
 * Must be declared before /:id to avoid route shadowing.
 */
router.get('/catalog/:type', (req, res) => {
    const type = req.params.type;
    const storageMap = {
        shop:        global.storage_items,
        dressupshop: global.storage_clothes,
        seedshop:    global.storage_seeds,
    };
    const storage = storageMap[type];
    if (!storage) return res.status(400).json({ error: 'No catalog available for this shop type.' });
    const items = Object.entries(storage).map(([id, item]) => ({
        id,
        name:  item.name  || '?',
        type:  item.type  || '',
        rocks: item.rocks ?? 0,
        level: item.level ?? 1,
    })).sort((a, b) => a.name.localeCompare(b.name));
    res.json({ items });
});

/**
 * GET /staff/api/shops/:id
 * Returns full data for a single shop.
 */
router.get('/:id', (req, res) => {
    const id = req.params.id;
    const shop = global.storage_stores[id];
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });
    res.json({ id, ...shop });
});

/**
 * PATCH /staff/api/shops/:id
 * Updates a shop's editable fields in memory and on disk.
 */
router.patch('/:id', async (req, res) => {
    const id = req.params.id;
    if (!global.storage_stores[id]) return res.status(404).json({ error: 'Shop not found.' });

    const { itemIds, maxToShow, randomize, status, discount } = req.body;

    if (itemIds !== undefined) {
        const parts = String(itemIds).split(',').map(s => s.trim()).filter(Boolean);
        if (parts.some(p => !/^\d+$/.test(p))) {
            return res.status(400).json({ error: 'itemIds must be a comma-separated list of integers.' });
        }
        global.storage_stores[id].itemIds = parts.join(',');
    }

    if (maxToShow !== undefined) {
        const n = parseInt(maxToShow, 10);
        if (isNaN(n) || n < 1) return res.status(400).json({ error: 'maxToShow must be a positive integer.' });
        global.storage_stores[id].maxToShow = n;
    }

    if (randomize !== undefined) global.storage_stores[id].randomize = randomize ? 1 : 0;
    if (status !== undefined) global.storage_stores[id].status = status ? 1 : 0;
    if (discount !== undefined) {
        const d = parseInt(discount, 10);
        if (isNaN(d) || d < 0 || d > 100) return res.status(400).json({ error: 'discount must be 0–100.' });
        global.storage_stores[id].discount = d;
    }

    try {
        fs.writeFileSync(STORES_PATH, JSON.stringify(global.storage_stores, null, 4), 'utf8');
        await logStaff(req.session.staffUsername, 'edit_shop', `Shop #${id} (${global.storage_stores[id].name}) was modified`, 0);
        res.json({ success: true, shop: global.storage_stores[id] });
    } catch (err) {
        pretty.error('Staff shop save error:', err);
        res.status(500).json({ error: 'Failed to save shop.' });
    }
});

module.exports = router;
