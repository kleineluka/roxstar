const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const pretty = require('../../utils/pretty.js');
const homeUtils = require('../../features/account/home.js');
const giftUtils = require('../../features/account/gifts.js');
const shopUtils = require('../../features/world/shops.js');
const arcadeUtils = require('../../features/world/arcade.js');
const pedestrianUtils = require('../../features/world/pedestrians.js');
const locationUtils = require('../../features/world/locations.js');

/**
 * Handles GET requests for specific location data.
 */
router.get('/:locationId', async (req, res) => {
    const locationId = req.params.locationId; 
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn(`Location request for ID ${locationId} without user session.`);
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    // base location and xml structures
    if (!global.storage_locations || !global.storage_locations[locationId]) {
        pretty.error(`Location ID ${locationId} not found in global.storage_locations.`);
        return res.status(404).type('text/xml').send('<error code="NOT_FOUND">Location not found</error>');
    }
    const baseLocationData = global.storage_locations[locationId];
    const responseData = {
        status: { '@code': 0, '@text': 'success' },
        location: {
            '@enabled': String(baseLocationData.enabled !== false), // default true
            '@key': baseLocationData.key || locationId,
            '@membersOnly': String(baseLocationData.membersOnly === true || baseLocationData.membersOnly === 'true'), // default false
            '@name': baseLocationData.name || 'Unknown Location',
            '@showTutorial': String(baseLocationData.showTutorial === true || baseLocationData.showTutorial === 'true'), // default false
            '@type': baseLocationData.type || 'unknown',
            '@gifts': String(baseLocationData.gifts === true || baseLocationData.gifts === 'true'),
            '@mysteryGifts': String(baseLocationData.mysteryGifts === true || baseLocationData.mysteryGifts === 'true'),
            '@items': String(baseLocationData.items === true || baseLocationData.items === 'true'),
            '@actors': String(baseLocationData.actors === true || baseLocationData.actors === 'true'),
            '@games': String(baseLocationData.games === true || baseLocationData.games === 'true'),
        }
    };
    // build dynamic section based on location type
    let dynamicData = {};
    const locationType = baseLocationData.type;
    try {
        switch (locationType) {
            case 'street':
                const pedestrians = await pedestrianUtils.getStreetPedestrians(userId);
                const overrides = locationUtils.formatLocationOverrides(baseLocationData.overrides);
                dynamicData = {
                    dynamic: {
                        actors: { pedestrians: pedestrians }, // array of {pedestrian: {...}}
                        overrides: overrides // Array of {content: {...}} or {structure: {...}}
                    }
                };
                break;
            // these are all handled the same way below (except giftshop which comes with gifts)
            case 'shop':
            case 'dressupshop':
            case 'seedshop':
            case 'giftshop':
                const storeData = global.storage_stores ? global.storage_stores[locationId] : null;
                const shopItems = shopUtils.formatShopItems(baseLocationData, storeData);
                if (locationType === 'giftshop') {
                    dynamicData = { gifts: shopItems }; // array of {gift: {...}}
                } else {
                    dynamicData = { items: shopItems }; // array of {item: {...}}
                }
                break;
            case 'roomshop':
                const nextRoomStatus = await homeUtils.getNextRoomStatus(userId);
                const styles = homeUtils.formatAllHouseStyles(); 
                dynamicData = {
                    dynamic: {
                        roomShop: { nextAvailableRoom: nextRoomStatus }, // nextRoomStatus is already formatted
                        styles: { style: styles.map(s => s) } // array of {style: {...}} -> extract inner obj
                    }
                };
                dynamicData.dynamic.styles.style = styles.map(s => s); // make sure it's an array of the inner objects
                break;
            case 'arcade':
                const games = arcadeUtils.formatArcadeGames();
                dynamicData = {
                    dynamic: {
                        games: games // array of {game: {...}}
                    }
                };
                break;
            case 'monsterroom':
                const giftCounts = await giftUtils.getRoomGiftCounts(userId);
                dynamicData = {
                    dynamic: {
                        gifts: {
                            '@count': giftCounts.giftsCount,
                            '@hasUnopenedGift': giftCounts.hasUnopenedGift,
                            '@missionsGiftWrapped': giftCounts.missionsGiftWrapped,
                            '@hasUnopenedWelcomeGift': giftCounts.hasUnopenedWelcomeGift
                        },
                        mysteryGifts: {
                            '@giftsSentToday': giftCounts.mysteryGiftsSentToday,
                            '@unopenedCount': giftCounts.mysteryGiftsUnopenedCount
                        }
                    }
                };
                // hard-coded disco logic
                if (locationId === '31' || locationId === 31) {
                    // build the dance game progress structure
                    const songs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                    dynamicData.dancegameprogress = {
                        song: songs.map(songId => ({
                            '@id': songId,
                            difficulty: [ // array of difficulties
                                { '@level': 'easy' },
                                { '@level': 'medium' },
                                { '@level': 'hard' }
                            ]
                        }))
                    };
                }
                break;
            case 'friendroom':
                // simple gift counts for friend room
                dynamicData = {
                    dynamic: {
                        gifts: {
                            '@count': 0,
                            '@hasUnopenedGift': 'false',
                            '@missionsGiftWrapped': 'false',
                            '@hasUnopenedWelcomeGift': 'false'
                        }
                    }
                };
                break;
            // add cases for other types like 'garden', 'moshlingzoo', etc. if needed
            default:
                pretty.debug(`No specific dynamic data configured for location type: ${locationType}`);
                break;
        }
        // check if dynamicData has keys before merging
        if (Object.keys(dynamicData).length > 0) {
            // merge properties into responseData.location if they are direct children like 'items' or 'gifts'
            if (dynamicData.items) responseData.location.items = dynamicData.items;
            if (dynamicData.gifts) responseData.location.gifts = dynamicData.gifts;
            // if it's wrapped in 'dynamic', merge that object
            if (dynamicData.dynamic) responseData.location.dynamic = dynamicData.dynamic;
            // handle specific top-level elements like dancegameprogress
            if (dynamicData.dancegameprogress) responseData.location.dancegameprogress = dynamicData.dancegameprogress;
        }
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
        pretty.debug(`Sent location data for ID ${locationId}, Type: ${locationType}`);
    } catch (error) {
        pretty.error(`Error processing location request for ID ${locationId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;