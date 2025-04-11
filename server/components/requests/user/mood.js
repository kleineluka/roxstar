const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const socialUtils = require('../../features/account/socials.js');

/**
 * Handles GET requests to fetch the user's current mood.
 * Can optionally fetch another user's mood via the 'mid' query parameter.
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    let targetUserId = loggedInUserId;
    // check if fetching another user's mood
    if (req.query.mid) {
        const requestedId = parseInt(req.query.mid, 10);
        if (!isNaN(requestedId)) {
            targetUserId = requestedId;
            pretty.debug(`Mood GET request targeting user ID from query: ${targetUserId}`);
        } else {
            pretty.warn(`Invalid user ID in 'mid' query parameter: ${req.query.mid}. Defaulting to logged-in user.`);
        }
    }
    if (!targetUserId) {
        // this should only happen if not logged in and no valid 'mid' provided
        pretty.warn('Mood GET request failed: Could not determine target user.');
        return res.status(400).json({ error: "Target user ID missing or invalid" });
    }
    try {
        const moodId = await socialUtils.getUserMood(targetUserId);
        res.json({ mood: moodId }); // response format: {"mood": id}
    } catch (error) {
        // errors inside getUserMood are already logged
        pretty.error(`Error processing mood GET request for target user ID ${targetUserId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Handles POST requests to update the logged-in user's mood.
 * Expects the new mood ID in the 'mid' query parameter.
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    const newMoodId = parseInt(req.query.mid, 10);
    if (!userId) {
        pretty.warn('Mood POST request without userId in session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    if (isNaN(newMoodId)) {
        pretty.warn(`Mood POST request for user ${userId} missing or invalid 'mid' query parameter.`);
        return res.status(400).json({ error: "Missing or invalid mood ID ('mid' query parameter)" });
    }
    // todo: validate mood id
    try {
        // get current profile
        const user = await database.getQuery('SELECT profile FROM users WHERE id = ?', [userId]);
        if (!user) {
            pretty.error(`User ${userId} not found during mood update.`);
            return res.status(404).json({ error: "User not found" });
        }
        // parse and update profile array
        let profileArray = [0, 0, 0, 0, 0]; // default profile if parsing fails or missing
        try {
            if (user.profile) {
                const parsed = JSON.parse(user.profile);
                if (Array.isArray(parsed) && parsed.length >= 5) {
                    profileArray = parsed;
                } else {
                    pretty.warn(`User ${userId} has invalid profile format: ${user.profile}. Resetting.`);
                }
            }
        } catch (parseError) {
            pretty.warn(`Failed to parse profile JSON for user ${userId}: ${user.profile}. Resetting.`);
        }
        // update the mood (index 1)
        profileArray[1] = newMoodId;
        const updatedProfileJson = JSON.stringify(profileArray);
        // update the database
        const updateResult = await database.runQuery(
            'UPDATE users SET profile = ? WHERE id = ?',
            [updatedProfileJson, userId]
        );
        if (updateResult && updateResult.changes > 0) {
            pretty.print(`Updated mood for user ${userId} to ${newMoodId}.`, 'ACTION');
            await socialUtils.logBffNews(userId, 'UpdatedMood', newMoodId);
            res.status(200).json({ success: true, mood: newMoodId }); // or send new mood? shouldn't matter
        } else {
            pretty.error(`Failed to update mood for user ID ${userId}.`);
            res.status(500).json({ error: "Failed to update mood" });
        }
    } catch (error) {
        pretty.error(`Error processing mood POST request for user ID ${userId}:`, error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;