const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to fetch mystery gift counts for today.
 * Returns the number of mystery gifts sent today and remaining allowance.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Gift info request without user session.');
        return res.status(401).json({ error: 'Not logged in' });
    }
    try {
        const result = await database.getQuery(
            "SELECT COUNT(*) AS count FROM mystery_gifts WHERE sender = ? AND date >= ?",
            [userId, Math.floor(Date.now() / 1000) - 86400]
        );
        const giftsSentToday = result?.count || 0;
        const giftsRemainingToday = Math.max(0, 10 - giftsSentToday);
        res.json({
            giftsRemainingToday,
            giftsSentToday
        });
    } catch (error) {
        pretty.error(`Error fetching gift info for user ID ${userId}:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
