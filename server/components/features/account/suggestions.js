const username = require('./username.js');
const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js');
const config_usernames = require('../../../configs/usernames.json');

/**
 * Generates a list of random usernames based on configured word parts.
 * @param {number} [count] - The number of username suggestions to generate. Defaults to config_server['username-suggestions'].
 * @returns {Promise<string[]>} - A promise that resolves to an array of suggested usernames.
 */
async function generateRandomUsernames(count = config_server['username-suggestions']) {
    if (!config_usernames || Object.keys(config_usernames).length === 0) {
        pretty.error("Username generation failed: config_usernames is missing or empty.");
        return [];
    }
    if (typeof count !== 'number' || count <= 0) {
        pretty.warn(`Invalid count provided (${count}), defaulting to ${config_server['username-suggestions']}`);
        count = config_server['username-suggestions'];
    }
    const categories = Object.keys(config_usernames);
    const suggestions = [];
    let attempts = 0; 
    const maxAttempts = count * 10; // allow 10 attempts per desired suggestion
    pretty.debug(`Attempting to generate ${count} random usernames...`);
    // suggestions length and attempt count
    while (suggestions.length < count && attempts < maxAttempts) {
        attempts++;
        // get three random categories
        const selected_categories = formats.getRandomItems(categories, 3);
        if (selected_categories.length < 3) {
            pretty.warn("Could not select 3 categories for username generation.");
            continue; // skip this attempt
        }
        // from each category, get a random word and capitalize it
        let suggestion = '';
        let possible = true;
        for (const category of selected_categories) {
            const wordList = config_usernames[category];
            if (!wordList || wordList.length === 0) {
                pretty.warn(`Category "${category}" is empty in config_usernames.`);
                possible = false;
                break; // can't form a name with this category set
            }
            let temp_append = formats.getRandomItem(wordList);
            if (!temp_append) {
                pretty.warn(`Could not get random item from category "${category}".`);
                possible = false;
                break;
            }
            // capitalize first letter, keep rest as is
            temp_append = temp_append.charAt(0).toUpperCase() + temp_append.slice(1);
            suggestion += temp_append;
        }
        if (!possible) {
            continue; 
        }
        if (await username.isUsernameAllowed(suggestion, true)) { // skip database validation for this
            if (!suggestions.includes(suggestion)) {
                pretty.debug(`Generated valid suggestion: ${suggestion}`);
                suggestions.push(suggestion);
            } else {
                pretty.debug(`Generated duplicate suggestion, skipping: ${suggestion}`);
            }
        } else {
            pretty.debug(`Generated suggestion "${suggestion}" failed validation, trying again.`);
        }
    } 
    if (suggestions.length < count) {
        pretty.warn(`Could only generate ${suggestions.length} valid usernames after ${maxAttempts} attempts.`);
    }
    pretty.print(`Finished generating ${suggestions.length} random username(s).`, 'ACTION');
    return suggestions;
}

module.exports = {
    generateRandomUsernames,
};