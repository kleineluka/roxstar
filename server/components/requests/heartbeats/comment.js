const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const socialUtils = require('../../features/account/socials.js'); 

/**
 * Handles GET requests for the comment heartbeat.
 * Returns the count of approved and pending comments for the logged-in user.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Comment heartbeat request without userId in session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    try {
        const [commentCount, pendingCommentCount] = await Promise.all([
            socialUtils.getCommentCount(userId),
            socialUtils.getPendingCommentCount(userId)
        ]);
        const responseData = {
            comments: {
                '@comments': commentCount,
                '@pendingcomments': pendingCommentCount
            },
            status: {
                '@code': 0,
                '@text': 'success'
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.debug(`Sent comment heartbeat for user ${userId}: ${commentCount} comments, ${pendingCommentCount} pending.`);
    } catch (error) {
        pretty.error(`Error processing comment heartbeat for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;