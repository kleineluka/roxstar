const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to report a pinboard message.
 * This will update the message status to 'reported' and set the 'reported' field to the reporting user's ID.
 */
router.get('/:messageId', async (req, res) => {
    const loggedInUserId = req.session.userId;
    const messageId = parseInt(req.params.messageId, 10);
    if (!loggedInUserId) {
        pretty.warn('Pinboard report request without user session.');
        return res.status(401).type('text/xml').send();
    }
    if (isNaN(messageId) || messageId === 0) {
        pretty.warn(`Pinboard report request from user ${loggedInUserId} has invalid message ID: ${req.params.messageId}`);
        return res.status(400).type('text/xml').send();
    }
    try {
        const result = await database.runQuery(
            `UPDATE message_board SET status = 'reported', reported = ? WHERE id = ?`,
            [loggedInUserId, messageId]
        );
        if (result && result.changes > 0) {
            pretty.print(`Message ${messageId} reported by user ${loggedInUserId}.`, 'ACTION');
        } else {
            pretty.warn(`Pinboard report: no matching message found for ID ${messageId}.`);
        }
        res.status(200).type('text/xml').send();
    } catch (error) {
        pretty.error(`Error reporting pinboard message ${messageId} for user ${loggedInUserId}:`, error);
        res.status(500).type('text/xml').send();
    }
});

module.exports = router;
