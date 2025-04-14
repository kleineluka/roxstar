const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const sessionUtils = require('../../server/session.js');
const puzzleUtils = require('../../features/minigames/puzzles.js');

/**
 * Handles GET requests for the Puzzle Palace handshake.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Puzzle handshake request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!global.storage_puzzles) {
        pretty.error("Puzzle storage (global.storage_puzzles) not loaded.");
        return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Server configuration error</error>');
    }
    try {
        const puzzleSessionKey = sessionUtils.getRandomBytes(16);
        req.session.puzzleSessionKey = puzzleSessionKey;
        const dailyChallengeId = 100;
        const challengePlayedToday = await puzzleUtils.hasPlayedPuzzleToday(userId, dailyChallengeId);
        const isChallengeAvailable = !challengePlayedToday; // if NOT played today
        const [challengeAverage, challengeHighscore] = await Promise.all([
            puzzleUtils.getPuzzleAverage(userId, dailyChallengeId),
            puzzleUtils.getPuzzleHighscore(userId, dailyChallengeId)
        ]);
        // get puzzle data
        const puzzleTypesData = [];
        const puzzlePromises = [];
        for (const puzzleId in global.storage_puzzles) {
            const puzzleInfo = global.storage_puzzles[puzzleId];
            const idNum = parseInt(puzzleId, 10); // ensure ID is number
            // create a promise for each puzzle's data fetching
            puzzlePromises.push(
                Promise.all([
                    puzzleUtils.hasPlayedPuzzleToday(userId, idNum),
                    puzzleUtils.getPuzzleAverage(userId, idNum),
                    puzzleUtils.getPuzzleHighscore(userId, idNum)
                ]).then(([playedToday, averageScore, highscore]) => ({
                    id: idNum,
                    level: puzzleInfo.level || 1, // default level if missing
                    name: puzzleInfo.name || 'Unknown Puzzle',
                    played: String(playedToday), // convert boolean to 'true'/'false'
                    averageScore: averageScore,
                    highscore: highscore
                }))
            );
        }
        // wait for all puzzle data promises to resolve
        const resolvedPuzzleData = await Promise.all(puzzlePromises);
        // format the resolved data
        resolvedPuzzleData.forEach(data => {
            puzzleTypesData.push({
                puzzletype: {
                    '@id': data.id,
                    '@level': data.level,
                    '@name': data.name,
                    '@played': data.played
                },
                puzzlerecords: {
                    averagescore: data.averageScore,
                    highscore: data.highscore
                }
            });
        });
        const responseData = {
            response: {
                status: { '@code': 0, '@text': 'success' },
                ischallengeavailable: String(isChallengeAvailable),
                challengerecords: {
                    averagescore: challengeAverage,
                    highscore: challengeHighscore
                },
                fmsserveraddress: "unused", // unused for now
                ismultiplayeravailable: "false", // no clue how this will work?
                puzzletypes: puzzleTypesData
            }
        };
        req.session.save((err) => {
            if (err) {
                pretty.error(`Session save error during puzzle handshake for user ${userId}:`, err);
                const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Session Error' } } }).end();
                return res.status(500).type('text/xml').send(xmlError);
            }
            const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
                .end({ pretty: global.config_server['pretty-print-replies'] });
            res.type('text/xml').send(xml);
            pretty.debug(`Sent puzzle handshake for user ${userId}. Session key set.`);
        });
    } catch (error) {
        pretty.error(`Error processing puzzle handshake for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;