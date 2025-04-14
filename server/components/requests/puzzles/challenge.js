const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const puzzleUtils = require('../../features/minigames/puzzles.js');

/**
 * Handles GET requests to start the Daily Puzzle Challenge.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    const puzzleSessionKey = req.session.puzzleSessionKey;
    if (!userId) {
        pretty.warn('Start challenge request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!puzzleSessionKey) {
        pretty.warn(`Start challenge request for user ${userId} without puzzle session key.`);
        return res.status(400).type('text/xml').send('<error code="INVALID_SESSION">Puzzle session not started</error>');
    }
    // for score submission
    // todo: move to database?
    req.session.puzzleId = 100;
    try {
        const puzzleCount = 30;
        const puzzlesData = await puzzleUtils.getRandomPuzzles(userId, puzzleCount);
        if (puzzlesData.length === 0) {
            pretty.error(`Failed to fetch any puzzles for daily challenge for user ${userId}.`);
            return res.status(500).type('text/xml').send('<error code="SERVER_ERROR">Could not load puzzles</error>');
        }
        const responseData = {
            response: {
                '@sessionid': puzzleSessionKey,
                // puzzles element contains the array of puzzle+answers objects
                puzzles: puzzlesData
            }
        };
        // need to save session because we set puzzleId
        req.session.save((err) => {
            if (err) {
                pretty.error(`Session save error during start challenge for user ${userId}:`, err);
                const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Session Error' } } }).end();
                return res.status(500).type('text/xml').send(xmlError);
            }
            const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
                .end({ pretty: global.config_server['pretty-print-replies'] });
            res.type('text/xml').send(xml);
            pretty.debug(`Sent daily challenge puzzles for user ${userId}.`);
        });
    } catch (error) {
        pretty.error(`Error processing start challenge request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;