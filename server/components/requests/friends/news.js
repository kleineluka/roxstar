const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const types = require('../../utils/types.js');
const feedUtils = require('../../features/social/feed.js');
const monsterUtils = require('../../features/account/monster.js');

/**
 * Handles GET requests for the user's BFF news feed.
 * Fetches news entries from the user's BFFs.
 */
router.get('/:id', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('BFF News Feed request without userId in session.');
        return res.status(401).json({ status: "disabled", error: "Not logged in" });
    }
    const requestedUserId = parseInt(req.params.id, 10);
    if (isNaN(requestedUserId) || requestedUserId !== userId) {
         pretty.warn(`BFF News Feed access attempt mismatch: Session user ${userId}, requested ${req.params.id}`);
        return res.status(403).json({ status: "disabled", error: "Forbidden" });
    }
    const response = {
        entries: [],
        users: [],
        status: "enabled", // default status
        pollingFrequency: "300" // default frequency
    };
    try {
        // find the user's BFFs
        const bffs = await database.getAllQuery(
            "SELECT friend_user_id FROM friends WHERE user_id = ? AND bff = 'true' AND status = 'friend'",
            [userId]
        );
        if (!bffs || bffs.length === 0) {
            pretty.debug(`User ${userId} has no BFFs, returning empty news feed.`);
            return res.json(response); // return empty feed if no BFFs
        }
        const bffIds = bffs.map(bff => bff.friend_user_id);
        // fetch BFF user details and news entries concurrently
        const [bffUsersData, bffNewsData] = await Promise.all([
            database.getAllQuery(
                `SELECT id, username, colorama, primary_colour, secondary_colour, monster
                 FROM users WHERE id IN (${bffIds.map(() => '?').join(',')})`,
                bffIds
            ),
            database.getAllQuery(
                // todo: adding ORDER BY date DESC LIMIT N if feed gets too large
                `SELECT * FROM bff_news WHERE user_id IN (${bffIds.map(() => '?').join(',')}) ORDER BY date DESC LIMIT 100`, // limit to last 100 entries for performance
                bffIds
            )
        ]);
        // format BFF user data
        if (bffUsersData) {
            response.users = bffUsersData.map(friendUser => ({
                userId: friendUser.id,
                name: friendUser.username,
                subscriber: "true", // default to true
                primaryColour: friendUser.primary_colour,
                secondaryColour: friendUser.secondary_colour,
                monsterType: types.getMonsterTypeId(friendUser.monster),
                ...monsterUtils.getUserColoramaData(friendUser.colorama)
            }));
        }
        // format news entries
        if (bffNewsData) {
            response.entries = bffNewsData.map(news => ({
                id: news.uuid,
                itemType: news.type,
                timestamp: news.date * 1000, // to milliseconds
                originUser: news.user_id,
                info: feedUtils.parseNewsInfo(news.type, news.value) 
            }));
            // sort entries by timestamp descending after processing all BFFs
            response.entries.sort((a, b) => b.timestamp - a.timestamp);
        }
        res.json(response);
    } catch (error) {
        pretty.error(`Error fetching BFF news feed for user ID ${userId}:`, error);
        response.status = "error";
        res.status(500).json(response);
    }
});

module.exports = router;