/**
 * Accept URls with or without .html extension
 * @param {*} name - The name of the URL to accept
 * @returns {string} - The regex pattern to match the URL
 */
function acceptUrl(name) {
    return `/${name}(.html)?`;
}

/**
 * Sanitize a string by removing unwanted characters
 * @param {*} input - The string to sanitize
 * @returns {string} - The sanitized string
 */
function sanitiseString(input) {
    return input.replace(/[^a-zA-Z0-9 !?#\-+*$%,"=()\'&]/g, '');
}

/**
 * Return a number of random items from an array
 * @param {*} arr - The array to get items from
 * @param {*} num - The number of items to get (default is 1)
 * @returns {Array} - The array of random items 
 */
function getRandomItems(arr, num = 1) {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

/**
 * Return a single random item from an array. (to avoid not returning an array)
 * @param {*} arr - The array to get the item from
 * @returns {*} - The random item from the array
 */
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Validate an email address using regex
 */
function validate_email(email) {
    // regex to match an email
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return isValid ? email : 'invalid';
}

module.exports = {
    acceptUrl,
    sanitiseString,
    getRandomItems,
    getRandomItem,
};