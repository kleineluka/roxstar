const database = require('../../server/database.js');
const clock = require('../../utils/clock.js');
const pretty = require('../../utils/pretty.js');

/**
 * Gets the number of rooms a user owns.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<number>} - The number of rooms the user has.
 */
async function getRoomCount(userId) {
    try {
        const row = await database.getQuery("SELECT COUNT(*) AS count FROM rooms WHERE user_id = ?", [userId]);
        return row?.count || 0;
    } catch (error) {
        pretty.error(`Error getting room count for user ID ${userId}:`, error);
        throw error; 
    }
}

/**
 * Determines the availability and cost of the user's next room upgrade.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} - An object describing the next room status.
 */
async function getNextRoomStatus(userId) {
    try {
        const priceArray = global.config_rooms?.prices || {};
        const currentRoomCount = await getRoomCount(userId);
        const nextRoomIndex = currentRoomCount + 1;
        if (priceArray.hasOwnProperty(nextRoomIndex)) {
            pretty.debug(`User ${userId} has ${currentRoomCount} rooms. Next room ${nextRoomIndex} costs ${priceArray[nextRoomIndex]}.`);
            return {
                "@isNextRoomAvailable": true,
                "@nextAvailableRoom": nextRoomIndex, 
                "@cost": priceArray[nextRoomIndex]
            };
        } else {
            pretty.debug(`User ${userId} has ${currentRoomCount} rooms. No further rooms available in config.`);
            return { "@isNextRoomAvailable": false };
        }
    } catch (error) {
        pretty.error(`Error getting next room status for user ID ${userId}:`, error);
        return { "@isNextRoomAvailable": false };
    }
}

/**
 * Creates a new room record for a user.
 * @param {number} userId - The ID of the user to give the room to.
 * @returns {Promise<number|null>} - The ID of the newly created room row, or null on failure.
 */
async function giveRoom(userId) {
    try {
        const timestamp = clock.getTimestamp(); 
        const sql = "INSERT INTO rooms (user_id, date) VALUES (?, ?)";
        const result = await database.runQuery(sql, [userId, timestamp]);
        if (result && result.lastID > 0) {
            pretty.debug(`Successfully created room with ID ${result.lastID} for user ID ${userId}.`);
            return result.lastID;
        } else {
            pretty.warn(`Failed to create room for user ID ${userId}. runQuery result: ${JSON.stringify(result)}`);
            return null;
        }
    } catch (error) {
        pretty.error(`Error giving room to user ID ${userId}:`, error);
        return null;
    }
}

/**
 * Populates a user's first room with starter items.
 * @param {number} userId - The ID of the user.
 * @param {number} roomId - The ID of the room to add items to.
 * @param {object} starterConfig - The starter configuration object (e.g., global.config_starter).
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function giveStarterHouse(userId, roomId, starterConfig) {
    if (!starterConfig || !starterConfig.house || starterConfig.house.length === 0) {
        pretty.warn(`No starter house items found in config for user ID ${userId}.`);
        return true; 
    }
    if (!roomId) {
        pretty.error(`Cannot give starter house: Invalid roomId (${roomId}) provided for user ID ${userId}.`);
        return false;
    }
    let success = true;
    const timestamp = clock.getTimestamp(); 
    try {
        for (const startingItem of starterConfig.house) {
            pretty.debug(`Adding starter item ${startingItem.itemId} to room ${roomId} for user ${userId}`);
            const sql = `
                INSERT INTO items (user_id, item_id, room_id, x, y, z, date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                userId,
                startingItem.itemId,
                roomId,
                startingItem.x || '0',
                startingItem.y || '0',
                startingItem.z || '0', 
                timestamp
            ];
            const result = await database.runQuery(sql, params);
            if (!result || result.changes === 0) {
                pretty.warn(`Failed to insert starter item ${startingItem.itemId} for user ID ${userId} into room ${roomId}.`);
                success = false;
            }
        }
        if (success) {
            pretty.print(`Successfully added starter items to room ${roomId} for user ${userId}.`, 'ACTION');
        } else {
            pretty.warn(`Finished adding starter items for user ${userId} to room ${roomId}, but some items failed to insert.`);
        }
        return success;

    } catch (error) {
        pretty.error(`Error giving starter house items to user ID ${userId}, room ID ${roomId}:`, error);
        return false;
    }
}


/**
 * Formats item data fetched from the database using global storage details.
 * (This function does not query the database itself).
 * @param {Array<object>} roomItemsData - Array of item rows fetched from the 'items' table.
 * @returns {Array<object>} - Array of formatted item objects for client/XML use.
 */
function formatRoomItems(roomItemsData) {
    if (!roomItemsData || roomItemsData.length === 0) {
        return [];
    }
    if (!global_storage.items) {
        pretty.error("Cannot format room items: global.global_storage.items is not loaded.");
        return [];
    }
    const itemdata = [];
    for (const room_item of roomItemsData) {
        const item_id = room_item.item_id;
        const baseItem = global_storage.items[item_id];

        if (!baseItem) {
            pretty.warn(`Could not find base item details in global_storage.items for item_id: ${item_id}. Skipping item row ID ${room_item.id}.`);
            continue;
        }
        // combine database row data (position, instance id) with base item data (name, asset, etc.)
        itemdata.push({
            "@name": baseItem.name,
            "@description": baseItem.description,
            "@asset": baseItem.asset,
            "@id": room_item.id,
            "@srcId": item_id,
            "@state": baseItem.state,
            "@type": baseItem.type,
            "@typeStatus": baseItem.typeStatus,
            "@rocks": baseItem.rocks,
            "@roomId": room_item.room_id,
            "@x": room_item.x,
            "@y": room_item.y,
            "@z": room_item.z,
            "@tiled": baseItem.tiled,
            "@structureId": baseItem.structureId,
            "@layer": baseItem.layer,
            "@animated": baseItem.animated,
            "@replacedefault": baseItem.replacedefault,
            "@handler": baseItem.handler,
            "@args": baseItem.args,
            "@health": baseItem.health,
            "@happiness": baseItem.happiness
        });
    }
    return itemdata;
}

/**
 * Formats room data fetched from the database.
 * (This function does not query the database itself).
 * @param {Array<object>} userRoomData - Array of room rows fetched from the 'rooms' table for a user.
 * @returns {Array<object>} - Array of formatted room objects for client/XML use.
 */
function formatUserHouseData(userRoomData) { // Renamed, removed async
    if (!userRoomData || userRoomData.length === 0) {
        return [];
    }
    // The original function hardcoded location and name. Adapt if needed.
    return userRoomData.map(room_data => ({
        "@id": room_data.id, // The unique ID of the room row
        "@location": 1, // Seems hardcoded, maybe related to a zone?
        "@name": "Default monster room" // Seems hardcoded
        // Add other fields from room_data if necessary
    }));
}

// --- Exports ---
module.exports = {
    getRoomCount,
    getNextRoomStatus,
    giveRoom,
    giveStarterHouse,
    formatRoomItems, 
    formatUserHouseData,
};