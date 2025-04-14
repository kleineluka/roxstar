const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const formats = require('../../utils/formats.js');
const censor = require('../../utils/censor.js');

/**
 * Handles POST requests to create a new Pinboard comment.
 * Expects XML body like: <message colour="1" watermark="1">Message text</message>
 */
router.post('/:targetUserId', async (req, res) => {
    const loggedInUserId = req.session.userId;
    const targetUserId = parseInt(req.params.targetUserId, 10);
    if (!loggedInUserId) {
        pretty.warn('Comment create request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (isNaN(targetUserId)) {
        pretty.warn(`Comment create request has invalid targetUserId: ${req.params.targetUserId}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Invalid target user ID</error>');
    }
    // body-parser-xml puts attributes in '$' and text content in '_'
    const messageData = req.body?.message;
    const attributes = messageData?.$;
    const messageText = messageData?._;
    const colour = attributes?.colour || '0'; // default colour if missing
    const watermark = attributes?.watermark || '0'; // default watermark if missing
    if (!messageText || typeof messageText !== 'string' || messageText.trim() === '') {
        pretty.warn(`Comment create request for user ${loggedInUserId} to ${targetUserId} has empty or missing message text.`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Message text cannot be empty</error>');
    }
    if (!attributes || colour === undefined || watermark === undefined) {
        pretty.warn(`Comment create request for user ${loggedInUserId} to ${targetUserId} missing attributes. Atts: ${JSON.stringify(attributes)}`);
    }
    // sanitise and censor
    const sanitizedMessage = formats.sanitiseString(messageText);
    const censoredMessage = censor.filterWords(sanitizedMessage, global.config_censor);
    const status = (loggedInUserId === targetUserId) ? 'accepted' : 'pending';
    try {
        // make sure the target user exists
        const targetUserExists = await database.getQuery('SELECT 1 FROM users WHERE id = ?', [targetUserId]);
        if (!targetUserExists) {
            pretty.warn(`Comment create failed: Target user ${targetUserId} does not exist.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">Target user not found</error>');
        }
        const timestamp = clock.getTimestamp();
        const insertResult = await database.runQuery(
            `INSERT INTO message_board (sender, reciever, message, status, watermark, colour, date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [loggedInUserId, targetUserId, censoredMessage, status, watermark, colour, timestamp]
        );
        if (insertResult && insertResult.lastID > 0) {
            pretty.print(`Comment created by ${loggedInUserId} for ${targetUserId}. Status: ${status}. ID: ${insertResult.lastID}`, 'ACTION');
            res.status(200).type('text/xml').send();
        } else {
            pretty.error(`Failed to insert comment from ${loggedInUserId} to ${targetUserId}.`);
            res.status(500).type('text/xml').send('<error code="DB_ERROR">Failed to save comment</error>');
        }
    } catch (error) {
        pretty.error(`Error processing comment create from ${loggedInUserId} to ${targetUserId}:`, error);
        res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Internal Server Error</error>');
    }
});

module.exports = router;