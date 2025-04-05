/**
 * Returns the current timestamp in seconds.
 */
function get_timestamp() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Returns the timestamp for 24 hours ago in seconds.
 */
function get_timestamp_daily() {
    return Math.floor(Date.now() / 1000) - (24 * 3600);
}

/**
 * Converts a timestamp in seconds to a human-readable format.
 * @param {string} string - The timestamp in seconds.
 * @returns {string} - The formatted date string.
 */
function get_unix(string) {
    const timestamp = string * 1000;
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return formattedDate;
}

module.exports = {
    get_timestamp,
    get_timestamp_daily,
    get_unix
};