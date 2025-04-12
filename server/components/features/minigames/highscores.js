const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Gets the user's highest score for a specific minigame.
 * @param {number} userId - The ID of the user.
 * @param {number} gameId - The ID of the minigame.
 * @returns {Promise<number>} - The highest score, or 0 if none found.
 */
async function getMinigameHighscore(userId, gameId) {
    if (typeof userId !== 'number' || typeof gameId !== 'number') return 0;
    try {
        const row = await database.getQuery(
            'SELECT score FROM minigames_highscores WHERE user_id = ? AND gameid = ? ORDER BY score DESC LIMIT 1',
            [userId, gameId]
        );
        return row?.score || 0;
    } catch (error) {
        pretty.error(`Error getting highscore for user ${userId}, game ${gameId}:`, error);
        return 0;
    }
}

/**
 * Checks if the current score is a new highscore for the user and game.
 * @param {number} userId - The ID of the user.
 * @param {number} gameId - The ID of the minigame.
 * @param {number} currentScore - The score just achieved.
 * @returns {Promise<boolean>} - True if it's a new highscore, false otherwise.
 */
async function isNewHighscore(userId, gameId, currentScore) {
    if (typeof currentScore !== 'number') return false;
    const highscore = await getMinigameHighscore(userId, gameId);
    return currentScore > highscore;
}

/**
 * Logs a minigame score to the database.
 * @param {number} userId - The user's ID.
 * @param {number} gameId - The game's ID.
 * @param {number} score - The score achieved.
 * @param {string} sessionHash - The MD5 hash of the session data from the start request.
 * @returns {Promise<boolean>} - True if insertion was successful, false otherwise.
 */
async function logMinigameScore(userId, gameId, score, sessionHash) {
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const result = await database.runQuery(
            'INSERT INTO minigames_highscores (user_id, gameid, score, hash, date) VALUES (?, ?, ?, ?, ?)',
            [userId, gameId, score, sessionHash, timestamp]
        );
        return result && result.lastID > 0;
    } catch (error) {
        pretty.error(`Error logging score for user ${userId}, game ${gameId}:`, error);
        return false;
    }
}

module.exports = {
    getMinigameHighscore,
    isNewHighscore,
    logMinigameScore,
};