const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Mystery gift index request without user session.');
        return res.status(401).end();
    }
    try {
        const gifts = await database.getAllQuery(
            'SELECT * FROM mystery_gifts WHERE receiver = ? AND has_opened = 0 ORDER BY new DESC',
            [userId]
        );
        const giftItems = [];
        if (gifts && gifts.length > 0) {
            const senderIds = [...new Set(gifts.map(g => g.sender))];
            const sendersData = await database.getAllQuery(
                `SELECT id, username FROM users WHERE id IN (${senderIds.map(() => '?').join(',')})`,
                senderIds
            );
            const senderMap = new Map(sendersData.map(u => [u.id, u]));
            for (const mg of gifts) {
                const sender = senderMap.get(mg.sender);
                giftItems.push({
                    uuid: mg.id,
                    timestamp: mg.date,
                    fromUserId: mg.sender,
                    fromUsername: sender?.username ?? 'Unknown',
                    new: mg.new === 1 ? 'true' : 'false',
                    giftBagUuid: mg.gift_uuid
                });
            }
            await database.runQuery(
                'UPDATE mystery_gifts SET new = 0 WHERE receiver = ? AND new = 1',
                [userId]
            );
        }
        res.json(giftItems);
    } catch (error) {
        pretty.error(`Error fetching mystery gifts for user ${userId}:`, error);
        res.status(500).end();
    }
});

module.exports = router;
