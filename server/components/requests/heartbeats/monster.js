const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const levelUtils = require('../../features/account/levels.js');
const monstarUtils = require('../../features/account/monstar.js');
const socialUtils = require('../../features/account/socials.js');
const trophyUtils = require('../../features/account/trophies.js');

/**
 * Handles GET requests for the monster heartbeat.
 * Updates health/happiness and returns various stats.
 * Also clears puzzle session keys and awards missing level trophies.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    const health = parseInt(req.query.health, 10);
    const happiness = parseInt(req.query.happiness, 10);
    if (!userId) {
        pretty.warn('Monster heartbeat request without userId in session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // clear puzzle session key if it exists
    if (req.session.puzzleSessionKey) {
        pretty.debug(`Clearing puzzleSessionKey for user ${userId}`);
        delete req.session.puzzleSessionKey;
        await req.session.save();
    }
    let user;
    try {
        // update health and happiness if provided
        if (!isNaN(health) && !isNaN(happiness)) {
            pretty.debug(`Updating user ${userId} health=${health}, happiness=${happiness}`);
            await database.runQuery(
                'UPDATE users SET health = ?, happiness = ? WHERE id = ?',
                [health, happiness, userId]
            );
            try {
                await req.session.save();
            } catch (err) {
                pretty.error('Session save error after puzzle key clear:', err);
            }
        } else {
            pretty.debug(`Heartbeat for user ${userId} without valid health/happiness update.`);
        }
        // get the updated user data
        user = await database.getQuery(
            'SELECT id, level, views, happiness, health FROM users WHERE id = ? AND activation_status = ?',
            [userId, 'Member']
        );
        if (!user) {
            pretty.error(`User ID ${userId} not found or inactive during heartbeat.`);
            req.session.destroy(); // destroy invalid session
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">User data not found</error>');
        }
        const currentLevel = levelUtils.getUserLevel(user.level);
        const [
            friendCount,
            pendingFriendCount,
            rating,
            trophyResult
        ] = await Promise.all([
            socialUtils.getFriendCount(userId),
            socialUtils.getPendingFriendCount(userId),
            socialUtils.calculateRating(userId),
            trophyUtils.awardMissingLevelTrophies(userId, currentLevel) // pass current level to check for trophies
        ]);
        const responseData = {
            monster: {
                '@b': 'true',
                '@id': user.id,
            },
            level: {
                '@newLevel': String(trophyResult.newLevel), // convert boolean to string 'true'/'false'
                '@number': currentLevel,
                '@progress': levelUtils.getUserLevelProgress(user.level),
                ...(trophyResult.awardedItems.length > 0 && { items: { item: trophyResult.awardedItems } })
            },
            puzzles: {
                '@canplay': 'false' // constant?
            },
            friends: {
                '@friends': friendCount,
                '@pendingfriends': pendingFriendCount
            },
            stats: {
                '@monstar': monstarUtils.getUserMonstar(user.views),
                '@rating': rating,
                '@referralPoints': 0, // constant?
                '@views': user.views
            },
            status: {
                '@code': 0,
                '@text': 'success'
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error processing monster heartbeat for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;