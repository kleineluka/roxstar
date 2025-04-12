const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formatUtils = require('../../utils/formats.js');
const levelUtils = require('../../features/account/levels.js');
const monsterUtils = require('../../features/account/monster.js');

/**
 * Handles GET requests to find a user by username.
 */
router.get('/:username', async (req, res) => {
    const loggedInUserId = req.session.userId; // logged in user from session
    const targetUsername = req.params.username; // target user from parameters
    if (!loggedInUserId) {
        pretty.warn('User find request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUsername) {
        pretty.warn('User find request missing username parameter.');
        return res.status(400).type('text/xml').send('<error code="MISSING_PARAM">Username required</error>');
    }
    try {
        // find the user 
        const foundUser = await database.getQuery(
            `SELECT id, username, monster_name, monster, primary_colour, secondary_colour, colorama,
                    country, gender, birthday, level, activation_status
             FROM users
             WHERE username = ?`,
            [targetUsername]
        );
        // not found (or banned)
        if (!foundUser) {
            pretty.debug(`User find request: User "${targetUsername}" not found.`);
            const notFoundResponse = {
                findFriendResponse: {
                    status: { '@code': 1, '@text': 'User not found' } // use a non-zero code
                }
            };
            const xml = xmlbuilder.create({ xml: notFoundResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.status(404).type('text/xml').send(xml); // use 404 status code
        }
        if (foundUser.activation_status === 'banned') {
            pretty.debug(`User find request: User "${targetUsername}" is banned.`);
            const notFoundResponse = {
                findFriendResponse: {
                    status: { '@code': 1, '@text': 'User not found' } // just treat as not found for now, unsure if it needs a banned response
                }
            };
            const xml = xmlbuilder.create({ xml: notFoundResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.status(404).type('text/xml').send(xml); // use 404 status code
        }
        // format it
        const responseData = {
            findFriendResponse: {
                user: {
                    '@age': formatUtils.getUserAge(foundUser.birthday),
                    '@country': foundUser.country || '',
                    '@gender': foundUser.gender,
                    '@id': foundUser.id,
                    '@level': levelUtils.getUserLevel(foundUser.level),
                    '@name': foundUser.monster_name, // NOT the username
                    '@primarycolour': foundUser.primary_colour,
                    '@secondarycolour': foundUser.secondary_colour,
                    ...monsterUtils.getUserColoramaData(foundUser.colorama),
                    '@b': 'true', // constant
                    '@username': foundUser.username,
                    '@type': foundUser.monster
                },
                activationStatus: foundUser.activation_status,
                status: {
                    '@code': 0,
                    '@text': 'success'
                }
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.debug(`User find request successful for "${targetUsername}".`);
    } catch (error) {
        pretty.error(`Error finding user "${targetUsername}":`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;