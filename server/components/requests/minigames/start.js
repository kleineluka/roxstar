const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const crypto = require('crypto');
const pretty = require('../../utils/pretty.js');
const sessionUtils = require('../../server/session.js');

/**
 * Handles GET requests to start a minigame session.
 * Generates a hash, stores it in the session, and returns it to the client.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Minigame start request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    try {
        // this is for basic authentiation that they're actually playing the game and not just spamming the server
        const minigameSessionData = sessionUtils.getRandomBytes(50);
        req.session.minigameSessionData = minigameSessionData;
        const hashToSend = crypto.createHash('md5').update(minigameSessionData).digest('hex');
        const responseData = {
            status: {
                '@code': 0,
                '@text': 'success'
            },
            result: {
                '@hash': hashToSend,
                '@isNewHighscore': 'false',
                '@highscore': 0
            }
        };
        // save the session with the new data
        req.session.save((err) => {
            if (err) {
                pretty.error(`Session save error during minigame start for user ${userId}:`, err);
                // don't send response if session save failed
                const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Session Error' } } })
                    .end({ pretty: global.config_server['pretty-print-replies'] });
                return res.status(500).type('text/xml').send(xmlError);
            }
            // session saved successfully, now send XML
            const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
                .end({ pretty: global.config_server['pretty-print-replies'] });
            res.type('text/xml').send(xml);
            pretty.debug(`Started minigame session for user ${userId}. Hash sent: ${hashToSend}`);
        });
    } catch (error) {
        pretty.error(`Error processing minigame start request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;