const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const profileUtils = require('../../features/account/profile.js');
const socialUtils = require('../../features/account/socials.js');

/**
 * Handles POST requests to update user profile favorites.
 * Expects XML body like: <updates favouriteColour="1" currentMood="2" ... />
 * Mounted at: /moshi/services/rest/user/profile
 * Actual path tested: /update (relative to mount point)
 */
router.post('/update', async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        pretty.warn('Profile update request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    let updates = null;
    const updatesArray = req.body?.updateProfile?.updates;
    if (Array.isArray(updatesArray) && updatesArray.length > 0) {
        updates = updatesArray[0]?.$;
        if (updatesArray.length > 1) {
            pretty.warn(`Profile update request contained multiple <updates> elements inside the array. Processing only the first one.`);
        }
    } else if (typeof updatesArray === 'object' && updatesArray !== null && !Array.isArray(updatesArray)) {
        updates = updatesArray.$;
        pretty.debug("Profile update 'updates' field was an object, not an array.");
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        pretty.warn(`Profile update request for user ${userId} received empty or invalid XML attributes. Body: ${JSON.stringify(req.body)}`);
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        return res.type('text/xml').send(successXml);
    }
    try {
        const user = await database.getQuery('SELECT profile FROM users WHERE id = ?', [userId]);
        if (!user) {
            pretty.error(`User ${userId} not found during profile update.`);
            return res.status(404).type('text/xml').send('<error code="USER_NOT_FOUND">User not found</error>');
        }
        let profileArray = [0, 0, 0, 0, 0]; // default [colour, mood, music, food, moshling]
        try {
            if (user.profile) {
                const parsed = JSON.parse(user.profile);
                if (Array.isArray(parsed) && parsed.length >= 5) {
                    profileArray = parsed;
                } else {
                    pretty.warn(`User ${userId} has invalid profile format: ${user.profile}. Using default.`);
                }
            }
        } catch (parseError) {
            pretty.warn(`Failed to parse profile JSON for user ${userId}: ${user.profile}. Using default.`);
        }
        // apply updates, checking if each attribute exists in the request
        // convert incoming attributes (which are strings) to numbers where appropriate
        let changed = false;
        const bffLogs = []; // in case of multiple updates, easier to log all together
        if (updates.favouriteColour !== undefined) {
            const newValue = parseInt(updates.favouriteColour, 10);
            if (!isNaN(newValue) && profileArray[0] !== newValue) {
                profileArray[0] = newValue;
                changed = true;
                // todo: not updated in bffNews?
            }
        }
        if (updates.currentMood !== undefined) {
            const newValue = parseInt(updates.currentMood, 10);
            if (!isNaN(newValue) && profileArray[1] !== newValue) {
                profileArray[1] = newValue;
                changed = true;
                bffLogs.push({ type: 'UpdatedMood', value: newValue });
            }
        }
        if (updates.favouriteMusic !== undefined) {
            const newValue = parseInt(updates.favouriteMusic, 10);
            if (!isNaN(newValue) && profileArray[2] !== newValue) {
                profileArray[2] = newValue;
                changed = true;
                bffLogs.push({ type: 'UpdatedFavouriteMusic', value: newValue });
            }
        }
        if (updates.favouriteFood !== undefined) {
            const newValue = parseInt(updates.favouriteFood, 10);
            if (!isNaN(newValue) && profileArray[3] !== newValue) {
                profileArray[3] = newValue;
                changed = true;
                bffLogs.push({ type: 'UpdatedFavouriteFood', value: newValue });
            }
        }
        if (updates.favouriteMoshling !== undefined) {
            const newValue = parseInt(updates.favouriteMoshling, 10);
            if (!isNaN(newValue) && profileArray[4] !== newValue) {
                profileArray[4] = newValue;
                changed = true;
                bffLogs.push({ type: 'UpdatedFavouriteMoshling', value: newValue });
            }
        }
        // save in database if changed
        if (changed) {
            const updatedProfileJson = JSON.stringify(profileArray);
            const updateResult = await database.runQuery(
                'UPDATE users SET profile = ? WHERE id = ?',
                [updatedProfileJson, userId]
            );
            if (updateResult && updateResult.changes > 0) {
                pretty.print(`Updated profile for user ${userId}. New data: ${updatedProfileJson}`, 'ACTION');
                for (const log of bffLogs) {
                    await socialUtils.logBffNews(userId, log.type, log.value);
                }
            } else {
                pretty.error(`Failed to update profile for user ID ${userId}.`);
                const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Database update failed' } } }).end();
                return res.status(500).type('text/xml').send(xmlError);
            }
        } else {
            pretty.debug(`Profile update request for user ${userId} contained no actual changes.`);
        }
        const successXml = xmlbuilder.create({ xml: { status: { '@code': 0, '@text': 'success' } } }).end();
        res.type('text/xml').send(successXml);
    } catch (error) {
        pretty.error(`Error processing profile update request for user ID ${userId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

/**
 * Handles GET requests to fetch user profile data.
 * Mounted at: /moshi/services/rest/user/profile
 * Actual path tested: /<userId> (relative to mount point)
 * Example: /moshi/services/rest/user/profile/12345
 * or /moshi/services/rest/user/profile/inroomownprofile
 */
router.get('/:userId', async (req, res) => {
    const loggedInUserId = req.session.userId;
    const userIdParam = req.params.userId;
    let targetUserId;
    if (userIdParam === 'inroomownprofile') {
        targetUserId = loggedInUserId;
        pretty.debug(`Profile request routing via param check for own profile (user ID: ${loggedInUserId}).`);
    } else {
        // assume it's a numeric ID for another user
        const requestedId = parseInt(userIdParam, 10);
        if (!isNaN(requestedId)) {
            targetUserId = requestedId;
            pretty.debug(`Profile request routing via param check for specific ID: ${targetUserId}`);
        } else {
            // invalid parameter that wasn't "inroomownprofile"
            pretty.warn(`Invalid user ID in profile route parameter: ${userIdParam}`);
            const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Invalid User ID Parameter' } } }).end();
            return res.status(400).type('text/xml').send(xmlError);
        }
    }
    if (!loggedInUserId) {
        pretty.warn('Profile request without user session.');
        return res.status(401).type('text/xml').send('<error code="AUTH_FAILED">Not logged in</error>');
    }
    if (!targetUserId) {
        pretty.error('Could not determine target user ID for profile request.');
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Invalid Request' } } }).end();
        return res.status(400).type('text/xml').send(xmlError);
    }
    if (targetUserId === null || isNaN(targetUserId)) {
        pretty.error('sendUserProfileResponse called with invalid targetUserId.');
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Invalid Request' } } }).end();
        return res.status(400).type('text/xml').send(xmlError);
    }
    try {
        const profileData = await profileUtils.getUserProfileData(targetUserId);
        if (!profileData) {
            pretty.debug(`Profile data not found or user banned for target ID: ${targetUserId}`);
            const notFoundResponse = { status: { '@code': 1, '@text': 'User not found or unavailable' } };
            const xml = xmlbuilder.create({ xml: notFoundResponse }).end({ pretty: global.config_server['pretty-print-replies'] });
            return res.status(404).type('text/xml').send(xml);
        }
        const responseData = {
            status: { '@code': 0, '@text': 'success' },
            ...profileData // spread the { profile: { ... } } structure
        };
        const xml = xmlbuilder.create({ xml: responseData }, { encoding: 'UTF-8', standalone: true })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.type('text/xml').send(xml);
    } catch (error) {
        pretty.error(`Error processing profile request for target user ID ${targetUserId}:`, error);
        const xmlError = xmlbuilder.create({ xml: { status: { '@code': 1, '@text': 'Internal Server Error' } } })
            .end({ pretty: global.config_server['pretty-print-replies'] });
        res.status(500).type('text/xml').send(xmlError);
    }
});

module.exports = router;