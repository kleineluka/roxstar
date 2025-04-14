const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js');
const homeUtils = require('../../features/account/home.js');
const inventoryUtils = require('../../features/account/inventory.js');
const monsterUtils = require('../../features/account/monster.js');
const socialUtils = require('../../features/account/socials.js');
const levelUtils = require('../../features/account/levels.js');
const monstarUtils = require('../../features/account/monstar.js');
const moshlingUtils = require('../../features/account/moshlings.js');
const puzzleUtils = require('../../features/minigames/puzzles.js');

/**
 * Handles GET requests to load the main monster data.
 * This is the primary endpoint called after login to populate the game state.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Attempted to access /services/monster without userId in session.');
        return res.status(401).send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    try {
        pretty.debug(`Loading monster data for user ID: ${userId}`);
        const user = await database.getQuery('SELECT * FROM users WHERE id = ? AND activation_status = ?', [userId, 'Member']);
        if (!user) {
            pretty.error(`User ID ${userId} not found or not activated ('Member' status required).`);
            req.session.destroy();
            return res.status(404).send('<error code="USER_NOT_FOUND">User data not found or inactive</error>');
        }
        // fetch all the data we need in parallel
        const [
            roomData,
            itemData,
            clothesData,
            seedData,
            moshlingData,
            puzzleHighscore,
            friendCount,
            pendingFriendCount,
            commentCount,
            pendingCommentCount,
            rating
        ] = await Promise.all([
            database.getAllQuery('SELECT id FROM rooms WHERE user_id = ?', [userId]),
            database.getAllQuery('SELECT * FROM items WHERE user_id = ?', [userId]),
            database.getAllQuery('SELECT id, item_id FROM clothes WHERE user_id = ?', [userId]),
            database.getAllQuery('SELECT id, item_id FROM seeds WHERE user_id = ?', [userId]),
            database.getAllQuery('SELECT id, srcId, in_room FROM moshlings WHERE user_id = ?', [userId]),
            puzzleUtils.getPuzzleHighscore(userId, 100), // assuming puzzle ID 100 for main highscore
            socialUtils.getFriendCount(userId),
            socialUtils.getPendingFriendCount(userId),
            socialUtils.getCommentCount(userId),
            socialUtils.getPendingCommentCount(userId),
            socialUtils.calculateRating(userId)
        ]);
        // format and calculate data
        const userLevel = levelUtils.getUserLevel(user.level);
        const userLevelProgress = levelUtils.getUserLevelProgress(user.level);
        const userMonstar = monstarUtils.getUserMonstar(user.views);
        const userAge = formats.getUserAge(user.birthday);
        const coloramaData = monsterUtils.getUserColoramaData(user.colorama);
        const uniqueMoshlingCount = moshlingUtils.getMoshlingCount(moshlingData);
        const userMoshlingsFormatted = moshlingUtils.formatUserMoshlings(moshlingData, uniqueMoshlingCount);
        const userItemsFormatted = homeUtils.formatRoomItems(itemData);
        const userClothesFormatted = inventoryUtils.formatUserClothes(clothesData);
        const userSeedsFormatted = inventoryUtils.formatUserSeeds(seedData);
        const userRoomsFormatted = homeUtils.formatUserHouseData(roomData);
        // wrap it into a single object
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            monster: {
                '@activationStatus': user.activation_status || 'Member', 
                '@happiness': user.happiness,
                '@health': user.health,
                '@highestpuzzlescore': puzzleHighscore,
                '@id': user.id,
                '@level': userLevel,
                '@name': user.monster_name,
                '@primarycolour': user.primary_colour,
                '@secondarycolour': user.secondary_colour,
                ...coloramaData,
                '@progress': userLevelProgress,
                '@rocks': user.rocks,
                '@totalrocks': user.rocks,
                '@stars': rating,
                '@b': 'true',
                '@type': user.monster,
                '@zing': 100
            },
            user: {
                '@age': userAge,
                '@country': user.country || '',
                '@difficulty': 1,
                '@gender': user.gender,
                '@id': user.id,
                '@username': user.username,
                '@createdAfterFoodFactoryLaunch': 'true'
            },
            stats: {
                '@monstar': userMonstar,
                '@rating': rating,
                '@referralPoints': 0,
                '@views': user.views
            },
            rooms: {
                '@style': user.house_style || 'default',
                room: userRoomsFormatted
            },
            items: {
                '@showTutorial': 'false',
                item: userItemsFormatted
            },
            firstTimeHelp: {
                '@unvisitedLocationTypes': user.unvisited_location_types || ''
            },
            friends: {
                '@friends': friendCount,
                '@pendingfriends': pendingFriendCount
            },
            comments: {
                '@comments': commentCount,
                '@pendingcomments': pendingCommentCount
            },
            inventory: [
                {
                    '@type': 'dressup',
                    item: userClothesFormatted
                },
                {
                    '@type': 'seed',
                    '@showTutorial': 'false',
                    item: userSeedsFormatted
                }
            ],
            moshlings: userMoshlingsFormatted
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.print(`Successfully sent monster data for user ID: ${userId}`, 'ACTION');
    } catch (error) {
        pretty.error(`Error fetching monster data for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;