const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js');
const levels = require('../../features/account/levels.js');

/**
 * Handles GET requests to fetch the list of friends for gifting.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Friend gift list request without user session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    try {
        // get the user's friends where status is 'friend', ordered by bff descending
        const friends = await database.getAllQuery(
            'SELECT id, friend_user_id, bff FROM friends WHERE user_id = ? AND status = ? ORDER BY bff DESC',
            [userId, 'friend']
        );
        const frienddata = [];
        for (const friend of friends) {
            const userfriend = await database.getQuery(
                'SELECT * FROM users WHERE id = ?',
                [friend.friend_user_id]
            );
            if (!userfriend) continue;
            // process colorama data
            let buildColorama = {};
            if (userfriend.colorama) {
                try {
                    const colordata = JSON.parse(userfriend.colorama);
                    if (Array.isArray(colordata) && colordata.length >= 3) {
                        buildColorama = {
                            customcolour1: colordata[0],
                            customcolour2: colordata[1],
                            customcolour3: colordata[2]
                        };
                    }
                } catch (error) {
                    pretty.debug(`Failed to parse colorama for user ${userfriend.id}:`, error);
                }
            }
            frienddata.push({
                friendID: friend.id,
                status: 'friend',
                canSendGift: 'true',
                name: userfriend.monster_name,
                type: userfriend.monster,
                country: userfriend.country,
                level: levels.getUserLevel(userfriend.level),
                username: userfriend.username,
                activationStatus: userfriend.activation_status,
                age: formats.getUserAge(userfriend.birthday),
                gender: userfriend.gender,
                userId: userfriend.id,
                primarycolour: userfriend.primary_colour,
                secondarycolour: userfriend.secondary_colour,
                bff: friend.bff,
                b: 'true',
                ...buildColorama
            });
        }
        const data = {
            friendTreeItems: frienddata
        };
        res.json(data);
    } catch (error) {
        pretty.error(`Error fetching friend list for gifting (user ${userId}):`, error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;