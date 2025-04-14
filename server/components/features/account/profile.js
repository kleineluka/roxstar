// components/features/account/profile.js
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formatUtils = require('../../utils/formats.js');
const levelUtils = require('./levels.js');
const monstarUtils = require('./monstar.js');
const socialUtils = require('./socials.js');
const puzzleUtils = require('./puzzles.js');
const homeUtils = require('./home.js');
const giftUtils = require('./gifts.js');

/**
 * Fetches and formats the complete profile data for a given user ID.
 * @param {number} userId - The ID of the user whose profile to fetch.
 * @returns {Promise<object|null>} - The formatted profile data object, or null if user not found/error.
 */
async function getUserProfileData(userId) {
    try {
        // get the user data
        const user = await database.getQuery(
            'SELECT id, username, monster_name, monster, primary_colour, secondary_colour, colorama, country, gender, birthday, level, activation_status, views, profile, creation_date FROM users WHERE id = ?',
            [userId]
        );
        if (!user || user.activation_status === 'banned') {
            pretty.debug(`User profile requested for non-existent or banned user ID: ${userId}`);
            return null; //if banned or not found, return null
        }
        // parse profile json safely
        let profileArray = [0, 0, 0, 0, 0]; // default values
        try {
            if (user.profile) {
                const parsed = JSON.parse(user.profile);
                if (Array.isArray(parsed) && parsed.length >= 5) {
                    profileArray = parsed;
                }
            }
        } catch (e) { pretty.warn(`Invalid profile JSON for user ${userId}: ${user.profile}`); }
        // fetch related counts and stats concurrently
        const [
            puzzleHighscore,
            moshlingCount,
            roomCount,
            friendCount,
            openedGiftCount
        ] = await Promise.all([
            puzzleUtils.getPuzzleHighscore(userId, 100), // 100 = daily puzzle
            database.getQuery("SELECT COUNT(DISTINCT srcId) as count FROM moshlings WHERE user_id = ?", [userId]).then(r => r?.count || 0),
            homeUtils.getRoomCount(userId),
            socialUtils.getFriendCount(userId),
            giftUtils.getOpenedGiftCount(userId)
        ]);
        const profileData = {
            profile: {
                userMonsterProfile: {
                    '@created': user.creation_date,
                    '@highestPuzzleScore': puzzleHighscore,
                    '@level': levelUtils.getUserLevel(user.level),
                    '@member': 'true',
                    '@moshlings': moshlingCount,
                    '@name': user.monster_name,
                    '@rating': monstarUtils.getUserMonstar(user.views),
                    '@rooms': roomCount,
                    '@visits': user.views
                },
                userProfile: {
                    '@age': formatUtils.getUserAge(user.birthday),
                    '@country': user.country || '',
                    '@currentMood': profileArray[1], // mood from parsed profile
                    '@favouriteColour': profileArray[0], // colour
                    '@favouriteFood': profileArray[3], // food
                    '@favouriteMoshling': profileArray[4], // moshling
                    '@favouriteMusic': profileArray[2], // music
                    '@friends': friendCount,
                    '@gender': user.gender,
                    '@gifts': openedGiftCount, // count of OPENED gifts
                    '@name': user.monster_name
                }
            }
        };
        return profileData;
    } catch (error) {
        pretty.error(`Error fetching user profile data for ID ${userId}:`, error);
        return null; // return null on error
    }
}

module.exports = {
    getUserProfileData,
};