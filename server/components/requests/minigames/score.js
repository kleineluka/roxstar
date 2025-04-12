const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const crypto = require('crypto');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const levelUtils = require('../../features/account/levels.js');
const rewardUtils = require('../../features/minigames/rewards.js');
const highscoreUtils = require('../../features/minigames/highscores.js');

/**
 * Handles GET requests to submit a minigame score.
 */
router.get('/:gameId/:difficulty', async (req, res) => {
    const userId = req.session.userId;
    const gameId = parseInt(req.params.gameId, 10);
    const difficulty = req.params.difficulty;
    const score = parseInt(req.query.score, 10);
    const receivedHash = req.query.hash;
    if (!userId) {
        pretty.warn('Minigame score request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (isNaN(gameId) || isNaN(score) || !receivedHash) { // it's okay if we don't have difficulty, it's optional
        pretty.warn(`Minigame score request missing parameters for user ${userId}. GameID: ${gameId}, Score: ${score}, Hash: ${receivedHash}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing parameters</error>');
    }
    // validate the minigame session
    const expectedSessionData = req.session.minigameSessionData;
    if (!expectedSessionData) {
        pretty.warn(`Minigame score submission for user ${userId}, game ${gameId} failed: No minigame session data found.`);
        return res.status(403).type('text/xml').send('<error code="INVALID_SESSION">Invalid minigame session</error>');
    }
    const serverHash = crypto.createHash('md5').update(expectedSessionData).digest('hex');
    const clientStringToHash = String(gameId) + String(difficulty) + String(score) + serverHash; // the algorithm the game uses before sendig the hash
    const expectedHash = crypto.createHash('md5').update(clientStringToHash).digest('hex');
    if (expectedHash !== receivedHash) {
        pretty.warn(`Minigame score submission for user ${userId}, game ${gameId} failed: Hash mismatch. Expected ${expectedHash}, received ${receivedHash}`);
        return res.status(403).type('text/xml').send('<error code="INVALID_HASH">Session hash mismatch</error>');
    }
    // clear the hash from the session
    delete req.session.minigameSessionData;
    req.session.save(err => { if (err) pretty.error(`Session save error after clearing minigame data for user ${userId}:`, err); });
    try {
        // calculate rewards
        const roxEarned = rewardUtils.calculateRox(gameId, score, difficulty);
        const expEarned = rewardUtils.calculateExp(gameId, score, difficulty);
        // check highscore
        const [isNewHigh, currentHighscore] = await Promise.all([
            highscoreUtils.isNewHighscore(userId, gameId, score),
            highscoreUtils.getMinigameHighscore(userId, gameId)
        ]);
        const user = await database.getQuery('SELECT level, rocks, rocks_today, levels_today FROM users WHERE id = ?', [userId]);
        if (!user) {
            pretty.error(`User ${userId} not found during score submission.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">User not found</error>');
        }
        let actualRoxAwarded = 0;
        let actualExpAwarded = 0;
        let remainingRoxToday = user.rocks_today;
        let remainingLevelsToday = user.levels_today;
        // apply daily limits
        if (remainingRoxToday > 0) {
            actualRoxAwarded = Math.min(roxEarned, remainingRoxToday);
            const roxDelta = actualRoxAwarded >= 0 ? actualRoxAwarded : 0; // non-negative update value
            remainingRoxToday = Math.max(0, remainingRoxToday - roxDelta); // prevent going below 0
        } else {
            pretty.debug(`User ${userId} hit daily Rox limit.`);
        }
        // apply Level limit
        if (remainingLevelsToday > 0) {
            actualExpAwarded = Math.min(expEarned, remainingLevelsToday);
            const expDelta = actualExpAwarded >= 0 ? actualExpAwarded : 0; // non-negative update value
            remainingLevelsToday = Math.max(0, remainingLevelsToday - expDelta); // prevent going below 0
        } else {
            pretty.debug(`User ${userId} hit daily Level limit.`);
        }
        // update user in db
        if (actualRoxAwarded > 0 || actualExpAwarded > 0) {
            const roxToAdd = actualRoxAwarded > 0 ? actualRoxAwarded : 0;
            const expToAdd = actualExpAwarded > 0 ? actualExpAwarded : 0;
            const updateResult = await database.runQuery(
                'UPDATE users SET rocks = rocks + ?, rocks_today = ?, level = level + ?, levels_today = ? WHERE id = ?',
                [roxToAdd, remainingRoxToday, expToAdd, remainingLevelsToday, userId]
            );
            if (!updateResult || updateResult.changes === 0) {
                pretty.error(`Failed to update rewards for user ${userId}.`);
            } else {
                pretty.debug(`Awarded ${roxToAdd} Rox, ${expToAdd} XP to user ${userId}.`);
            }
        }
        // log new score
        await highscoreUtils.logMinigameScore(userId, gameId, score, receivedHash);
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            result: {
                '@rocks': actualRoxAwarded > 0 ? actualRoxAwarded : 0, // ensure non-negative in response
                '@progress': levelUtils.getUserLevelProgress(user.level + (actualExpAwarded > 0 ? actualExpAwarded : 0)), // use actual XP awarded
                '@isNewHighscore': String(isNewHigh), // 'true' or 'false'
                '@highscore': isNewHigh ? score : currentHighscore // return new score if it's the highscore
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error processing minigame score for user ID ${userId}, game ${gameId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;