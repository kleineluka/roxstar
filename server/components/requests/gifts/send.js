const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');

/**
 * Handles POST requests to send mystery gifts to multiple users.
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Mystery gift send request without user session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    const { userIDs, giftSetCode } = req.body;
    if (!Array.isArray(userIDs) || userIDs.length === 0 || !giftSetCode) {
        pretty.warn(`Invalid gift send payload from user ${userId}.`);
        return res.status(400).json({ error: "Invalid request body" });
    }
    const dailyLimit = global.config_game?.gifts?.max ?? 10;
    try {
        const dailySince = clock.getTimestampDaily();
        const sentRow = await database.getQuery(
            'SELECT COUNT(*) AS count FROM mystery_gifts WHERE sender = ? AND date >= ?',
            [userId, dailySince]
        );
        const sentToday = sentRow?.count || 0;
        if (sentToday >= dailyLimit) {
            pretty.warn(`User ${userId} has reached the daily mystery gift limit (${dailyLimit}).`);
            return res.status(403).json({ error: "Daily gift limit reached" });
        }
        const now = clock.getTimestamp();
        for (const receiverId of userIDs) {
            await database.runQuery(
                'INSERT INTO mystery_gifts (sender, receiver, gift_uuid, new, has_opened, date) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, receiverId, giftSetCode, 1, 0, now]
            );
        }
        res.status(200).end();
    } catch (error) {
        pretty.error(`Error sending mystery gifts from user ${userId}:`, error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
