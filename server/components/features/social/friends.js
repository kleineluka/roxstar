const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');

/**
 * Accepts a friend request.
 * Updates the existing request record to 'friend' and creates the reciprocal record.
 * @param {number} accepterUserId - The ID of the user accepting the request.
 * @param {number} requesterUserId - The ID of the user who sent the request.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function acceptFriendRequest(accepterUserId, requesterUserId) {
    try {
        // update the original request sent by requesterUserId to accepterUserId
        const updateResult = await database.runQuery(
            "UPDATE friends SET status = 'friend' WHERE user_id = ? AND friend_user_id = ? AND status = 'request'",
            [requesterUserId, accepterUserId]
        );
        if (!updateResult || updateResult.changes === 0) {
            pretty.warn(`Accept friend failed: No pending request found from ${requesterUserId} to ${accepterUserId} or already friends/blocked.`);
        }
        // check if the reciprocal relationship already exists (accepter -> requester)
        const existingReciprocal = await database.getQuery(
            "SELECT 1 FROM friends WHERE user_id = ? AND friend_user_id = ?",
            [accepterUserId, requesterUserId]
        );
        if (existingReciprocal) {
            // if it exists, ensure it's set to 'friend' (might be blocked or somehow inconsistent)
            pretty.debug(`Reciprocal friendship from ${accepterUserId} to ${requesterUserId} already exists. Ensuring status is 'friend'.`);
            await database.runQuery(
                "UPDATE friends SET status = 'friend', bff = 'false' WHERE user_id = ? AND friend_user_id = ?", // Reset BFF just in case
                [accepterUserId, requesterUserId]
            );
        } else {
            // create the reciprocal friend relationship (accepter -> requester)
            const timestamp = clock.getTimestamp();
            const insertResult = await database.runQuery(
                `INSERT INTO friends (user_id, friend_user_id, bff, status, message, date)
                 VALUES (?, ?, 'false', 'friend', '', ?)`, // Empty message for accepted request
                [accepterUserId, requesterUserId, timestamp]
            );
            if (!insertResult || insertResult.lastID === 0) {
                pretty.error(`Accept friend failed: Could not insert reciprocal relationship from ${accepterUserId} to ${requesterUserId}.`);
                return false;
            }
        }
        pretty.print(`User ${accepterUserId} accepted friend request from ${requesterUserId}.`, 'ACTION');
        return true;
    } catch (error) {
        pretty.error(`Error accepting friend request from ${requesterUserId} for ${accepterUserId}:`, error);
        return false;
    }
}

/**
 * Deletes a friendship entirely (both directions).
 * @param {number} removerUserId - The ID of the user initiating the removal.
 * @param {number} friendUserId - The ID of the friend being removed.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function deleteFriendship(removerUserId, friendUserId) {
    try {
        // delete both directions of the relationship
        const result1 = await database.runQuery(
            "DELETE FROM friends WHERE user_id = ? AND friend_user_id = ?",
            [removerUserId, friendUserId]
        );
        const result2 = await database.runQuery(
            "DELETE FROM friends WHERE user_id = ? AND friend_user_id = ?",
            [friendUserId, removerUserId]
        );
        // check if at least one deletion occurred (they might have already unfriended)
        if ((result1 && result1.changes > 0) || (result2 && result2.changes > 0)) {
            pretty.print(`Friendship deleted between ${removerUserId} and ${friendUserId}.`, 'ACTION');
            return true;
        } else {
            pretty.warn(`No friendship found to delete between ${removerUserId} and ${friendUserId}.`);
            return true;
        }
    } catch (error) {
        pretty.error(`Error deleting friendship between ${removerUserId} and ${friendUserId}:`, error);
        return false;
    }
}

/**
 * Blocks another user.
 * Updates the remover's record to 'blocked' and deletes the other user's record (if any).
 * @param {number} blockerUserId - The ID of the user initiating the block.
 * @param {number} targetUserId - The ID of the user being blocked.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function blockUser(blockerUserId, targetUserId) {
    try {
        // upsert the block status for the blocker user
        const timestamp = clock.getTimestamp();
        const upsertSql = `
            INSERT INTO friends (user_id, friend_user_id, bff, status, message, date)
            VALUES (?, ?, 'false', 'blocked', '', ?)
            ON CONFLICT(user_id, friend_user_id) DO UPDATE SET
                status = excluded.status,
                bff = excluded.bff,
                message = excluded.message,
                date = excluded.date;
        `;
        const upsertResult = await database.runQuery(upsertSql, [blockerUserId, targetUserId, timestamp]);
        // check result
        if (!upsertResult) {
            pretty.error(`Block user failed during upsert for ${blockerUserId} -> ${targetUserId}.`);
        } else {
            pretty.debug(`Set/Updated block status for ${blockerUserId} -> ${targetUserId}.`);
        }
        // delete any relationship record from the target user pointing to the blocker
        const deleteResult = await database.runQuery(
            "DELETE FROM friends WHERE user_id = ? AND friend_user_id = ?",
            [targetUserId, blockerUserId]
        );
        if (deleteResult && deleteResult.changes > 0) {
            pretty.debug(`Deleted reciprocal relationship after ${blockerUserId} blocked ${targetUserId}.`);
        }
        pretty.print(`User ${blockerUserId} blocked user ${targetUserId}.`, 'ACTION');
        return true;
    } catch (error) {
        pretty.error(`Error blocking user ${targetUserId} by ${blockerUserId}:`, error);
        return false;
    }
}

/**
 * Updates the Best Friends Forever (BFF) list for a user.
 * Clears existing BFFs and sets new ones based on the provided list.
 * @param {number} userId - The ID of the user whose BFF list is being updated.
 * @param {string} bffIdString - A comma-separated string of friend user IDs to set as BFFs.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function updateBffs(userId, bffIdString) {
    const bffIds = (bffIdString || '')
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id) && id > 0);

    try {
        // use a transaction for atomicity
        await database.runQuery('BEGIN TRANSACTION');
        // unset all current BFFs for the user
        await database.runQuery(
            "UPDATE friends SET bff = 'false' WHERE user_id = ? AND status = 'friend'",
            [userId]
        );
        // set new BFFs (only if the list is not empty)
        if (bffIds.length > 0) {
            // ensure the user is actually friends with these IDs before setting BFF
            const setBffResult = await database.runQuery(
                `UPDATE friends SET bff = 'true'
                 WHERE user_id = ? AND status = 'friend' AND friend_user_id IN (${bffIds.map(() => '?').join(',')})`,
                [userId, ...bffIds]
            );
            pretty.debug(`Set ${setBffResult?.changes || 0} users as BFF for user ${userId}.`);
        } else {
            pretty.debug(`Clearing all BFFs for user ${userId}.`);
        }
        // commit the transaction
        await database.runQuery('COMMIT');
        pretty.print(`Updated BFF list for user ${userId}.`, 'ACTION');
        return true;
    } catch (error) {
        pretty.error(`Error updating BFFs for user ${userId}:`, error);
        // Rollback transaction on error
        try { await database.runQuery('ROLLBACK'); } catch (rollbackError) {
            pretty.error(`Failed to rollback BFF update transaction for user ${userId}:`, rollbackError);
        }
        return false;
    }
}

/**
 * Checks the relationship status between two users.
 * @param {number} viewingUserId - The ID of the user viewing the profile.
 * @param {number} targetUserId - The ID of the profile being viewed.
 * @returns {Promise<object>} - An object representing the relationship tag for XML, or empty object.
 */
async function checkFriendshipStatus(viewingUserId, targetUserId) {
    // no need to check if viewing self
    if (viewingUserId === targetUserId) return {};
    try {
        // check relationship in both directions
        const relation = await database.getQuery(
            `SELECT status FROM friends
             WHERE (user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)
             LIMIT 1`,
            [viewingUserId, targetUserId, targetUserId, viewingUserId]
        );
        if (!relation) {
            return {};
        }
        if (relation.status === 'friend') {
            return { relationship: { '@status': 3 } }; // 3 = friends
        } else {
            return {};
        }
    } catch (error) {
        pretty.error(`Error checking friendship status between ${viewingUserId} and ${targetUserId}:`, error);
        return {};
    }
}

module.exports = {
    acceptFriendRequest,
    deleteFriendship,
    blockUser,
    updateBffs,
    checkFriendshipStatus,
};