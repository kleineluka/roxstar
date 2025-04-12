const xmlbuilder = require('xmlbuilder');
const pretty = require('./pretty.js');

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
 * Sanitize a string to only allow alphanumeric characters
 * @param {*} input - The string to sanitize
 * @returns {string} - The sanitized string
 */
function alphaNumericString(input) {
    return input.replace(/[^a-zA-Z0-9]/g, '');
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
 * @param {*} email - The email address to validate
 * @returns {string} - The email address if valid, 'invalid' if not
 */
function validateEmail(email) {
    // regex to match an email
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return isValid ? email : 'invalid';
}

/**
 * Build an XML response with a status code and text
 * @param {*} code - The status code
 * @param {*} text - The status text
 * @param {*} prettyPrint - Whether to pretty print the XML (default is false)
 * @returns {string} - The XML response string
 */
//const xml_success = xmlbuilder.create('xml').ele('status', { code: '0', text: 'success' }).end({ pretty: true });
function buildXmlResponse(code, text, prettyPrint = false) {
    return xmlbuilder.create('xml')
        .ele('status', { code: code.toString(), text })
        .end({ prettyPrint });
}

/**
 * Calculates the age in years from a Unix timestamp (seconds).
 * @param {number|null} birthTimestamp - The user's birthday as a Unix timestamp in seconds, or null/undefined.
 * @returns {number} - The user's age in years, or 0 if the timestamp is invalid.
 */
function getUserAge(birthTimestamp) {
    if (!birthTimestamp || typeof birthTimestamp !== 'number' || birthTimestamp <= 0) {
        pretty.debug(`getUserAge: Invalid or missing birthTimestamp: ${birthTimestamp}. Returning age 0.`);
        return 0; // assume 0 on invalid input
    }
    try {
        const birthDate = new Date(birthTimestamp * 1000); // convert seconds to milliseconds
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        // adjust age if the birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : 0; // ensure age is not negative.. somehow..
    } catch (error) {
        pretty.error('Error calculating age from timestamp:', error);
        return 0; // assume 0 on error
    }
}

/** Decode base64 string to utf8 string
 * @param {string} base64String - The base64 encoded string to decode.
 * @returns {string} - The decoded utf8 string.
 */
function decodeBase64(base64String) {
    try {
        const buffer = Buffer.from(base64String, 'base64');
        return buffer.toString('utf8');
    } catch (error) {
        pretty.error('Error decoding base64 string:', error);
        return null;
    }
}

module.exports = {
    acceptUrl,
    sanitiseString,
    alphaNumericString,
    getRandomItems,
    getRandomItem,
    validateEmail,
    buildXmlResponse,
    getUserAge,
    decodeBase64,
};