const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');
const moshlingUtils = require('../../features/account/moshlings.js');

/**
 * Handles GET requests for the Moshling sets (Zoo) data.
 * Augments the base zoo structure with user-specific owned counts.
 * Uses logged-in user ID by default, or 'user' query parameter if provided.
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    let targetUserId = loggedInUserId;
    // check if a specific user is requested via query parameter
    if (req.query.user) {
        const requestedId = parseInt(req.query.user, 10);
        if (!isNaN(requestedId)) {
            targetUserId = requestedId;
            pretty.debug(`Zoo request targeting user ID from query: ${targetUserId}`);
        } else {
            pretty.warn(`Invalid user ID in query parameter: ${req.query.user}. Defaulting to logged-in user.`);
        }
    }
    if (!loggedInUserId) {
        pretty.warn('Zoo sets request without user session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    // todo: add checks here so other people couldn't force a request to your garden
    if (!targetUserId) {
        pretty.error('Could not determine target user ID for zoo request.');
        return res.status(400).json({ error: "Target user ID missing" });
    }
    try {
        const userZooData = await moshlingUtils.getUserZooData(targetUserId);
        res.json(userZooData); // send the augmented JSON structure
    } catch (error) {
        pretty.error(`Error processing zoo sets request for target user ID ${targetUserId}:`, error);
        res.status(500).json({ error: "Internal server error fetching zoo data" });
    }
});

module.exports = router;