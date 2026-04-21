const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to accept a pinboard message.
 * This will update the message status to 'accepted' if it belongs to the logged-in user.
 */
router.get('/:messageId', async (req, res) => {
    const loggedInUserId = req.session.userId;
    const messageId = parseInt(req.params.messageId, 10);
    if (!loggedInUserId) {
        pretty.warn('Pinboard accept request without user session.');
        return res.status(401).type('text/xml').send();
    }
    if (isNaN(messageId)) {
        pretty.warn(`Pinboard accept request from user ${loggedInUserId} has invalid message ID: ${req.params.messageId}`);
        return res.status(400).type('text/xml').send();
    }
    try {
        const result = await database.runQuery(
            `UPDATE message_board SET status = 'accepted' WHERE id = ? AND receiver = ?`,
            [messageId, loggedInUserId]
        );
        if (result && result.changes > 0) {
            pretty.print(`Message ${messageId} accepted by user ${loggedInUserId}.`, 'ACTION');
        } else {
            pretty.warn(`Pinboard accept: no matching message found for ID ${messageId} and receiver ${loggedInUserId}.`);
        }
        res.status(200).type('text/xml').send();
    } catch (error) {
        pretty.error(`Error accepting pinboard message ${messageId} for user ${loggedInUserId}:`, error);
        res.status(500).type('text/xml').send();
    }
});

module.exports = router;
