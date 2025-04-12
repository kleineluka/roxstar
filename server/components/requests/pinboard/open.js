const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const pinboardUtils = require('../../features/social/pinboard.js');

/**
 * Handles GET requests to fetch messages for the Pinboard.
 * Defaults to the logged-in user. Uses 'user' query param for others.
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    let targetUserId = loggedInUserId;
    let isOwnBoard = true;
    // check if viewing someone else's board
    if (req.query.user) {
        const requestedId = parseInt(req.query.user, 10);
        if (!isNaN(requestedId) && requestedId !== loggedInUserId) {
            targetUserId = requestedId;
            isOwnBoard = false;
            pretty.debug(`Pinboard request targeting user ID from query: ${targetUserId}`);
        } else if (requestedId === loggedInUserId) {
            pretty.debug(`Pinboard request explicitly targeting self.`);
        } else {
            pretty.warn(`Invalid user ID in 'user' query parameter: ${req.query.user}. Defaulting to logged-in user.`);
        }
    }
    if (!loggedInUserId) {
        pretty.warn('Pinboard request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUserId) {
        pretty.error('Could not determine target user ID for pinboard request.');
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Internal error</error>');
    }
    try {
        // fetch messages
        let messages;
        const messageLimit = 108; // default to this limit, maybe customise?
        if (isOwnBoard) {
            // get all non-deleted/non-reported messages for own board
            messages = await database.getAllQuery(
                `SELECT * FROM message_board
                 WHERE reciever = ? AND status NOT IN ('deleted', 'reported')
                 ORDER BY date DESC
                 LIMIT ?`,
                [targetUserId, messageLimit]
            );
        } else {
            // get only 'accepted' messages for someone else's board
            messages = await database.getAllQuery(
                `SELECT * FROM message_board
                 WHERE reciever = ? AND status = 'accepted'
                 ORDER BY date DESC
                 LIMIT ?`,
                [targetUserId, messageLimit]
            );
        }

        if (!messages || messages.length === 0) {
            pretty.debug(`No messages found for pinboard of user ${targetUserId} (isOwnBoard: ${isOwnBoard})`);
            // send empty list response
            const emptyResponse = { status: { '@code': 0, '@text': 'success' }, messages: { '@showtutorial': 'false' } };
            const xml = xmlbuilder.create({ xml: emptyResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.type('text/xml').send(xml);
        }
        // get sender ids
        const senderIds = new Set(messages.map(msg => msg.sender));
        const uniqueSenderIds = Array.from(senderIds);
        // get sender details
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
        // format messages and send
        const formattedMessages = pinboardUtils.formatPinboardMessages(messages, senderDetailsMap);
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            messages: {
                '@showtutorial': 'false', // constant value for now
                // this structure ensures <messages><message>...</message><message>...</message></messages>
                message: formattedMessages.map(m => m.message) // extract inner message object
            }
        };
        // handle case where formattedMessages is empty (e.g., all senders were deleted)
        if (formattedMessages.length === 0) {
            delete responseData.messages.message; // remove the empty message array if xmlbuilder requires it
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
});

module.exports = router;