/**
 * Accept URls with or without .html extension
 * @param {*} name - The name of the URL to accept
 * @returns {string} - The regex pattern to match the URL
 */
function accept_url(name) {
    return `/${name}(.html)?`;
}

/**
 * Sanitize a string by removing unwanted characters
 * @param {*} input - The string to sanitize
 * @returns {string} - The sanitized string
 */
function sanitize_string(input) {
    return input.replace(/[^a-zA-Z0-9 !?#\-+*$%,"=()\'&]/g, '');
}

module.exports = {
    accept_url,
    sanitize_string
};