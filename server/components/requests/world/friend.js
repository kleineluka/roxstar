const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formatUtils = require('../../utils/formats.js');
const levelUtils = require('../../features/account/levels.js');
const monstarUtils = require('../../features/account/monstar.js');
const socialUtils = require('../../features/account/socials.js');
const moshlingUtils = require('../../features/account/moshlings.js');
const puzzleUtils = require('../../features/minigames/puzzles.js');
const homeUtils = require('../../features/account/home.js');
const monsterUtils = require('../../features/account/monster.js');
const friendUtils = require('../../features/social/friends.js');
const giftUtils = require('../../features/account/gifts.js');

/**
 * Handles GET requests to load a friend's room location.
 */
router.get('/:username', async (req, res) => {
    const loggedInUserId = req.session.userId;
    const targetUsername = req.params.username;
    if (!loggedInUserId) {
        pretty.warn('Friend location request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUsername) {
        pretty.warn('Friend location request missing username parameter.');
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing username</error>');
    }
    try {
        const targetUser = await database.getQuery(
            `SELECT * FROM users WHERE username = ?`,
            [targetUsername]
        );
        if (!targetUser) {
            pretty.warn(`Friend location request: User "${targetUsername}" not found.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">User not found</error>');
        }
        if (targetUser.activation_status === 'banned') {
            pretty.debug(`Friend location request: User "${targetUsername}" is banned.`);
            return res.status(404).type('text/xml').send('<error code="USER_BANNED">User unavailable</error>');
        }
        const targetUserId = targetUser.id;
        // only add view count if the logged in user is not the target user
        let currentViews = targetUser.views;
        if (loggedInUserId !== targetUserId) {
            currentViews = await socialUtils.addProfileView(loggedInUserId, targetUserId);
        }
        // fetch secondary data concurrently
        const [
            roomData,
            itemData,
            moshlingData,
            puzzleHighscore,
            friendCount,
            pendingFriendCount,
            commentCount,
            pendingCommentCount,
            rating,
            giftCount,
            hasUnopenedGift,
            relationshipStatus
        ] = await Promise.all([
            database.getAllQuery('SELECT id FROM rooms WHERE user_id = ?', [targetUserId]),
            database.getAllQuery('SELECT * FROM items WHERE user_id = ? AND room_id > -1', [targetUserId]), // only items in rooms, not dock
            database.getAllQuery('SELECT id, srcId, in_room FROM moshlings WHERE user_id = ?', [targetUserId]),
            puzzleUtils.getPuzzleHighscore(targetUserId, 100),
            socialUtils.getFriendCount(targetUserId),
            socialUtils.getPendingFriendCount(targetUserId),
            socialUtils.getCommentCount(targetUserId),
            socialUtils.getPendingCommentCount(targetUserId),
            socialUtils.calculateRating(targetUserId),
            giftUtils.getOpenedGiftCount(targetUserId),
            database.getQuery("SELECT COUNT(*) AS count FROM gifts WHERE reciever = ? AND has_opened = 0 AND status = 'active'", [targetUserId]).then(r => (r?.count || 0) > 0 ? 'true' : 'false'),
            friendUtils.checkFriendshipStatus(loggedInUserId, targetUserId)
        ]);
        const uniqueMoshlingCount = moshlingUtils.getMoshlingCount(moshlingData);
        const userMoshlingsFormatted = moshlingUtils.formatUserMoshlings(moshlingData, uniqueMoshlingCount); // displays only room moshlings
        const userItemsFormatted = homeUtils.formatRoomItems(itemData);
        const userRoomsFormatted = homeUtils.formatUserHouseData(roomData);
        const coloramaData = monsterUtils.getUserColoramaData(targetUser.colorama);
        const userAge = formatUtils.getUserAge(targetUser.birthday);
        const userLevel = levelUtils.getUserLevel(targetUser.level);
        const userLevelProgress = levelUtils.getUserLevelProgress(targetUser.level);
        const userMonstar = monstarUtils.getUserMonstar(currentViews);
        // build friend block
        const friendBlockData = {
            user: {
                '@age': userAge, '@country': targetUser.country || '', '@difficulty': 1, '@gender': targetUser.gender,
                '@id': targetUser.id, '@username': targetUser.username, '@createdAfterFoodFactoryLaunch': 'false' // hardcoded
            },
            monster: {
                '@activationStatus': targetUser.activation_status, '@happiness': targetUser.happiness, '@health': targetUser.health,
                '@highestpuzzlescore': puzzleHighscore, '@id': targetUser.id, '@level': userLevel, '@name': targetUser.monster_name,
                '@primarycolour': targetUser.primary_colour, '@secondarycolour': targetUser.secondary_colour, ...coloramaData,
                '@progress': userLevelProgress, '@rocks': targetUser.rocks, '@totalrocks': targetUser.rocks, '@stars': rating,
                '@b': 'true', '@type': targetUser.monster, '@zing': 100
            },
            friends: { '@friends': friendCount, '@pendingfriends': pendingFriendCount },
            comments: { '@comments': commentCount, '@pendingcomments': pendingCommentCount },
            gifts: { '@count': giftCount, '@hasUnopenedGift': hasUnopenedGift, '@missionsGiftWrapped': 'false' }, // Mhardcoded
            stats: { '@monstar': userMonstar, '@rating': rating, '@referralPoints': 0, '@views': currentViews },
            ...relationshipStatus, // spread the { relationship: {...} } object if present
        };
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            location: {
                '@id': 7, // constant
                '@name': "Friend Room", // constant
                '@type': "friendroom", // constant
                '@key': "friend-room", // constant
                dynamic: {
                    friend: [
                        friendBlockData,
                        userMoshlingsFormatted // formatted moshlings: { moshlingStats: ..., moshling: [...] }
                    ],
                    items: { item: userItemsFormatted }, // wrap formatted items
                    rooms: {
                        '@style': targetUser.house_style || 'default',
                        room: userRoomsFormatted // formatted rooms: { roomStats: ..., room: [...] }
                    }
                }
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error fetching friend location for target user "${targetUsername}":`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;