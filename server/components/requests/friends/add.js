const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const formats = require('../../utils/formats.js');

/**
 * Helper function to build the XML response for friend requests.
 * @param {string} resultValue - The value for the friendRequestResult tag (e.g., "success", "failure", "alreadyFriend").
 * @param {number} [statusCode=0] - The status code (0 for success).
 * @param {string} [statusText='success'] - The status text.
 * @returns {string} - The generated XML string.
 */
function buildFriendRequestResponse(resultValue, statusCode = 0, statusText = 'success') {
    const response = {
        friendRequestResponse: {
            status: { '@code': statusCode, '@text': statusText },
            friendRequestResult: { '@value': resultValue }
        }
    };
    if (statusCode !== 0 || statusText !== 'success') {
        response.friendRequestResponse.status = { '@code': statusCode, '@text': statusText };
    }
    return xmlbuilder.create(response)
        .end({ pretty: global.config_server['pretty-print-replies'] });
}

/**
 * Handles POST requests to send a friend request.
 * Expects XML body like: <request userId="TARGET_ID" message="Optional message"/>
 */
router.post('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    if (!loggedInUserId) {
        pretty.warn('Friend add request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // get attributes from <request> tag
    const requestData = req.body.friendRequests.request[0].$;
    if (!requestData || !requestData.userId) {
        pretty.warn(`Friend add request for user ${loggedInUserId} received invalid XML body. Body: ${JSON.stringify(req.body)}`);
        const responseXml = buildFriendRequestResponse('failure', 1, 'Invalid request format');
        return res.status(400).type('text/xml').send(responseXml);
    }
    const targetUserId = parseInt(requestData.userId, 10);
    let message = requestData.message || '';
    message = formats.decodeBase64(message);
    if (isNaN(targetUserId)) {
        pretty.warn(`Friend add request for user ${loggedInUserId} has invalid target userId: ${requestData.userId}`);
        const responseXml = buildFriendRequestResponse('failure', 1, 'Invalid target user ID');
        return res.status(400).type('text/xml').send(responseXml);
    }
    // why would you want to friend yourself?
    if (targetUserId === loggedInUserId) {
        pretty.debug(`User ${loggedInUserId} tried to friend self.`);
        const responseXml = buildFriendRequestResponse('alreadyFriend'); 
        return res.type('text/xml').send(responseXml);
    }
    try {
        // check if target user exists
        const targetUserExists = await database.getQuery('SELECT 1 FROM users WHERE id = ?', [targetUserId]);
        if (!targetUserExists) {
            pretty.warn(`Friend add request failed: Target user ${targetUserId} does not exist.`);
            const responseXml = buildFriendRequestResponse('failure', 1, 'Target user not found');
            return res.status(404).type('text/xml').send(responseXml);
        }
        // check if target has blocked the requester
        const isBlockedCheck = await database.getQuery(
            'SELECT 1 FROM friends WHERE user_id = ? AND friend_user_id = ? AND status = "blocked"',
            [targetUserId, loggedInUserId] // check if TARGET has blocked ME
        );
        if (isBlockedCheck) {
            pretty.debug(`Friend add request failed: User ${loggedInUserId} is blocked by ${targetUserId}.`);
            const responseXml = buildFriendRequestResponse('failure');
            return res.type('text/xml').send(responseXml);
        }
        // check both directions for block: Me -> Them OR Them -> Me
        const existingRelation = await database.getQuery(
            `SELECT status FROM friends
             WHERE (user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)
             LIMIT 1`,
            [loggedInUserId, targetUserId, targetUserId, loggedInUserId]
        );
        if (existingRelation) {
            // relationship already exists, check its status
            if (existingRelation.status === 'friend') {
                pretty.debug(`Friend add request failed: User ${loggedInUserId} and ${targetUserId} are already friends.`);
                const responseXml = buildFriendRequestResponse('alreadyFriend');
                return res.type('text/xml').send(responseXml);
            } else if (existingRelation.status === 'request') {
                pretty.debug(`Friend add request failed: Request between ${loggedInUserId} and ${targetUserId} already pending.`);
                const responseXml = buildFriendRequestResponse('alreadyRequested');
                return res.type('text/xml').send(responseXml);
            } else if (existingRelation.status === 'blocked') {
                pretty.debug(`Friend add request failed: User ${loggedInUserId} has blocked ${targetUserId}.`);
                const responseXml = buildFriendRequestResponse('failure'); // Blocked by self
                return res.type('text/xml').send(responseXml);
            }
            pretty.warn(`Friend add request failed: Unknown existing relation status "${existingRelation.status}" between ${loggedInUserId} and ${targetUserId}.`);
            const responseXml = buildFriendRequestResponse('failure');
            return res.type('text/xml').send(responseXml);
        }
        // send the friend request
        const timestamp = clock.getTimestamp();
        const insertResult = await database.runQuery(
            `INSERT INTO friends (user_id, friend_user_id, bff, status, message, date)
             VALUES (?, ?, 'false', 'request', ?, ?)`,
            [loggedInUserId, targetUserId, message, timestamp]
        );
        if (insertResult && insertResult.lastID > 0) {
            pretty.print(`Friend request sent from ${loggedInUserId} to ${targetUserId}.`, 'ACTION');
            const responseXml = buildFriendRequestResponse('success');
            res.type('text/xml').send(responseXml);
        } else {
            pretty.error(`Failed to insert friend request from ${loggedInUserId} to ${targetUserId}.`);
            const responseXml = buildFriendRequestResponse('failure', 1, 'Database error');
            res.status(500).type('text/xml').send(responseXml);
        }
    } catch (error) {
        pretty.error(`Error processing friend add request from ${loggedInUserId} to ${targetUserId}:`, error);
        const responseXml = buildFriendRequestResponse('failure', 1, 'Internal Server Error');
        res.status(500).type('text/xml').send(responseXml);
    }
});

module.exports = router;