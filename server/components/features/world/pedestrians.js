// components/features/world/pedestrians.js
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formatUtils = require('../../utils/formats.js');
const levelUtils = require('../../features/account/levels.js');
const socialUtils = require('../../features/account/socials.js');
const monsterUtils = require('../../features/account/monster.js');

/**
 * Gets a list of random active users to act as pedestrians in a street location.
 * @param {number} excludeUserId - The ID of the user currently viewing the street (to exclude them).
 * @param {number} [limit=5] - The maximum number of pedestrians to fetch.
 * @returns {Promise<Array<object>>} An array of formatted pedestrian objects.
 */
async function getStreetPedestrians(excludeUserId, limit = 5) {
    const pedestrians = [];
    try {
        // fetch recent, active, non-excluded users
        const threeDaysAgo = Math.floor(Date.now() / 1000) - (3 * 86400);
        const potentialPedestrians = await database.getAllQuery(
            `SELECT id, username, monster_name, monster, primary_colour, secondary_colour, colorama, country, gender, birthday, level
             FROM users
             WHERE activation_status = 'Member'
             AND id != ?
             AND last_active >= ?
             ORDER BY RANDOM()
             LIMIT ?`,
            [excludeUserId, threeDaysAgo, limit]
        );
        if (!potentialPedestrians || potentialPedestrians.length === 0) {
            return [];
        }
        // for each pedestrian, fetch one random moshling they have in their room
        const moshlingPromises = potentialPedestrians.map(user =>
            database.getQuery(
                'SELECT id, srcId FROM moshlings WHERE user_id = ? AND in_room = "true" ORDER BY RANDOM() LIMIT 1',
                [user.id]
            )
        );
        const userMoshlings = await Promise.all(moshlingPromises);
        // format the data
        for (let i = 0; i < potentialPedestrians.length; i++) {
            const user = potentialPedestrians[i];
            const moshling = userMoshlings[i]; // might be null if user has no moshlings in room
            let formattedMoshling = {};
            if (moshling && global.storage_moshlings) {
                const baseMoshling = global.storage_moshlings[moshling.srcId];
                if (baseMoshling) {
                    formattedMoshling = {
                        moshling: {
                            '@id': moshling.id,
                            '@asset': baseMoshling.asset,
                            '@catchType': baseMoshling.catchType || 'unknown',
                            '@floating': String(baseMoshling.floating === true || baseMoshling.floating === 'true'),
                            '@name': baseMoshling.name,
                            '@rarityid': baseMoshling.rarityid || 0,
                            '@uuid': baseMoshling.uuid || '',
                            '@srcId': moshling.srcId
                        }
                    };
                }
            }
            const userMood = await socialUtils.getUserMood(user.id);
            pedestrians.push({
                pedestrian: {
                '@friendstatus': 'notfriends', // todo: real checking
                '@mood': userMood,
                '@age': formatUtils.getUserAge(user.birthday),
                '@country': user.country || '',
                '@gender': user.gender,
                '@id': user.id,
                '@level': levelUtils.getUserLevel(user.level),
                '@name': user.monster_name,
                '@primarycolour': user.primary_colour,
                '@secondarycolour': user.secondary_colour,
                ...monsterUtils.getUserColoramaData(user.colorama),
                '@b': 'true', // constant
                '@type': user.monster,
                '@username': user.username,
                ...formattedMoshling 
                }
            });
        }
    } catch (error) {
        pretty.error(`Error fetching street pedestrians (excluding ${excludeUserId}):`, error);
    }
    return pedestrians;
    //return pedestrians.map(p => ({ pedestrian: p })); // ensure final structure has <pedestrian> wrapper
}

module.exports = {
    getStreetPedestrians,
};