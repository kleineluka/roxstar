const pretty = require('../../utils/pretty.js');

/**
 * Gets the difficulty multiplier, defaulting if not found.
 * @param {string} difficulty - The difficulty string (e.g., "easy", "medium", "hard").
 * @returns {number} - The multiplier factor.
 */
function getDifficultyMultiplier(difficulty) {
    const defaultMultiplier = global.config_difficulty?.default || 1.0;
    if (!difficulty || !global.config_difficulty) {
        return defaultMultiplier;
    }
    const key = difficulty.toLowerCase(); // use lowercase for case-insensitive matching
    return global.config_difficulty[key] ?? defaultMultiplier; // use provided difficulty or default
}

/**
 * Calculates Rox earned from a minigame score, considering difficulty.
 * @param {number} gameId - The ID of the minigame.
 * @param {number} score - The player's score.
 * @param {string} difficulty - The difficulty level played ("easy", "medium", "hard").
 * @returns {number} - Calculated Rox, respecting limits, score bounds, and difficulty.
 */
function calculateRox(gameId, score, difficulty) {
    const config = global.config_minigames?.[gameId];
    if (!config) {
        pretty.warn(`No reward config found for gameId ${gameId}. Awarding 0 Rox.`);
        return 0;
    }
    if (score < config.minScore || score > config.maxScore) {
        pretty.warn(`Score ${score} for gameId ${gameId} is outside bounds [${config.minScore}-${config.maxScore}]. Awarding 0 Rox.`);
        return 0;
    }
    const multiplier = getDifficultyMultiplier(difficulty);
    pretty.debug(`Calculating Rox for game ${gameId}, score ${score}, difficulty ${difficulty} (Multiplier: ${multiplier})`);
    let rox = Math.round(score * config.roxMulti * multiplier); // apply multiplier *before* rounding and limiting
    rox = Math.min(rox, config.maxRox); // apply limit
    return rox >= 0 ? rox : 0;
}

/**
 * Calculates XP earned from a minigame score, considering difficulty.
 * @param {number} gameId - The ID of the minigame.
 * @param {number} score - The player's score.
 * @param {string} difficulty - The difficulty level played ("easy", "medium", "hard").
 * @returns {number} - Calculated XP, respecting limits, score bounds, and difficulty.
 */
function calculateExp(gameId, score, difficulty) {
    const config = global.config_minigames?.[gameId];
    if (!config) {
        pretty.warn(`No reward config found for gameId ${gameId}. Awarding 0 XP.`);
        return 0;
    }
    if (score < config.minScore || score > config.maxScore) {
        pretty.warn(`Score ${score} for gameId ${gameId} is outside bounds [${config.minScore}-${config.maxScore}]. Awarding 0 XP.`);
        return 0;
    }
    const multiplier = getDifficultyMultiplier(difficulty);
    pretty.debug(`Calculating Exp for game ${gameId}, score ${score}, difficulty ${difficulty} (Multiplier: ${multiplier})`);
    let exp = Math.round(score * config.expMulti * multiplier); // apply multiplier *before* rounding and limiting
    exp = Math.min(exp, config.maxExp); // apply limit
    return exp >= 0 ? exp : 0;
}

module.exports = {
    calculateRox,
    calculateExp,
};