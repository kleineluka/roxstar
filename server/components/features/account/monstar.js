const pretty = require('../../utils/pretty.js');
const maths = require('../../utils/maths.js');

/**
 * Gets the user's Monstar rank based on their view count.
 * @param {number} userViews - The user's total view count.
 * @returns {string} - The user's Monstar rank letter (e.g., "Z", "Y", "A"), or "Z" if invalid.
 */
function getUserMonstar(userViews) {
    const defaultRank = "Z"; // default rank if config is missing or views are low/invalid
    if (!global.config_monstar || Object.keys(global.config_monstar).length === 0) {
        pretty.error("Monstar configuration (global.config_monstar) not found or empty.");
        return defaultRank;
    }
    if (typeof userViews !== 'number' || userViews < 0) {
        pretty.warn(`Invalid userViews provided (${userViews}), defaulting rank to ${defaultRank}.`);
        return defaultRank;
    }
    try {
        const thresholds = Object.keys(global.config_monstar).map(Number).sort((a, b) => a - b);
        const currentRankThreshold = maths.findClosestThreshold(thresholds, userViews, 0);
        return global.config_monstar[currentRankThreshold] || defaultRank;
    } catch (error) {
        pretty.error("Error calculating user monstar rank:", error);
        return defaultRank; // default rank on error
    }
}

module.exports = {
    getUserMonstar,
};