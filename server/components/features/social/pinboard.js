const pretty = require('../../utils/pretty.js');
const formatUtils = require('../../utils/formats.js');
const monsterUtils = require('../account/monster.js');

/**
 * Formats messages and sender details for the Pinboard XML response.
 * @param {Array<object>} messages - Array of message rows from the message_board table.
 * @param {Map<number, object>} senderDetailsMap - A Map where key is sender ID and value is the sender's user data object.
 * @returns {Array<object>} - An array of formatted message objects ready for XML.
 */
function formatPinboardMessages(messages, senderDetailsMap) {
    if (!messages || messages.length === 0) {
        return [];
    }
    const formattedMessages = [];
    for (const message of messages) {
        const sender = senderDetailsMap.get(message.sender);
        if (!sender) {
            pretty.warn(`Sender details not found for message ID ${message.id}, sender ID ${message.sender}. Skipping message.`);
            continue; // skip message if sender details are missing
        }
        formattedMessages.push({
            message: {
                '@colour': message.colour,
                '@id': message.id,
                '@sentdate': message.date * 1000, // convert to milliseconds
                '@status': message.status,
                '@watermark': message.watermark,
                body: message.message || '', // ensure body exists, default to empty string
                user: {
                    '@id': sender.id,
                    '@age': formatUtils.getUserAge(sender.birthday),
                    '@gender': sender.gender,
                    '@username': sender.username,
                    '@country': sender.country || '',
                },
                monster: {
                    '@name': sender.monster_name,
                    '@type': sender.monster,
                    '@primarycolour': sender.primary_colour,
                    '@secondarycolour': sender.secondary_colour,
                    ...monsterUtils.getUserColoramaData(sender.colorama),
                    '@b': 'true'
                }
            }
        });
    }
    return formattedMessages;
}

module.exports = {
    formatPinboardMessages,
};