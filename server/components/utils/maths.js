const pretty = require('./pretty.js');

/**
 * Finds the largest threshold value in a sorted array that is less than or equal to the target value.
 * Useful for determining the current tier/level based on a score/XP/view count etc.
 * Assumes thresholds are sorted numerically ascending.
 * @param {number[]} thresholds - Sorted array of threshold values.
 * @param {number} targetValue - The value to compare against the thresholds (e.g., user XP, views).
 * @param {number} [defaultValue=0] - The value to return if no threshold is met (usually the lowest possible threshold).
 * @returns {number} - The highest threshold met or exceeded by the targetValue.
 */
function findClosestThreshold(thresholds, targetValue, defaultValue = 0) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
        pretty.warn('findClosestThreshold called with invalid or empty thresholds array.');
        return defaultValue;
    }
    if (typeof targetValue !== 'number') {
        pretty.warn(`findClosestThreshold called with non-numeric targetValue: ${targetValue}`);
        return defaultValue;
    }
    let closest = defaultValue;
    // ensure the default value is considered if it's the lowest threshold
    if (thresholds.includes(defaultValue)) {
        closest = defaultValue;
    } else if (thresholds.length > 0 && thresholds[0] <= targetValue) {
        // if default isn't in list, but lowest threshold is met, start there
        closest = thresholds[0];
    } else if (thresholds.length > 0 && thresholds[0] > targetValue) {
        // if even the lowest threshold isn't met, return the default
        return defaultValue;
    }
    for (const threshold of thresholds) {
        if (threshold <= targetValue) {
            closest = threshold;
        } else {
            break;
        }
    }
    return closest;
}

/**
 * Finds the smallest threshold value in a sorted array that is strictly greater than the target value.
 * Useful for finding the requirement for the *next* tier/level.
 * Assumes thresholds are sorted numerically ascending.
 * @param {number[]} thresholds - Sorted array of threshold values.
 * @param {number} targetValue - The value to compare against the thresholds (e.g., user XP, views).
 * @returns {number} - The next threshold value, or Infinity if the targetValue meets or exceeds the highest threshold.
 */
function findNextThreshold(thresholds, targetValue) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
        pretty.warn('findNextThreshold called with invalid or empty thresholds array.');
        return Infinity;
    }
    if (typeof targetValue !== 'number') {
        pretty.warn(`findNextThreshold called with non-numeric targetValue: ${targetValue}`);
        return Infinity;
    }
    for (const threshold of thresholds) {
        if (threshold > targetValue) {
            return threshold;
        }
    }
    return Infinity;
}

module.exports = {
    findClosestThreshold,
    findNextThreshold,
};