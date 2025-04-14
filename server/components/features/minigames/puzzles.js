const crypto = require('crypto');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');

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

/**
 * Calculates the user's average score for a specific puzzle.
 * @param {number} userId - The ID of the user.
 * @param {number} puzzleId - The ID of the puzzle.
 * @returns {Promise<number>} - The user's average score (rounded), or 0 if no scores exist.
 */
async function getPuzzleAverage(userId, puzzleId) {
    if (typeof userId !== 'number' || typeof puzzleId !== 'number') return 0;
    try {
        // table 'logs_puzzle', columns 'user_id', 'puzzle_id', 'correct_answers'
        const row = await database.getQuery(
            'SELECT AVG(correct_answers) as average FROM logs_puzzle WHERE user_id = ? AND puzzle_id = ?',
            [userId, puzzleId]
        );
        // avg returns null here, round it to 0
        return row?.average ? Math.round(row.average) : 0;
    } catch (error) {
        pretty.error(`Error getting puzzle average for user ${userId}, puzzle ${puzzleId}:`, error);
        return 0;
    }
}

/**
 * Checks if the user has played a specific puzzle type within the last 24 hours.
 * @param {number} userId - The ID of the user.
 * @param {number} puzzleId - The ID of the puzzle.
 * @returns {Promise<boolean>} - True if played today, false otherwise.
 */
async function hasPlayedPuzzleToday(userId, puzzleId) {
    if (typeof userId !== 'number' || typeof puzzleId !== 'number') return false;
    try {
        const twentyFourHoursAgo = clock.getTimestampDaily(); // get timestamp for 24 hours ago
        // check if any log entry exists for this user/puzzle since that time
        const row = await database.getQuery(
            'SELECT 1 FROM logs_puzzle WHERE user_id = ? AND puzzle_id = ? AND date >= ? LIMIT 1',
            [userId, puzzleId, twentyFourHoursAgo]
        );
        return !!row; // return true if a row was found, false otherwise
    } catch (error) {
        pretty.error(`Error checking if puzzle ${puzzleId} played today for user ${userId}:`, error);
        return false; // assume not played on error
    }
}

/**
 * Fetches a random selection of puzzles, optionally filtered by type.
 * @param {number} userId - The ID of the user (used for checksum).
 * @param {number} count - The number of puzzles to fetch.
 * @param {string} [puzzleType=null] - Optional: Filter puzzles by this type name.
 * @returns {Promise<Array<object>>} - An array of formatted puzzle objects for XML.
 */
async function getRandomPuzzles(userId, count, puzzleType = null) {
    const formattedPuzzles = [];
    try {
        let puzzles;
        let sql = 'SELECT * FROM puzzles';
        const params = [];
        // add type filter if provided
        if (puzzleType) {
            sql += ' WHERE type = ?';
            params.push(puzzleType);
        }
        // add random order and limit
        sql += ' ORDER BY RANDOM() LIMIT ?';
        params.push(count);
        puzzles = await database.getAllQuery(sql, params);
        if (!puzzles || puzzles.length === 0) {
            pretty.warn(`Could not find enough puzzles${puzzleType ? ` of type ${puzzleType}` : ''}. Found: ${puzzles?.length || 0}`);
            return []; // return empty if no puzzles found
        }
        // format the fetched puzzles
        for (const puzzle of puzzles) {
            let answers = [];
            try {
                const parsedAnswers = JSON.parse(puzzle.answers || '[]');
                if (Array.isArray(parsedAnswers)) {
                    answers = parsedAnswers.map(ans => ({
                        answer: {
                            '@id': ans.answerId,
                            '@puzzleId': ans.puzzleId,
                            '@text': ans.answerText
                        }
                    }));
                }
            } catch (e) {
                pretty.warn(`Failed to parse answers for puzzle ID ${puzzle.id}: ${puzzle.answers}`);
            }
            const checksum = crypto.createHash('md5').update(String(userId) + String(puzzle.answer)).digest('hex');
            formattedPuzzles.push({
                puzzle: {
                    '@checksum': checksum,
                    '@difficulty': puzzle.difficulty,
                    '@filename': puzzle.filename,
                    '@id': puzzle.id,
                    '@text': puzzle.question,
                    '@type': puzzle.type
                },
                answers: answers // array of { answer: {...} } objects
            });
        }
    } catch (error) {
        pretty.error(`Error fetching random puzzles:`, error);
    }
    return formattedPuzzles;
}

module.exports = {
    getPuzzleHighscore,
    getPuzzleAverage,
    hasPlayedPuzzleToday,
    getRandomPuzzles,
};