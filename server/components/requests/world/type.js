const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to mark a location type as visited by the user.
 * Expects the location type as a URL parameter.
 */
router.get('/:locationType/updatevisited', async (req, res) => {
    const userId = req.session.userId;
    const locationTypeToMark = req.params.locationType;
    if (!userId) {
        pretty.warn('Update visited location type request without user session.');
        return res.status(401).send('Authentication Required');
    }
    if (!locationTypeToMark) {
        pretty.warn(`Update visited location type request missing type for user ${userId}.`);
        return res.status(400).send('Location Type Missing');
    }
    try {
        const user = await database.getQuery(
            'SELECT unvisited_location_types FROM users WHERE id = ?',
            [userId]
        );
        if (!user) {
            pretty.warn(`User ${userId} not found during update visited location type.`);
            return res.status(404).send('User Not Found');
        }
        const currentUnvisitedString = user.unvisited_location_types || '';
        const unvisitedList = currentUnvisitedString.split(',').map(s => s.trim()).filter(s => s !== ''); // Split, trim, remove empty
        const indexToRemove = unvisitedList.indexOf(locationTypeToMark);
        if (indexToRemove !== -1) {
            // found type, now remove it
            unvisitedList.splice(indexToRemove, 1); // remove the element at the found index
            const updatedUnvisitedString = unvisitedList.join(','); // join back into comma-separated string
            pretty.debug(`Marking location type "${locationTypeToMark}" as visited for user ${userId}. New list: "${updatedUnvisitedString}"`);
            // update database
            const updateResult = await database.runQuery(
                'UPDATE users SET unvisited_location_types = ? WHERE id = ?',
                [updatedUnvisitedString, userId]
            );
            if (!updateResult || updateResult.changes === 0) {
                pretty.error(`Failed to update unvisited location types for user ${userId}.`);
                return res.status(500).send('Database Update Failed');
            }
            res.status(200).send();
        } else {
            // couldn't find type, was it already visited? send success i guess
            pretty.debug(`Location type "${locationTypeToMark}" was already marked visited or not found in list for user ${userId}.`);
            res.status(200).send();
        }
    } catch (error) {
        pretty.error(`Error updating visited location type "${locationTypeToMark}" for user ID ${userId}:`, error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;