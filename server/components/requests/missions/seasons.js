const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');
const missionUtils = require('../../features/account/missions.js');

/**
 * Handles GET requests for all season mission data, augmented with user progress.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Attempted to access seasons mission data without userId in session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    if (!global.storage_seasons) {
        pretty.error('Season mission data (global.storage_seasons) not loaded.');
        return res.status(500).json({ error: "Server configuration error" });
    }
    try {
        // EXTREMELY IMPORTANT: deep copy to prevent mutation of the original data
        const userSeasonsData = JSON.parse(JSON.stringify(global.storage_seasons));
        const augmentedData = await missionUtils.augmentMissionDataWithUserProgress(userId, userSeasonsData);
        res.json(augmentedData);

    } catch (error) {
        pretty.error(`Error processing seasons mission data for user ID ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;