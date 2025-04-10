const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const inventoryUtils = require('../../features/account/inventory.js');
const monsterUtils = require('../../features/account/monster.js');

/**
 * Handles GET requests to load a friend's dressup data.
 * Expects the target username as a URL parameter (:username).
 */
router.get('/:username', async (req, res) => {
    const targetUsername = req.params.username;
    const loggedInUserId = req.session.userId;
    if (!targetUsername) {
        pretty.warn('Friend costume request missing username parameter.');
        return res.status(400).type('text/xml').send('<error code="INVALID_REQUEST">Missing target user parameter</error>');
    }
    if (!loggedInUserId) {
        pretty.warn('Attempted to access friend costume without being logged in.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    try {
        pretty.debug(`Loading friend costume data for target user: ${targetUsername}`);
        const targetUser = await database.getQuery(
            'SELECT id, monster, dressup_prefix FROM users WHERE username = ? AND activation_status = ?',
            [targetUsername, 'Member']
        );
        if (!targetUser) {
            pretty.warn(`Target friend user "${targetUsername}" not found or inactive.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">Friend not found</error>');
        }
        const targetUserId = targetUser.id;
        const [
            clothesData,
            dressupData
        ] = await Promise.all([
            database.getAllQuery('SELECT id, item_id FROM clothes WHERE user_id = ?', [targetUserId]),
            database.getAllQuery('SELECT * FROM dressup WHERE user_id = ?', [targetUserId])
        ]);
        const formattedInventory = inventoryUtils.formatUserClothes(clothesData);
        const formattedCostume = inventoryUtils.formatUserCostume(dressupData);
        const monsterParts = monsterUtils.getMonsterParts(targetUser.monster);
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            room: {
                mannequin: {
                    '@asset': '',
                    '@name': targetUser.monster,
                    zones: {},
                    part: monsterParts.map(p => p.part) // extract the inner object
                },
                inventory: {
                    '@type': 'dressup',
                    item: formattedInventory // array of clothing items
                },
                costume: {
                    '@id': targetUserId,
                    items: { // wrap the costume items in <items>
                        dressupitem: formattedCostume.map(c => c) // array of worn items
                    },
                    attributes: {
                        dressupattribute: {
                            '@key': 'animation_prefix',
                            '@value': targetUser.dressup_prefix || ''
                        }
                    }
                }
            }
        };
        // build and send the
        const finalResponseData = {
            status: responseData.status,
            room: {
                mannequin: {
                    '@asset': '',
                    '@name': targetUser.monster,
                    zones: {}, // represents <zones/>
                    part: monsterParts.map(p => p.part)
                },
                inventory: responseData.room.inventory,
                costume: responseData.room.costume
            }
        };
        const xml = xmlbuilder.create({ xml: finalResponseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.print(`Successfully sent friend costume data for target user: ${targetUsername}`, 'ACTION');
    } catch (error) {
        pretty.error(`Error fetching friend costume data for target user ${targetUsername}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;