const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Gets the highest score a user has achieved for a specific puzzle.
 * @param {number} userId - The ID of the user.
 * @param {number} puzzleId - The ID of the puzzle (e.g., 100 for the Daily Challenge).
 * @returns {Promise<number>} - The user's highest score for that puzzle, or 0 if no score exists.
 */
async function getPuzzleHighscore(userId, puzzleId) {
    if (typeof userId !== 'number' || typeof puzzleId !== 'number') {
        pretty.warn(`getPuzzleHighscore called with invalid IDs: userId=${userId}, puzzleId=${puzzleId}`);
        return 0;
    }
    try {
        const sql = `
            SELECT correct_answers
            FROM logs_puzzle
            WHERE user_id = ? AND puzzle_id = ?
            ORDER BY correct_answers DESC
            LIMIT 1
        `;
        const params = [userId, puzzleId];
        const row = await database.getQuery(sql, params);
        // if getQuery returns a row, use its score, otherwise default to 0
        return row?.correct_answers || 0;
    } catch (error) {
        pretty.error(`Error getting puzzle highscore for user ID ${userId}, puzzle ID ${puzzleId}:`, error);
        return 0; // return 0 on error
    }
}

module.exports = {
    getPuzzleHighscore,
};