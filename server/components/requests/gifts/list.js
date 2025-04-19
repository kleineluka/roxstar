const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const giftUtils = require('../../features/account/gifts.js');

/**
 * Handles GET requests to fetch received gifts for the Gift Room.
 * Defaults to the logged-in user. Uses 'user' query param for others.
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    let targetUserId = loggedInUserId;
    let isOwnGifts = true;
    // check if viewing someone else's gifts
    if (req.query.user) {
        const requestedId = parseInt(req.query.user, 10);
        if (!isNaN(requestedId) && requestedId !== loggedInUserId) {
            targetUserId = requestedId;
            isOwnGifts = false;
            pretty.debug(`Gift list request targeting user ID from query: ${targetUserId}`);
        } else if (requestedId === loggedInUserId) {
            pretty.debug(`Gift list request explicitly targeting self.`);
        } else {
            pretty.warn(`Invalid user ID in 'user' query parameter: ${req.query.user}. Defaulting to logged-in user.`);
        }
    }
    if (!loggedInUserId) {
        pretty.warn('Gift list request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUserId) {
        pretty.error('Could not determine target user ID for gift list request.');
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Internal error</error>');
    }
    try {
        // fetch active gifts sort by unopened first
        const gifts = await database.getAllQuery(
            `SELECT * FROM gifts
             WHERE reciever = ? AND status = 'active'
             ORDER BY has_opened ASC, date DESC -- Show unopened first (0), then by date
             LIMIT ?`,
            [targetUserId, global.config_game.gifts.max]
        );
        // if no gifts
        if (!gifts || gifts.length === 0) {
            pretty.debug(`No active gifts found for user ${targetUserId}.`);
            // send empty list response
            const emptyResponse = {
                status: { '@code': 0, '@text': 'success' },
                gifts: { '@global.config_game.gifts.max': global.config_game.gifts.max } // todo: may need double checked
            };
            const xml = xmlbuilder.create({ giftRoom: emptyResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.type('text/xml').send(xml);
        }
        // get who sent the gifts
        const senderIds = new Set(gifts.map(g => g.sender));
        const uniqueSenderIds = Array.from(senderIds);
        let senderDetailsMap = new Map();
        if (uniqueSenderIds.length > 0) {
            const sendersData = await database.getAllQuery(
                // only needed fields for sender block
                `SELECT id, username FROM users WHERE id IN (${uniqueSenderIds.map(() => '?').join(',')})`,
                uniqueSenderIds
            );
            if (sendersData) {
                sendersData.forEach(user => senderDetailsMap.set(user.id, user));
            }
        }
        // format the retrieved gifts
        const formattedGifts = giftUtils.formatGiftRoomGifts(gifts, senderDetailsMap);
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            gifts: {
                '@global.config_game.gifts.max': global.config_game.gifts.max,
                gift: formattedGifts.map(g => g.gift) // extract inner object
            }
        };
        // case where formattedGifts is empty
        if (formattedGifts.length === 0) {
            delete responseData.gifts.gift;
        }
        // use 'giftRoom' as the root element tag
        const xml = xmlbuilder.create({ giftRoom: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error fetching gift list for target user ID ${targetUserId}:`, error);
        const xmlError = xmlbuilder.create({ giftRoom: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;