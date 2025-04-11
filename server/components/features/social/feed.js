const pretty = require('../../utils/pretty.js');

/**
 * Parses the raw news value based on the type to create the 'info' object.
 * @param {string} type - The type of the news entry (e.g., 'CaughtMoshling').
 * @param {string} value - The raw value from the database (usually an ID).
 * @returns {object} - The formatted 'info' object for the JSON response.
 */
function parseNewsInfo(type, value) {
    try {
        // attempt to convert value to number if it looks like one, for index access
        const numericValue = /^\d+$/.test(value) ? parseInt(value, 10) : value;
        switch (type) {
            case 'UpdatedMood':
                return { mood: value }; // value is likely the mood ID string/number
            case 'UpdatedFavouriteMusic':
                return { music: value }; // value is likely the music ID string/number
            case 'UpdatedFavouriteFood':
                return { food: value }; // value is likely the food ID string/number
            case 'UpdatedFavouriteMoshling':
                const favMoshling = global.storage_moshlings?.[numericValue]; // value is the moshling srcId
                return { moshling: favMoshling?.name || 'Unknown Moshling' };
            case 'CaughtMoshling':
                const caughtMoshling = global.storage_moshlings?.[numericValue]; // value is the moshling srcId
                return { moshling: caughtMoshling?.name || 'Unknown Moshling' };
            case 'SentGift':
            case 'ReceivedGift': // value is the gift srcId
                const gift = global.storage_gifts?.[numericValue];
                return { gift: gift?.name || 'Unknown Gift' };
            case 'BoughtRoom':
                return { roomNumber: value }; // value is the room number (e.g., '2', '3')
            case 'BoughtHouseStyle':
                const style = global.storage_housestyles?.[numericValue]; // value is the house style ID (e.g., 828)
                return { style: style?.name || 'Unknown Style' };
            case 'achievement':
                return { achievementID: value }; // value is the achievement/medal ID
            case 'LevelledUp':
                return { level: value }; // value is the new level number
            case 'CompletedMission':
                const mission = global.storage_rewards?.[value]; // Use raw string value as key
                return { mission: mission?.name || 'Unknown Mission' };
            default:
                pretty.warn(`Unknown news feed type encountered: ${type}`);
                return { rawValue: value }; // return raw value for unknown types
        }
    } catch (error) {
        pretty.error(`Error parsing news info for type ${type}, value ${value}:`, error);
        return { error: 'Parsing failed' };
    }
}

module.exports = {
    parseNewsInfo,
};