const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const socialUtils = require('../../features/account/socials.js');

/**
 * Safely parses the medals JSON string from the database.
 * @param {string|null} medalsJson - The JSON string from the 'medals' column.
 * @returns {Array<number>} - An array of medal IDs, or an empty array if invalid/null.
 */
function parseMedals(medalsJson) {
    if (!medalsJson) {
        return [0];
    }
    try {
        const medals = JSON.parse(medalsJson);
        if (Array.isArray(medals)) {
            return medals.map(Number).filter(id => !isNaN(id));
        } else {
            pretty.warn(`Medals data is not an array: ${medalsJson}`);
            return [0]; // default if not an array
        }
    } catch (error) {
        pretty.warn(`Failed to parse medals JSON: "${medalsJson}"`, error);
        return [0]; // default on parsing error
    }
}

/**
 * Handles GET requests to fetch a user's medals.
 * Validates the request and returns the user's achievements.
 * */
router.get('/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID." });
    }
    try {
        const user = await database.getQuery('SELECT medals FROM users WHERE id = ?', [userId]);
        if (!user) {
            // user not found, return default structure the client might expect
            return res.status(404).json({ achievements: [0] });
        }
        const achievements = parseMedals(user.medals);
        res.json({ achievements: achievements }); // send as {"achievements": [id1, id2,...]}
    } catch (error) {
        pretty.error(`Error fetching medals for user ID ${userId}:`, error);
        res.status(500).json({ error: "Internal server error." });
    }
});

/**
 * Handles POST requests to award a medal to a user.
 * Validates the request and updates the user's medals in the database.
 */
router.post('/:id', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const medalId = parseInt(req.query.medal, 10);
    const loggedInUserId = req.session.userId;
    // basic validations
    if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID." });
    }
    if (isNaN(medalId)) {
        return res.status(400).json({ error: "Missing or invalid 'medal' query parameter." });
    }
    // ensure the user is logged in
    if (!loggedInUserId || loggedInUserId !== userId) {
        pretty.warn(`Medal award attempt mismatch: Logged in user ${loggedInUserId} tried to award medal ${medalId} to user ${userId}`);
        return res.status(403).json({ error: "Forbidden: Cannot award medals to other users." });
    }
    if (!req.body || Object.keys(req.body).length === 0) {
        pretty.debug(`Medal award attempt for user ${userId}, medal ${medalId} missing JSON body/authToken equivalent.`);
    }
    try {
        const user = await database.getQuery('SELECT medals FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }
        let currentMedals = parseMedals(user.medals);
        // ensure medal doesn't already exist
        if (!currentMedals.includes(medalId)) {
            currentMedals.push(medalId);
            const updatedMedalsJson = JSON.stringify(currentMedals);
            // update database
            const updateResult = await database.runQuery(
                'UPDATE users SET medals = ? WHERE id = ?',
                [updatedMedalsJson, userId]
            );
            if (updateResult && updateResult.changes > 0) {
                pretty.print(`Awarded medal ${medalId} to user ${userId}.`, 'ACTION');
                // log to bff news feed and return the new list
                await socialUtils.logBffNews(userId, 'achievement', medalId);
                res.json({ achievements: currentMedals });
            } else {
                pretty.error(`Failed to update medals for user ID ${userId}.`);
                // Send the *current* list even if update failed, maybe? Or error?
                // Let's send an error for clarity.
                res.status(500).json({ error: "Failed to update medals." });
            }
        } else {
            pretty.debug(`User ${userId} already has medal ${medalId}.`);
            // medal already exists, just return the current list
            res.json({ achievements: currentMedals });
        }
    } catch (error) {
        pretty.error(`Error awarding medal ${medalId} to user ID ${userId}:`, error);
        res.status(500).json({ error: "Internal server error." });
    }
});

module.exports = router;