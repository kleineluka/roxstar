const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formatUtils = require('../../utils/formats.js');
const levelUtils = require('../../features/account/levels.js');
const monsterUtils = require('../../features/account/monster.js');
const socialUtils = require('../../features/account/socials.js');

/**
 * Handles GET requests to fetch a user's friend list or friend requests.
 * Defaults to the logged-in user. Uses 'user' query param for others.
 */
router.get('/', async (req, res) => {
    const loggedInUserId = req.session.userId;
    let targetUserId = loggedInUserId;
    let isOwnList = true;
    // check if viewing someone else's list
    if (req.query.user) {
        // attempt to parse the user query parameter as an integer ID
        const requestedId = parseInt(req.query.user, 10);
        if (!isNaN(requestedId) && requestedId !== loggedInUserId) {
            targetUserId = requestedId;
            isOwnList = false;
            pretty.debug(`Friends list request targeting user ID from query: ${targetUserId}`);
        } else if (requestedId === loggedInUserId) {
            pretty.debug(`Friends list request explicitly targeting self.`);
            // keep targetUserId as loggedInUserId, isOwnList as true
        }
        else {
            pretty.warn(`Invalid user ID in 'user' query parameter: ${req.query.user}. Defaulting to logged-in user.`);
            // keep targetUserId as loggedInUserId, isOwnList as true
        }
    }
    if (!loggedInUserId) {
        pretty.warn('Friends list request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUserId) {
        // should not happen if loggedInUserId is set
        pretty.error('Could not determine target user ID for friends list request.');
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Internal error</error>');
    }
    try {
        // first, get friend relationship data
        let friendRelations;
        if (isOwnList) {
            // fetch requests *sent to me* and friends *I added* (status != blocked)
            friendRelations = await database.getAllQuery(
                `SELECT * FROM friends WHERE (friend_user_id = ? AND status != 'blocked') OR (user_id = ? AND status = 'friend')`,
                [loggedInUserId, loggedInUserId]
            );
        } else {
            // fetch confirmed friends *of the target user*
            friendRelations = await database.getAllQuery(
                'SELECT * FROM friends WHERE user_id = ? AND status = "friend"',
                [targetUserId]
            );
        }
        if (!friendRelations || friendRelations.length === 0) {
            pretty.debug(`No friend relations found for target user ${targetUserId} (isOwnList: ${isOwnList})`);
            // send empty list response
            const emptyResponse = { status: { '@code': 0, '@text': 'success' }, friendList: { friendTreeItems: [] } };
            const xml = xmlbuilder.create({ xml: emptyResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.type('text/xml').send(xml);
        }
        // collect ids of the other friends to fetch details in bulk
        const friendDetailIds = new Set();
        friendRelations.forEach(rel => {
            // if it's my list, the other person could be user_id (my request out) or friend_user_id (their request in)
            // if it's someone else's list, the other person is always friend_user_id
            if (isOwnList) {
                if (rel.user_id === loggedInUserId) { // My outgoing accepted friend request
                    friendDetailIds.add(rel.friend_user_id);
                } else { // incoming request or friend request accepted
                    friendDetailIds.add(rel.user_id);
                }
            } else { // viewing someone else's list
                friendDetailIds.add(rel.friend_user_id);
            }
        });
        const uniqueFriendIds = Array.from(friendDetailIds);
        // fetch user details for all unique friend IDs
        let friendDetailsMap = new Map();
        let bffStatusMap = new Map(); // only needed for own list
        if (uniqueFriendIds.length > 0) {
            const [friendUsersData, bffData] = await Promise.all([
                // fetch user details for all unique friend IDs
                database.getAllQuery(
                    `SELECT id, username, monster_name, monster, primary_colour, secondary_colour, colorama, country, gender, birthday, level, activation_status
                     FROM users WHERE id IN (${uniqueFriendIds.map(() => '?').join(',')})`,
                    uniqueFriendIds
                ),
                // fetch BFF statuses *only if* viewing own list
                isOwnList ? database.getAllQuery(
                    `SELECT friend_user_id, bff FROM friends WHERE user_id = ? AND status = 'friend'`,
                    [loggedInUserId]
                ) : Promise.resolve([]) // resolve empty if not needed
            ]);
            // populate maps for quick lookup
            if (friendUsersData) {
                friendUsersData.forEach(user => friendDetailsMap.set(user.id, user));
            }
            if (isOwnList && bffData) {
                bffData.forEach(bff => bffStatusMap.set(bff.friend_user_id, bff.bff));
            }
        }
        // format before sending
        const formattedFriends = [];
        for (const relation of friendRelations) {
            let friendId;
            let statusData = {};
            let bffStatus = 'false'; // default to false if not found
            if (isOwnList) {
                // determine friend id and status attributes for own list
                if (relation.user_id === loggedInUserId) { // my outgoing accepted friend request
                    friendId = relation.friend_user_id;
                    statusData['@status'] = 'friend'; // must be friend if i initiated and it's not blocked
                    bffStatus = socialUtils.checkBffStatusFromMap(bffStatusMap, friendId);
                } else { // incoming request or their accepted request
                    friendId = relation.user_id;
                    statusData['@status'] = relation.status; // 'request' or 'friend'
                    if (relation.status === 'request') {
                        statusData['@message'] = relation.message || '';
                    } else if (relation.status === 'friend') {
                        // check BFF status (they are friend_user_id in the map's query)
                        bffStatus = socialUtils.checkBffStatusFromMap(bffStatusMap, friendId);
                    }
                }
            } else { // viewing someone else's list (always status='friend')
                friendId = relation.friend_user_id;
                statusData['@status'] = 'friend';
                // bff status from target user's perspective (we didn't fetch this, default to false)
                bffStatus = 'false';
            }
            const userfriend = friendDetailsMap.get(friendId);
            if (!userfriend) {
                pretty.warn(`Friend details not found for ID ${friendId} in relation ID ${relation.id}`);
                continue; // skip if user data wasn't fetched (e.g., user deleted)
            }
            formattedFriends.push({
                friend: {
                    '@activationStatus': userfriend.activation_status || 'Member',
                    '@age': formatUtils.getUserAge(userfriend.birthday),
                    '@bff': bffStatus,
                    '@country': userfriend.country || '',
                    '@friendID': relation.id,
                    '@gender': userfriend.gender,
                    '@level': levelUtils.getUserLevel(userfriend.level),
                    '@name': userfriend.monster_name,
                    '@primarycolour': userfriend.primary_colour,
                    '@secondarycolour': userfriend.secondary_colour,
                    ...monsterUtils.getUserColoramaData(userfriend.colorama),
                    ...statusData,
                    '@b': 'true',
                    '@type': userfriend.monster, 
                    '@userId': userfriend.id,
                    '@username': userfriend.username
                }
            });
        }
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            friendList: {
                friendTreeItems: formattedFriends // array of { friend: {...} }
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error fetching friends list for target user ID ${targetUserId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;