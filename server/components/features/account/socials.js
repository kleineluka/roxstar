const crypto = require('crypto');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');

/**
 * Gets the number of friends a user has.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<number>} - The number of friends.
 */
async function getFriendCount(userId) {
    try {
        const row = await database.getQuery(
            "SELECT COUNT(*) AS count FROM friends WHERE user_id = ? AND status = 'friend'",
            [userId]
        );
        return row?.count || 0;
    } catch (error) {
        pretty.error(`Error getting friend count for user ID ${userId}:`, error);
        return 0; // assume 0 on error
    }
}

/**
 * Gets the number of pending friend requests for a user.
 * This counts requests *sent to* this user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<number>} - The number of pending friend requests.
 */
async function getPendingFriendCount(userId) {
    try {
        const row = await database.getQuery(
            "SELECT COUNT(*) AS count FROM friends WHERE friend_user_id = ? AND status = 'request'",
            [userId]
        );
        return row?.count || 0;
    } catch (error) {
        pretty.error(`Error getting pending friend count for user ID ${userId}:`, error);
        return 0; // assume 0 on error
    }
}

/**
 * Gets the number of non-pending/non-deleted/non-reported comments on a user's message board.
 * @param {number} userId - The ID of the user whose board it is.
 * @returns {Promise<number>} - The number of visible comments.
 */
async function getCommentCount(userId) {
    try {
        const row = await database.getQuery(
            "SELECT COUNT(*) AS count FROM message_board WHERE reciever = ? AND status != 'pending' AND status != 'deleted' AND status != 'reported'",
            [userId]
        );
        return row?.count || 0;
    } catch (error) {
        pretty.error(`Error getting comment count for user ID ${userId}:`, error);
        return 0; // assume 0 on error
    }
}

/**
 * Gets the number of pending comments on a user's message board.
 * @param {number} userId - The ID of the user whose board it is.
 * @returns {Promise<number>} - The number of pending comments.
 */
async function getPendingCommentCount(userId) {
    try {
        const row = await database.getQuery(
            "SELECT COUNT(*) AS count FROM message_board WHERE reciever = ? AND status = 'pending'",
            [userId]
        );
        return row?.count || 0;
    } catch (error) {
        pretty.error(`Error getting pending comment count for user ID ${userId}:`, error);
        return 0; // assume 0 on error
    }
}

/**
 * Calculates the average rating for a user.
 * @param {number} userId - The ID of the user who was rated.
 * @returns {Promise<number>} - The average rating (float, typically 0.0 to 5.0), or 0.0 if no ratings exist.
 */
async function calculateRating(userId) {
    try {
        const row = await database.getQuery(
            "SELECT AVG(rating) AS average FROM logs_rate WHERE rate_visit_user_id = ? AND type = 'rated'",
            [userId]
        );
        return row?.average ? parseFloat(row.average.toFixed(1)) : 0.0;
    } catch (error) {
        pretty.error(`Error calculating rating for user ID ${userId}:`, error);
        return 0.0; // assume 0.0 on error
    }
}

/**
 * Logs an event to the BFF news feed.
 * @param {number} userId - The ID of the user performing the action.
 * @param {string} type - The type of event (e.g., 'achievement', 'CaughtMoshling').
 * @param {string|number} value - The value associated with the event (e.g., medal ID, moshling ID).
 * @returns {Promise<boolean>} - True if logging was successful, false otherwise.
 */
async function logBffNews(userId, type, value) {
    if (!userId || !type || value === undefined || value === null) {
        pretty.warn(`logBffNews called with invalid parameters: userId=${userId}, type=${type}, value=${value}`);
        return false;
    }
    if (!global.config_server['bff-news-log']) {
        pretty.debug('BFF News logging is disabled in config.');
        return true; // return true as it's not an error, just disabled.
    }
    try {
        const newsUuid = crypto.randomUUID();
        const timestamp = clock.getTimestamp();
        const sql = `
            INSERT INTO bff_news (user_id, uuid, type, value, date)
            VALUES (?, ?, ?, ?, ?)
        `;
        // ensure value is stored as a string
        const params = [userId, newsUuid, String(type), String(value), timestamp];
        const result = await database.runQuery(sql, params);
        if (result && result.lastID > 0) {
            pretty.debug(`Logged BFF news: User ${userId}, Type ${type}, Value ${value}`);
            return true;
        } else {
            pretty.warn(`Failed to log BFF news for user ID ${userId}. Result: ${JSON.stringify(result)}`);
            return false;
        }
    } catch (error) {
        pretty.error(`Error logging BFF news for user ID ${userId}:`, error);
        return false;
    }
}

