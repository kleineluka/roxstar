const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

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

module.exports = {
    getFriendCount,
    getPendingFriendCount,
    getCommentCount,
    getPendingCommentCount,
    calculateRating,
    logBffNews,
};