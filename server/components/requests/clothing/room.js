const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const inventoryUtils = require('../../features/account/inventory.js');
const monsterUtils = require('../../features/account/monster.js');

/**
 * Handles GET requests to load the user's own dressup data.
 */
router.get('/', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Dressup load request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // try and get the user data
    try {
        const user = await database.getQuery(
            'SELECT monster, dressup_prefix FROM users WHERE id = ? AND activation_status = ?',
            [userId, 'Member']
        );
        if (!user) {
            pretty.error(`User ${userId} not found or inactive during dressup load.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">User not found</error>');
        }
        // get async clothing and dressup data
        const [
            clothesData,
            dressupData
        ] = await Promise.all([
            database.getAllQuery('SELECT id, item_id FROM clothes WHERE user_id = ?', [userId]),
            database.getAllQuery('SELECT * FROM dressup WHERE user_id = ?', [userId])
        ]);
        //
        // thankfully, the format is the same as other requests with clothing
        const formattedInventory = inventoryUtils.formatUserClothes(clothesData);
        const formattedCostume = inventoryUtils.formatUserCostume(dressupData);
        const monsterParts = monsterUtils.getMonsterParts(user.monster);
        // construct the  final xml object to send back
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            room: {
                mannequin: {
                    '@asset': '', // constant
                    '@name': user.monster,
                    zones: {}, // empty zone tags
                    part: monsterParts.map(p => p.part) // extract inner object for multiple <part> tags
                },
                inventory: {
                    '@type': 'dressup',
                    item: formattedInventory
                },
                costume: {
                    '@id': userId,
                    items: {
                        dressupitem: formattedCostume
                    },
                    attributes: {
                        dressupattribute: {
                            '@key': 'animation_prefix',
                            '@value': user.dressup_prefix || ''
                        }
                    }
                }
            }
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error fetching own dressup data for user ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;