const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const pinboardUtils = require('../../features/social/pinboard.js');

/**
 * Core logic to fetch and format pinboard messages.
 * @param {number|null} targetUserId - The ID of the user whose pinboard to fetch.
 * @param {number|null} loggedInUserId - The ID of the user viewing the pinboard.
 * @param {object} res - The Express response object.
 */
async function sendPinboardResponse(targetUserId, loggedInUserId, res) {
    if (!targetUserId || !loggedInUserId) {
        pretty.error(`sendPinboardResponse called with invalid IDs: target=${targetUserId}, loggedIn=${loggedInUserId}`);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } }).end();
        return res.status(500).type('text/xml').send(xmlError);
    }
    const isOwnBoard = (targetUserId === loggedInUserId);
    try {
        let messages;
        const messageLimit = global.config_game.social.pinboard_history || 100;
        if (isOwnBoard) {
            messages = await database.getAllQuery(
                `SELECT * FROM message_board
                 WHERE reciever = ? AND status NOT IN ('deleted', 'reported')
                 ORDER BY date DESC
                 LIMIT ?`,
                [targetUserId, messageLimit]
            );
        } else {
            messages = await database.getAllQuery(
                `SELECT * FROM message_board
                 WHERE reciever = ? AND status = 'accepted'
                 ORDER BY date DESC
                 LIMIT ?`,
                [targetUserId, messageLimit]
            );
        }
        // no messages
        if (!messages || messages.length === 0) {
            pretty.debug(`No messages found for pinboard of user ${targetUserId} (isOwnBoard: ${isOwnBoard})`);
            const emptyResponse = { status: { '@code': 0, '@text': 'success' }, messages: { '@showtutorial': 'false' } };
            const xml = xmlbuilder.create({ xml: emptyResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.type('text/xml').send(xml);
        }
        // get sender details
        const senderIds = new Set(messages.map(msg => msg.sender));
        const uniqueSenderIds = Array.from(senderIds);
        let senderDetailsMap = new Map();
        if (uniqueSenderIds.length > 0) {
            const sendersData = await database.getAllQuery(
                `SELECT id, username, monster_name, monster, primary_colour, secondary_colour, colorama, country, gender, birthday
                 FROM users WHERE id IN (${uniqueSenderIds.map(() => '?').join(',')})`,
                uniqueSenderIds
            );
            if (sendersData) {
                sendersData.forEach(user => senderDetailsMap.set(user.id, user));
            }
        }
        // format them
        const formattedMessages = pinboardUtils.formatPinboardMessages(messages, senderDetailsMap);
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            messages: {
                '@showtutorial': 'false',
                message: formattedMessages
            }
        };
        if (formattedMessages.length === 0) {
            delete responseData.messages.message;
        }
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error fetching pinboard messages for target user ID ${targetUserId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
}

/**
 * Handles GET requests for a specific user's Pinboard using ID in path.
 * e.g., /moshi/services/comments/4
 */
router.get('/:targetUserId', async (req, res) => {
    const loggedInUserId = req.session.userId;
    const targetUserIdParam = req.params.targetUserId;
    pretty.debug(`Pinboard request routing for specific ID: ${targetUserIdParam}`);
    if (!loggedInUserId) {
        pretty.warn('Pinboard request (specific ID) without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    const targetUserId = parseInt(targetUserIdParam, 10);
    if (isNaN(targetUserId)) {
        pretty.warn(`Invalid user ID in pinboard route parameter: ${targetUserIdParam}`);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Invalid User ID Parameter' } } }).end();
        return res.status(400).type('text/xml').send(xmlError);
    }
    await sendPinboardResponse(targetUserId, loggedInUserId, res);
});

/**
 * Handles GET requests for the logged-in user's own Pinboard (base path).
 * e.g., /moshi/services/comments
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    pretty.debug(`Pinboard request routing for base path (user ID: ${loggedInUserId}). Assuming own board.`);
    if (!loggedInUserId) {
        pretty.warn('Pinboard request (base path) without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    await sendPinboardResponse(loggedInUserId, loggedInUserId, res);
});


module.exports = router;