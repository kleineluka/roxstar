const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const friendUtils = require('../../features/social/friends.js');

/**
 * Handles POST requests to update friend relationships (Accept, Delete, Block, BFFs).
 * Expects XML body, potentially with nested structures like:
 * <updateFriends><changes><change>...</change></changes></updateFriends>
 * or <updateFriends><bestFriends ids="..."/></updateFriends>
 * todo: clean up
 */
router.post('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Friend update request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    const body = req.body;
    let success = false;
    try {
        // check for bff update structure
        if (body?.updateFriends?.bestFriends) {
            const bffData = body.updateFriends.bestFriends.$;
            const bffIdString = bffData?.ids || '';
            pretty.debug(`Processing BFF update for user ${userId}. IDs: ${bffIdString}`);
            success = await friendUtils.updateBffs(userId, bffIdString);
        // check for changes structure
        } else if (body?.updateFriends?.changes) {
            // 'changes' itself is an array
            const changesArray = body.updateFriends.changes;
            let changeAttributes = null;
            // check if changesArray is valid and non-empty
            if (Array.isArray(changesArray) && changesArray.length > 0) {
                // access the first element of the changes array, which is an object
                const firstChangeObject = changesArray[0];
                // access the 'change' property within that object, which might be an array or object
                const changeElement = firstChangeObject?.change;
                if (changeElement) {
                    // handle if 'change' is an array
                    if (Array.isArray(changeElement) && changeElement.length > 0) {
                        // get attributes ($) from the first element of the nested 'change' array
                        changeAttributes = changeElement[0]?.$;
                        if (changeElement.length > 1) {
                            pretty.warn("Friend update <change> element contained multiple items. Processing only the first one.");
                        }
                    }
                    // handle if 'change' is just a single object (less likely)
                    else if (typeof changeElement === 'object' && changeElement !== null) {
                        changeAttributes = changeElement.$;
                    }
                }
            }
            // process the extracted attributes if found
            if (changeAttributes) {
                const action = changeAttributes.changeType;
                const friendUserId = parseInt(changeAttributes.userId, 10);
                if (!action || isNaN(friendUserId)) {
                    pretty.warn(`Invalid friend change data received for user ${userId}: ${JSON.stringify(changeAttributes)}`);
                    success = false; // mark as failure due to invalid data
                } else {
                    pretty.debug(`Processing friend action for user ${userId}: ${action} on user ${friendUserId}`);
                    switch (action.toUpperCase()) {
                        case 'ACCEPT_FRIEND':
                            success = await friendUtils.acceptFriendRequest(userId, friendUserId);
                            break;
                        case 'DELETE':
                            success = await friendUtils.deleteFriendship(userId, friendUserId);
                            break;
                        case 'BLOCK':
                            success = await friendUtils.blockUser(userId, friendUserId);
                            break;
                        default:
                            pretty.warn(`Unknown friend action type: ${action}`);
                            success = false; // unknown action is a failure
                    }
                }
            } else {
                pretty.warn(`Friend update request for user ${userId} had empty or invalid 'change' data within 'changes'. Body: ${JSON.stringify(body)}`);
                success = true; // no valid action found
            }
        } else {
            pretty.warn(`Friend update request for user ${userId} had unrecognized XML structure. Body: ${JSON.stringify(body)}`);
            success = true;
        }
        if (success) {
            const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end({ pretty: global.config_server['pretty-print-replies'] });
            res.type('text/xml').send(successXml);
        } else {
            const errorXml = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Update failed' } } }).end({ pretty: global.config_server['pretty-print-replies'] });
            res.status(changeAttributes ? 500 : 400).type('text/xml').send(errorXml);
        }
    } catch (error) {
        pretty.error(`Error processing friend update request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } }).end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;