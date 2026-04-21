const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');

/**
 * Handles GET requests to fetch the remaining number of mystery gifts a user can send today.
 * Returns a plain text response with the remaining count.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('remainingToSend request without user session.');
        return res.status(401).end();
    }
    try {
        const dailyLimit = global.config_game?.gifts?.max ?? 10;
        const dailySince = clock.getTimestampDaily();
        const row = await database.getQuery(
            'SELECT COUNT(*) AS count FROM mystery_gifts WHERE sender = ? AND date >= ?',
            [userId, dailySince]
        );
        const sentToday = row?.count || 0;
        const remaining = Math.max(0, dailyLimit - sentToday);
        res.status(200).send(String(remaining));
    } catch (error) {
        pretty.error(`Error fetching remaining gift count for user ${userId}:`, error);
        res.status(500).end();
    }
});

module.exports = router;
