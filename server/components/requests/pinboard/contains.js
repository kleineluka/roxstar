const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');

/**
 * Handles POST requests to check if a message contains friend usernames.
 * It currently is just hard-coded as false because it seems annoying.
 * But eventually I'll implement it properly with a toggle (for now, todo <-- so I can search it)
 */
router.post('/', (req, res) => {
    const userId = req.session.userId;
    const messageText = req.body?.message;
    if (!userId) {
        pretty.warn('containsFriends request without user session.');
    }
    pretty.debug(`containsFriends check invoked for user ${userId}. Message received: "${messageText || '[No message found in body]'}"`);
    const response = {
        containsUsernames: false,
        messageWithoutNames: messageText || ""
    };
    res.json(response);
});

module.exports = router;