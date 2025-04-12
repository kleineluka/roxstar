/**
 * Simple censor function that replaces words from the config list.
 * Case-insensitive replacement.
 * @param {string} text - The input text.
 * @param {string[]} censorList - An array of words to censor.
 * @param {string} [replacement='****'] - What to replace censored words with.
 * @returns {{original: string, filtered: string, containsCensored: boolean}} - Result object.
 */
function filterWords(text, censorList, replacement = '****') {
    if (!text || typeof text !== 'string') {
        return { original: text || '', filtered: text || '', containsCensored: false };
    }
    if (!Array.isArray(censorList) || censorList.length === 0) {
        return { original: text, filtered: text, containsCensored: false };
    }
    let filteredText = text;
    let containsCensored = false;
    // build a regex to find any censor words, case-insensitive, as whole words
    // use word boundaries (\b) to avoid censoring parts of words (ex. "cat" in "catalog")
    // escape special regex characters in the words themselves
    const escapedWords = censorList.map(word =>
        word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    );
    // join with '|' for OR, wrap in word boundaries
    const censorRegex = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'gi'); // 'g' for global, 'i' for case-insensitive
    filteredText = text.replace(censorRegex, (match) => {
        containsCensored = true; // flag that we found at least one
        return replacement;
    });
    return {
        original: text,
        filtered: filteredText,
        containsCensored: containsCensored
    };
}

module.exports = {
    filterWords,
}