const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Gets various gift counts for the user's room dynamic data.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} Object containing gift counts.
 */
async function getRoomGiftCounts(userId) {
    const counts = {
        giftsCount: 0,
        hasUnopenedGift: 'false', // default to string 'false' for XML
        mysteryGiftsSentToday: 0,
        mysteryGiftsUnopenedCount: 0,
        missionsGiftWrapped: 'false', // hardcoded for now
        hasUnopenedWelcomeGift: 'false' // hardcoded for now
    };
    try {
        const [
            openedGiftCount,
            unopenedGiftCount,
            mysterySentCount,
            mysteryUnopenedCount
        ] = await Promise.all([
            // count opened gifts
            database.getQuery("SELECT COUNT(*) AS count FROM gifts WHERE reciever = ? AND status = 'active' AND has_opened = 1", [userId]),
            // check for any unopened gifts
            database.getQuery("SELECT COUNT(*) AS count FROM gifts WHERE reciever = ? AND status = 'active' AND has_opened = 0", [userId]),
            // count mystery gifts sent today
            database.getQuery("SELECT COUNT(*) AS count FROM mystery_gifts WHERE sender = ? AND date >= ?", [userId, Math.floor(Date.now() / 1000) - 86400]),
            // count unopened mystery gifts
            database.getQuery("SELECT COUNT(*) AS count FROM mystery_gifts WHERE reciever = ? AND has_opened = 0", [userId])
        ]);
        counts.giftsCount = (openedGiftCount?.count || 0) + (unopenedGiftCount?.count || 0); // total active gifts
        counts.hasUnopenedGift = (unopenedGiftCount?.count || 0) > 0 ? 'true' : 'false';
        counts.mysteryGiftsSentToday = mysterySentCount?.count || 0;
        counts.mysteryGiftsUnopenedCount = mysteryUnopenedCount?.count || 0;
    } catch (error) {
        pretty.error(`Error fetching gift counts for user ID ${userId}:`, error);
        // return default count on error..
    }
    return counts;
}

/**
 * Gets the number of gifts a user has received (opened).
 * TODO: Move this to a more appropriate util file like features/account/gifts.js if created.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<number>} - The count of opened gifts.
 */
async function getOpenedGiftCount(userId) {
    try {
        const row = await database.getQuery(
            "SELECT COUNTy (*) AS count FROM gifts WHERE reciever = ? AND has_opened = 1",
            [userId]
        );
        return row?.count || 0;
    } catch (error) {
        pretty.error(`Error getting opened gift count for user ID ${userId}:`, error);
        return 0;
    }
}

module.exports = {
    getRoomGiftCounts,
    getOpenedGiftCount,
};