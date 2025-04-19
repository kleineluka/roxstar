const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');
const moshlingUtils = require('../../features/account/moshlings.js');

/**
 * Core logic to fetch and send augmented zoo data for a target user.
 * @param {number|null} targetUserId - The ID of the user whose zoo to fetch.
 * @param {object} res - The Express response object.
 */
async function sendUserZooResponse(targetUserId, res) {
    if (!targetUserId || isNaN(targetUserId)) {
        pretty.error('sendUserZooResponse called with invalid targetUserId.');
        return res.status(400).json({ error: "Invalid target user ID specified" });
    }
    try {
        const userZooData = await moshlingUtils.getUserZooData(targetUserId);
        if (!userZooData || Object.keys(userZooData).length === 0) {
            pretty.warn(`getUserZooData returned empty for target user ${targetUserId}. Sending empty response.`);
            return res.json({ moshlingSets: [] });
        }
        res.json(userZooData);
    } catch (error) {
        pretty.error(`Error processing zoo sets request for target user ID ${targetUserId}:`, error);
        res.status(500).json({ error: "Internal server error fetching zoo data" });
    }
}

/**
 * Handles GET requests for a specific user's Zoo using ID in path.
 * e.g., /moshi/services/rest/moshling/sets/4
 */
router.get('/:userId', async (req, res) => {
    const loggedInUserId = req.session.userId; // For auth check
    const targetUserIdParam = req.params.userId;
    pretty.debug(`Zoo request routing for specific ID: ${targetUserIdParam}`);
    if (!loggedInUserId) {
        pretty.warn('Zoo request (specific ID) without user session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    const targetUserId = parseInt(targetUserIdParam, 10);
    if (isNaN(targetUserId)) {
        pretty.warn(`Invalid user ID in zoo route parameter: ${targetUserIdParam}`);
        return res.status(400).json({ error: "Invalid User ID Parameter" });
    }
    // todo: maybe more checks
    await sendUserZooResponse(targetUserId, res);
});

/**
 * Handles GET requests for the logged-in user's own Zoo (base path).
 * e.g., /moshi/services/rest/moshling/sets
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    pretty.debug(`Zoo request routing for base path (user ID: ${loggedInUserId}). Assuming own zoo.`);
    if (!loggedInUserId) {
        pretty.warn('Zoo request (base path) without user session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    await sendUserZooResponse(loggedInUserId, res);
});


module.exports = router;