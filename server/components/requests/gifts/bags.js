const express = require('express');
const router = express.Router();
const { storage_bags } = require('../../server/cache');
const pretty = require('../../utils/pretty.js');

/**
 * Handles POST requests for the bags endpoint.
 * Returns the list of bags available in the game.
 */
router.post('/', async (req, res) => {
    try {
        const bagsData = global.storage_bags || [];
        pretty.debug(`Fetched bags data: ${bagsData.length} bags available.`);
        res.json(bagsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;