/**
 * Gets the user's current mood ID from their profile data.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<number>} - The user's mood ID (index 1 of profile array), or 0 as default if not set/error.
 */
async function getUserMood(userId) {
    const defaultMood = 0; // default mood id
    if (typeof userId !== 'number') {
        pretty.warn(`getUserMood called with invalid userId: ${userId}`);
        return defaultMood;
    }
    try {
        const user = await database.getQuery('SELECT profile FROM users WHERE id = ?', [userId]);
        if (!user || !user.profile) {
            pretty.debug(`No profile data found for user ID ${userId} when getting mood.`);
            return defaultMood;
        }
        const profileArray = JSON.parse(user.profile);
        if (Array.isArray(profileArray) && profileArray.length > 1 && typeof profileArray[1] !== 'undefined') {
            const moodId = Number(profileArray[1]);
            return !isNaN(moodId) ? moodId : defaultMood;
        } else {
            pretty.warn(`Invalid profile format or missing mood for user ID ${userId}. Profile: ${user.profile}`);
            return defaultMood;
        }
    } catch (error) {
        pretty.error(`Error getting user mood for ID ${userId}:`, error);
        return defaultMood;
    }
}

/**
 * Checks BFF status from a pre-fetched map.
 * @param {Map<number, string>} bffMap - A Map where key is friend_user_id and value is the bff status ('true'/'false').
 * @param {number} friendId - The ID of the friend to check.
 * @returns {string} 'true' or 'false'.
 */
function checkBffStatusFromMap(bffMap, friendId) {
    return bffMap.get(friendId) === 'true' ? 'true' : 'false';
}

/**
 * Adds a visit record if the visitor hasn't visited the target in the last 24 hours.
 * Increments the target user's view count only on the first visit within 24 hours.
 * @param {number} visitorUserId - The ID of the user visiting.
 * @param {number} targetUserId - The ID of the user being visited.
 * @returns {Promise<number>} - The target user's current view count.
 */
async function addProfileView(visitorUserId, targetUserId) {
    let currentViews = 0;
    try {
        // get target's current views first
        const targetUser = await database.getQuery('SELECT views FROM users WHERE id = ?', [targetUserId]);
        if (!targetUser) return 0; // target doesn't exist
        currentViews = targetUser.views;
        // check if visitor has visited target recently
        const twentyFourHoursAgo = clock.getTimestampDaily();
        const recentVisit = await database.getQuery(
            'SELECT 1 FROM logs_rate WHERE user_id = ? AND rate_visit_user_id = ? AND type = "visit" AND date >= ? LIMIT 1',
            [visitorUserId, targetUserId, twentyFourHoursAgo]
        );
        if (!recentVisit) {
            // first visit within 24 hours: log visit and increment count
            pretty.debug(`Logging first visit in 24h from ${visitorUserId} to ${targetUserId}.`);
            const timestamp = clock.getTimestamp();
            // update concurrent views and log the visit in a transaction
            await Promise.all([
                database.runQuery(
                    'INSERT INTO logs_rate (user_id, rate_visit_user_id, type, date) VALUES (?, ?, "visit", ?)',
                    [visitorUserId, targetUserId, timestamp]
                ),
                database.runQuery(
                    'UPDATE users SET views = views + 1 WHERE id = ?',
                    [targetUserId]
                )
            ]);
            currentViews++; // increment the count we already fetched
        } else {
            pretty.debug(`User ${visitorUserId} already visited ${targetUserId} recently. Not incrementing views.`);
        }
        return currentViews; // return the (potentially incremented) view count
    } catch (error) {
        pretty.error(`Error adding profile view from ${visitorUserId} to ${targetUserId}:`, error);
        return currentViews;
    }
}

module.exports = {
    getFriendCount,
    getPendingFriendCount,
    getCommentCount,
    getPendingCommentCount,
    calculateRating,
    logBffNews,
    getUserMood,
    checkBffStatusFromMap,
    addProfileView,
};