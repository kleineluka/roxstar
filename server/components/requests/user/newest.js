const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests for fetching the newest activated members.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Newest members request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    try {
        const newestUsers = await database.getAllQuery(
            `SELECT id, username, country, gender
             FROM users
             WHERE activation_status = 'Member'
             AND gender != 'o'
             ORDER BY creation_date DESC
             LIMIT 10`, 
            []
        );
        // format data for XML response
        const formattedMembers = newestUsers.map(user => ({
            member: {
                '@country': user.country || '', // default if null
                '@gender': user.gender,
                '@id': user.id,
                '@username': user.username
            }
        }));
        // and then build the XML response
        const responseData = {
            newestMembersResponse: {
                status: {
                    '@code': 0,
                    '@text': 'success'
                },
                members: formattedMembers
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.debug(`Sent newest members list.`);
    } catch (error) {
        pretty.error('Error fetching newest members:', error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;