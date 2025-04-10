const pretty = require('../../utils/pretty.js');
const maths = require('../../utils/maths.js');

/**
 * Gets the user's current level based on their XP.
 * @param {number} userXp - The user's total experience points.
 * @returns {number} - The user's current level number.
 */
function getUserLevel(userXp) {
    if (!global.config_levels || Object.keys(global.config_levels).length === 0) {
        pretty.error("Levels configuration (global.config_levels) not found or empty.");
        return 1; // default to level 1 on error
    }
    if (typeof userXp !== 'number' || userXp < 0) {
        pretty.warn(`Invalid userXp provided (${userXp}), defaulting level to 1.`);
        return 1;
    }
    try {
        const thresholds = Object.keys(global.config_levels).map(Number).sort((a, b) => a - b);
        const currentLevelThreshold = maths.findClosestThreshold(thresholds, userXp);
        return global.config_levels[currentLevelThreshold] || 1;
    } catch (error) {
        pretty.error("Error calculating user level:", error);
        return 1; // default to level 1 on error
    }
}

/**
 * Calculates the user's progress towards the next level as a percentage.
 * @param {number} userXp - The user's total experience points.
 * @returns {number} - The percentage progress (0-100).
 */
function getUserLevelProgress(userXp) {
    if (!global.config_levels || Object.keys(global.config_levels).length === 0) {
        pretty.error("Levels configuration (global.config_levels) not found or empty.");
        return 0; // default to 0% progress on error
    }
    if (typeof userXp !== 'number' || userXp < 0) {
        pretty.warn(`Invalid userXp provided (${userXp}), defaulting progress to 0.`);
        return 0;
    }
    try {
        const thresholds = Object.keys(global.config_levels).map(Number).sort((a, b) => a - b);
        const currentLevelThreshold = maths.findClosestThreshold(thresholds, userXp);
        // find threshold *after* the current one
        const nextLevelThreshold = maths.findNextThreshold(thresholds, currentLevelThreshold);
        // handle max level or thresholds being identical (shouldn't happen with distinct levels)
        if (nextLevelThreshold === Infinity || nextLevelThreshold <= currentLevelThreshold) {
            // if at max, return 100%
            const maxThreshold = thresholds[thresholds.length - 1];
            if (userXp >= maxThreshold) return 100;
            if (currentLevelThreshold < maxThreshold) {
                const progress = 100 * (userXp - currentLevelThreshold) / (maxThreshold - currentLevelThreshold);
                return Math.min(100, Math.max(0, Math.round(progress)));
            }
            return 100; // default to 100 if at the final defined threshold
        }
        const xpInCurrentLevel = userXp - currentLevelThreshold;
        const xpNeededForLevel = nextLevelThreshold - currentLevelThreshold;
        if (xpNeededForLevel <= 0) {
            // avoid division by zero - implies thresholds are wrong or userXP is exactly on threshold
            return (userXp >= nextLevelThreshold) ? 100 : 0;
        }
        const percentage = 100 * (xpInCurrentLevel / xpNeededForLevel);
        return Math.min(100, Math.max(0, Math.round(percentage)));
    } catch (error) {
        pretty.error("Error calculating user level progress:", error);
        return 0; // default to 0% progress on error
    }
}

module.exports = {
    getUserLevel,
    getUserLevelProgress,
};