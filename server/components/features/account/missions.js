const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/**
 * Augments a base mission structure (seasons or events) with user-specific completion data.
 * Modifies the base structure *in place* for efficiency, but returns it for convenience.
 * @param {number} userId - The ID of the user.
 * @param {object} baseMissionStructure - The base JSON object (e.g., global.storage_seasons or global.storage_events). Needs deep copy if modification isn't desired.
 * @returns {Promise<object>} - The augmented mission structure.
 */
async function augmentMissionDataWithUserProgress(userId, baseMissionStructure) {
    if (!userId || !baseMissionStructure) {
        pretty.warn('augmentMissionDataWithUserProgress called with invalid userId or base structure.');
        return baseMissionStructure || {};
    }
    try {
        const userProgress = await database.getAllQuery(
            'SELECT mission_uuid, has_collected_epics FROM missions WHERE user_id = ?',
            [userId]
        );
        if (!userProgress || userProgress.length === 0) {
            return baseMissionStructure;
        }
        // create a Set of completed UUIDs and a map for epic status for faster lookups
        const completedUuids = new Set();
        const epicStatusMap = new Map();
        // store epic status, handling potential true/'true'/1 values from db
        userProgress.forEach(record => {
            completedUuids.add(record.mission_uuid);
            epicStatusMap.set(record.mission_uuid, record.has_collected_epics === 'true' || record.has_collected_epics === true || record.has_collected_epics === 1);
        });
        // iterate through it and add base flags
        // this assumes a structure like: { seasonId: { episodes: { episodeId: { missionParts: [ {uuid:...}, ... ] } } } } for seasons
        // or a structure like: { episodeId: { missionParts: [ {uuid:...}, ... ] } } for events
        for (const seasonOrEpisodeId in baseMissionStructure) {
            const seasonOrEpisode = baseMissionStructure[seasonOrEpisodeId];
            const episodes = seasonOrEpisode.episodes || { [seasonOrEpisodeId]: seasonOrEpisode }; // handle both cases
            for (const episodeId in episodes) {
                const episode = episodes[episodeId];
                if (episode && Array.isArray(episode.missionParts)) {
                    for (const missionPart of episode.missionParts) {
                        if (missionPart && missionPart.uuid) {
                            if (completedUuids.has(missionPart.uuid)) {
                                missionPart.played = true; // mark as played
                                // add 'epicsCollected' flag if true in the map
                                if (epicStatusMap.get(missionPart.uuid) === true) {
                                    missionPart.epicsCollected = true;
                                }
                            }
                            // not sure if we need to explicity set false here, but keeping for clarity
                            else {
                                missionPart.played = false;
                                missionPart.epicsCollected = false;
                            }
                        }
                    }
                }
            }
        }
        return baseMissionStructure;
    } catch (error) {
        pretty.error(`Error augmenting mission data for user ID ${userId}:`, error);
        return baseMissionStructure;
    }
}

module.exports = {
    augmentMissionDataWithUserProgress,
};