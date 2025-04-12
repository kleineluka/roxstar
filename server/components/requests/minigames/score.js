const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const crypto = require('crypto');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const levelUtils = require('../../features/account/levels.js'); // Corrected path assumption
const rewardUtils = require('../../features/minigames/rewards.js');
const highscoreUtils = require('../../features/minigames/highscores.js');

/**
 * Core logic for processing a minigame score submission.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
async function processMinigameScore(req, res) {
    const userId = req.session.userId;
    const gameId = parseInt(req.params.gameId, 10);
    const difficulty = req.params.difficulty;
    const score = parseInt(req.query.score, 10);
    const receivedHash = req.query.hash;
    if (!userId) {
        pretty.warn('Minigame score request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // check all required parameters (difficulty might be optional depending on game/client?)
    if (isNaN(gameId) || isNaN(score) || !receivedHash) { // difficulty = optionaL
        pretty.warn(`Minigame score request missing parameters for user ${userId}. GameID: ${gameId}, Difficulty: ${difficulty}, Score: ${score}, Hash: ${receivedHash}`);
        return res.status(400).type('text/xml').send('<error code="INVALID_PARAMS">Missing parameters</error>');
    }
    const expectedSessionData = req.session.minigameSessionData;
    if (!expectedSessionData) {
        pretty.warn(`Minigame score submission for user ${userId}, game ${gameId} failed: No minigame session data found.`);
        return res.status(403).type('text/xml').send('<error code="INVALID_SESSION">Invalid minigame session</error>');
    }
    const serverHash = crypto.createHash('md5').update(expectedSessionData).digest('hex');
    const clientStringToHash = String(gameId) + String(difficulty) + String(score) + serverHash; // equation used by client before sending back
    const expectedHash = crypto.createHash('md5').update(clientStringToHash).digest('hex');
    if (expectedHash !== receivedHash) {
        pretty.warn(`Minigame score submission for user ${userId}, game ${gameId} failed: Hash mismatch. Expected ${expectedHash}, received ${receivedHash}`);
        return res.status(403).type('text/xml').send('<error code="INVALID_HASH">Session hash mismatch</error>');
    }
    delete req.session.minigameSessionData;
    // wait for safety and save session
    try {
        await new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) return reject(err);
                resolve();
            });
        });
        pretty.debug(`Session saved after clearing minigame data for user ${userId}.`);
    } catch (sessionError) {
        pretty.error(`Session save error after clearing minigame data for user ${userId}:`, sessionError);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Session Save Error' } } }).end();
        return res.status(500).type('text/xml').send(xmlError);
    }
    // get the score and rewards etc
    try {
        const roxEarned = rewardUtils.calculateRox(gameId, score, difficulty);
        const expEarned = rewardUtils.calculateExp(gameId, score, difficulty);
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
        // rox daily limit
        if (remainingRoxToday > 0) {
            actualRoxAwarded = Math.min(roxEarned, remainingRoxToday);
            const roxDelta = actualRoxAwarded >= 0 ? actualRoxAwarded : 0;
            remainingRoxToday = Math.max(0, remainingRoxToday - roxDelta);
        } else {
            pretty.debug(`User ${userId} hit daily Rox limit.`);
        }
        // exp daily limit
        if (remainingLevelsToday > 0) {
            actualExpAwarded = Math.min(expEarned, remainingLevelsToday);
            const expDelta = actualExpAwarded >= 0 ? actualExpAwarded : 0;
            remainingLevelsToday = Math.max(0, remainingLevelsToday - expDelta);
        } else {
            pretty.debug(`User ${userId} hit daily Level limit.`);
        }
        // update database-side
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
        // log score
        await highscoreUtils.logMinigameScore(userId, gameId, score, receivedHash);
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            result: {
                '@rocks': actualRoxAwarded > 0 ? actualRoxAwarded : 0,
                '@progress': levelUtils.getUserLevelProgress(user.level + (actualExpAwarded > 0 ? actualExpAwarded : 0)),
                '@isNewHighscore': String(isNewHigh),
                '@highscore': isNewHigh ? score : currentHighscore
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
}

router.get('/:gameId/:difficulty', processMinigameScore);
router.post('/:gameId/:difficulty', processMinigameScore);
module.exports = router;