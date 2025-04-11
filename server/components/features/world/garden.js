// components/features/garden/gardenUtils.js
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const clock = require('../../utils/clock.js');
const formats = require('../../utils/formats.js');

const DEFAULT_GARDEN_STRING = '0~black~-1~0~0~0|1~black~-1~0~0~0|2~black~-1~0~0~0'; // Default: plot~color~seedId~plantTime~priorTime~active

/**
 * Parses the garden string from the database into a structured array.
 * @param {string|null} gardenString - The garden string from the users table.
 * @returns {Array<object>} Array of plot objects: { position, color, seedId, plantTime, priorTime, active }
 */
function parseGardenString(gardenString) {
    const plots = [];
    const defaultPlot = { color: 'black', seedId: -1, plantTime: 0, priorTime: 0, active: 0 };
    const inputString = gardenString || DEFAULT_GARDEN_STRING;
    try {
        const plotStrings = inputString.split('|');
        for (let i = 0; i < 3; i++) { // ensure 3 plots
            if (plotStrings[i]) {
                const parts = plotStrings[i].split('~');
                if (parts.length >= 6) {
                    plots.push({
                        position: parseInt(parts[0], 10),
                        color: parts[1],
                        seedId: parseInt(parts[2], 10),
                        plantTime: parseInt(parts[3], 10),
                        priorTime: parseInt(parts[4], 10),
                        active: parseInt(parts[5], 10) // assuming 'active' is the 6th part
                    });
                } else {
                    plots.push({ position: i, ...defaultPlot }); // malformed, use default
                }
            } else {
                plots.push({ position: i, ...defaultPlot }); // missing, use default
            }
        }
    } catch (error) {
        pretty.error(`Error parsing garden string "${inputString}":`, error);
        // return a default safe state
        return [
            { position: 0, ...defaultPlot },
            { position: 1, ...defaultPlot },
            { position: 2, ...defaultPlot },
        ];
    }
    return plots;
}

/**
 * Gets the configured garden growth time in seconds.
 * @returns {number} Growth time in seconds.
 */
function getGardenGrowthTime() {
    // ensure config_garden and growth_time exist and are numbers
    const growthTime = global.config_garden?.growth_time;
    if (typeof growthTime !== 'number' || growthTime <= 0) {
        pretty.warn(`Invalid or missing garden.growth_time in config. Defaulting to 3600 seconds.`);
        return 3600; // default to 1 hour if config is bad
    }
    return growthTime;
}

/**
 * Calculates the current growth progress of a flower.
 * @param {number} plantTime - Unix timestamp (seconds) when the seed was planted.
 * @returns {number} Progress percentage (0-100).
 */
function calculateFlowerProgress(plantTime) {
    if (!plantTime || plantTime <= 0) return 0;
    const totalTime = getGardenGrowthTime();
    const timeNow = clock.getTimestamp();
    const timeElapsed = timeNow - plantTime;
    if (timeElapsed <= 0) return 0;
    if (timeElapsed >= totalTime) return 100;
    const progress = Math.round((timeElapsed * 100) / totalTime);
    return Math.min(100, Math.max(0, progress)); // clamp between 0-100
}

/**
 * Calculates the growth progress based on the 'priorTime' timestamp.
 * @param {number} plantTime - Unix timestamp (seconds) when the seed was planted.
 * @param {number} priorTime - Unix timestamp (seconds) of the last progress check.
 * @returns {number} Progress percentage (0-100) based on priorTime.
 */
function calculatePriorFlowerProgress(plantTime, priorTime) {
    if (!plantTime || plantTime <= 0 || !priorTime || priorTime <= 0 || priorTime <= plantTime) return 0;
    const totalTime = getGardenGrowthTime();
    const timeElapsed = priorTime - plantTime; // time elapsed until the last check
    if (timeElapsed <= 0) return 0;
    if (timeElapsed >= totalTime) return 100;
    const progress = Math.round((timeElapsed * 100) / totalTime);
    return Math.min(100, Math.max(0, progress)); // clamp between 0-100
}

/**
 * Suggests a random Moshling UUID that can be caught via seeds.
 * @returns {string|null} A suggested Moshling UUID or null if none found.
 */
function suggestMoshlingUUID() {
    if (!global.storage_zoo || !Array.isArray(global.storage_zoo.moshlingSets)) {
        pretty.error("Zoo storage (global.storage_zoo.moshlingSets) not loaded or invalid.");
        return null;
    }
    const seedCatchMoshlings = [];
    for (const set of global.storage_zoo.moshlingSets) {
        if (set.moshlings && Array.isArray(set.moshlings)) {
            for (const moshling of set.moshlings) {
                if (moshling.catchType === 'seed' && moshling.uuid) {
                    seedCatchMoshlings.push(moshling.uuid);
                }
            }
        }
    }
    if (seedCatchMoshlings.length === 0) {
        pretty.warn("No Moshlings with catchType 'seed' found in zoo storage.");
        return null;
    }
    return formats.getRandomItem(seedCatchMoshlings);
}

/**
 * Gets the full data object for a Moshling based on its UUID from zoo storage.
 * @param {string} uuid - The Moshling UUID.
 * @returns {object|null} The Moshling data object from zoo.json or null if not found.
 */
function getMoshlingTargetInfo(uuid) {
    if (!uuid || !global.storage_zoo || !Array.isArray(global.storage_zoo.moshlingSets)) {
        return null;
    }
    for (const set of global.storage_zoo.moshlingSets) {
        if (set.moshlings && Array.isArray(set.moshlings)) {
            const found = set.moshlings.find(m => m.uuid === uuid);
            if (found) return found;
        }
    }
    pretty.warn(`Moshling target info not found for UUID: ${uuid}`);
    return null;
}

/**
 * Formats the data for a Moshling that has just been caught in the garden.
 * Stores the caught Moshling ID in the session.
 * @param {object} req - The Express request object (for session access).
 * @param {number} moshlingSrcId - The srcId of the caught Moshling.
 * @returns {Promise<object|null>} Formatted Moshling data object for XML, or null on error.
 */
async function formatCaughtMoshlingData(req, moshlingSrcId) {
    if (!global.storage_moshlings || !global.storage_moshlings[moshlingSrcId]) {
        pretty.error(`Cannot format caught Moshling: Base data not found for srcId ${moshlingSrcId}.`);
        return null;
    }
    if (!req.session) {
        pretty.error(`Cannot format caught Moshling: Session not available.`);
        return null; // need session to store ID
    }
    const baseMoshling = global.storage_moshlings[moshlingSrcId];
    try {
        // todo: make race condition safe
        const countResult = await database.getQuery("SELECT MAX(id) as max_id FROM moshlings");
        const nextMoshlingInstanceId = (countResult?.max_id || 0) + 1;
        // store the srcId associated with this instance ID in the session
        const sessionKey = `caughtMoshlingId_${nextMoshlingInstanceId}`;
        req.session[sessionKey] = moshlingSrcId;
        req.session.garden_caught = true; // flag that this catch came from the garden
        pretty.debug(`Stored caught Moshling session: ${sessionKey} = ${moshlingSrcId}`);
        return {
            moshling: {
                '@id': nextMoshlingInstanceId,
                '@asset': baseMoshling.asset,
                '@catchType': baseMoshling.catchType || 'unknown',
                '@floating': String(baseMoshling.floating === true || baseMoshling.floating === 'true'),
                '@name': baseMoshling.name,
                '@rank': baseMoshling.rank || 'common',
                '@rarityid': baseMoshling.rarityid || 0,
                '@uuid': baseMoshling.uuid || '',
                '@srcId': moshlingSrcId,
                moshlingjournal: {
                    '@rarity': baseMoshling.moshlingjournal?.rarity || '',
                    biography: baseMoshling.moshlingjournal?.biography || '',
                    habitat: baseMoshling.moshlingjournal?.habitat || '',
                    likes: baseMoshling.moshlingjournal?.likes || '',
                    dislikes: baseMoshling.moshlingjournal?.dislikes || '',
                    species: baseMoshling.moshlingjournal?.species || '',
                    set: baseMoshling.moshlingjournal?.set || ''
                }
            }
        };
    } catch (dbError) {
        pretty.error(`Database error while getting next Moshling ID:`, dbError);
        return null;
    }
}

/**
 * Checks if the current garden state results in catching a Moshling.
 * @param {object} req - The Express request object (for session).
 * @param {Array<object>} parsedGarden - The parsed garden state array.
 * @returns {Promise<object|null>} Formatted caught Moshling data if caught, otherwise null.
 */
async function checkCatchableMoshling(req, parsedGarden) {
    // check if all plots are planted and grown
    let allGrown = true;
    const plantedSeeds = [];
    for (const plot of parsedGarden) {
        if (plot.seedId === -1) {
            allGrown = false; // a plot is empty
            break;
        }
        const progress = calculateFlowerProgress(plot.plantTime);
        if (progress < 100) {
            allGrown = false; // not fully grown
            break;
        }
        // store info needed for matching
        plantedSeeds.push({ seedId: plot.seedId, color: plot.color });
    }
    if (!allGrown || plantedSeeds.length !== 3) {
        pretty.debug("Garden not ready for Moshling check (empty/not grown).");
        return null;
    }
    // get potential catches
    if (!global.storage_zoo || !global.storage_seeds || !global.storage_moshlings) {
        pretty.error("Cannot check Moshling catch: Missing zoo, seeds, or moshlings storage.");
        return null;
    }
    const potentialCatches = [];
    for (const set of global.storage_zoo.moshlingSets) {
        if (set.moshlings && Array.isArray(set.moshlings)) {
            for (const moshling of set.moshlings) {
                if (moshling.catchType === 'seed' && moshling.moshlingRequirements && moshling.moshlingRequirements.length === 3) {
                    // check if this moshling's requirements match the planted seeds (any order)
                    if (checkSeedCombination(plantedSeeds, moshling.moshlingRequirements)) {
                        potentialCatches.push(moshling);
                    }
                }
            }
        }
    }
    if (potentialCatches.length === 0) {
        pretty.debug("No Moshling combination matches the planted seeds.");
        return null;
    }
    // get moshlings the user already owns
    let ownedSrcIds = new Set();
    try {
        const ownedMoshlings = await database.getAllQuery(
            'SELECT DISTINCT srcId FROM moshlings WHERE user_id = ?',
            [userId]
        );
        if (ownedMoshlings) {
            ownedSrcIds = new Set(ownedMoshlings.map(m => m.srcId));
        }
    } catch (dbError) {
        pretty.error(`Failed to get owned moshlings for user ${userId}:`, dbError);
        // proceed?
    }
    // filter potential catches to find unowned ones
    const unownedCatches = potentialCatches.filter(mosh => !ownedSrcIds.has(mosh.srcId));
    let moshlingToCatch;
    if (unownedCatches.length > 0) {
        // if there are unowned catches, sort them by rarity and pick the rarest (lowest rarityid)
        pretty.debug(`User ${userId} has unowned potential catches. Selecting rarest.`);
        unownedCatches.sort((a, b) => (a.rarityid || 999) - (b.rarityid || 999));
        moshlingToCatch = unownedCatches[0];
    } else {
        // if all potential catches are owned, pick a random one from the original list
        pretty.debug(`User ${userId} owns all potential catches. Selecting randomly.`);
        moshlingToCatch = formats.getRandomItem(potentialCatches);
    }
    if (!moshlingToCatch) {
        pretty.error("Moshling selection logic failed unexpectedly."); // should not happen if potentialCatches > 0
        return null;
    }
    pretty.print(`Garden combination matches Moshling: ${moshlingToCatch.name} (srcId: ${moshlingToCatch.srcId})`, 'ACTION');
    return await formatCaughtMoshlingData(req, moshlingToCatch.srcId);
}

/**
 * Helper to check if planted seeds match required seeds in any order.
 * @param {Array<object>} planted - Array of { seedId, color }
 * @param {Array<object>} required - Array of { path, colour, name, uuid }
 * @returns {boolean} True if they match, false otherwise.
 */
function checkSeedCombination(planted, required) {
    if (planted.length !== 3 || required.length !== 3) return false;
    // create lookup maps for easier comparison
    const plantedMap = new Map(); // key: assetPath, value: count
    for (const p of planted) {
        const baseSeed = global.storage_seeds[p.seedId];
        if (!baseSeed) return false; // should not happen if data is consistent
        let assetPath = baseSeed.asset;
        if (p.color && p.color !== 'any' && p.color !== 'black') { // todo: fix checking types for defaults
            assetPath = assetPath.replace('.swf', `_${p.color}.swf`);
        }
        plantedMap.set(assetPath, (plantedMap.get(assetPath) || 0) + 1);
    }
    const requiredMap = new Map(); // key: path, value: count
    for (const r of required) {
        requiredMap.set(r.path, (requiredMap.get(r.path) || 0) + 1);
    }
    // compare maps
    if (plantedMap.size !== requiredMap.size) return false;
    for (const [path, count] of requiredMap) {
        if (plantedMap.get(path) !== count) return false;
    }
    return true;
}

/**
 * Formats the data for a single garden plot for XML output.
 * @param {object} plotState - Parsed state of the plot { position, color, seedId, plantTime, priorTime, active }
 * @param {object|null} targetMoshlingInfo - The target Moshling info object from zoo storage, or null.
 * @returns {object} Formatted plot data object for XML.
 */
function formatPlotData(plotState, targetMoshlingInfo) {
    const plotData = { plot: { '@position': plotState.position } };
    const plotContent = []; // array to hold <flower> or <target>
    // add flower if planted
    if (plotState.seedId !== -1) {
        const baseSeed = global.storage_seeds?.[plotState.seedId];
        if (baseSeed) {
            const progress = calculateFlowerProgress(plotState.plantTime);
            const priorProgress = calculatePriorFlowerProgress(plotState.plantTime, plotState.priorTime);
            // determine head color (only if fully grown)
            const headColor = progress === 100 ? plotState.color : '';
            // determine name (includes head color if fully grown)
            const flowerName = progress === 100 && headColor
                ? `${headColor.charAt(0).toUpperCase() + headColor.slice(1)} ${baseSeed.name}`
                : baseSeed.name;
            plotContent.push({
                flower: {
                    '@currentprogress': progress,
                    '@head': headColor,
                    '@name': flowerName,
                    '@priorprogress': priorProgress,
                    '@seedname': baseSeed.name,
                    '@stalk': baseSeed.asset // stalk uses the base asset path
                }
            });
        } else {
            pretty.warn(`Base seed data not found for planted seedId ${plotState.seedId} in plot ${plotState.position}`);
        }
    }
    // add target seed if target moshling is set
    if (targetMoshlingInfo && targetMoshlingInfo.moshlingRequirements && targetMoshlingInfo.moshlingRequirements[plotState.position]) {
        const requiredSeedInfo = targetMoshlingInfo.moshlingRequirements[plotState.position];
        // find the corresponding base seed in storage_seeds to get its ID and store info
        let targetSeedId = -1;
        let storeInfo = {};
        // iterate through storage_seeds to find the base seed matching the required asset path (ignoring color initially)
        for (const seedId in global.storage_seeds) {
            const baseSeed = global.storage_seeds[seedId];
            // construct potential colored path from requirement
            let reqPathWithColor = requiredSeedInfo.path; // path might already include color
            let reqPathBase = reqPathWithColor.replace(/_(red|blue|yellow|black|pink|purple)\.swf$/, '.swf'); // get base path
            if (baseSeed.asset === reqPathBase) { // match base asset path
                targetSeedId = seedId;
                storeInfo = {
                    '@id': seedId, // sase seed ID for buying
                    '@level': baseSeed.level || 1,
                    '@membersOnly': String(baseSeed.subscription === true || baseSeed.subscription === 'true'),
                    '@price': baseSeed.rocks || 0
                };
                break; // found the base seed
            }
        }
        plotContent.push({
            target: {
                '@asset': requiredSeedInfo.path,
                '@colour': requiredSeedInfo.colour,
                '@id': targetSeedId,
                '@isMatch': 'false', 
                '@name': requiredSeedInfo.name,
                '@uuid': requiredSeedInfo.uuid,
                storeInfo: storeInfo
            }
        });
    }
    // add the content (flower and/or target) to the plot object
    if (plotContent.length > 0) {
        // merge content into plotData.plot instead of nesting under 'content' key
        plotContent.forEach(contentItem => {
            const key = Object.keys(contentItem)[0]; // 'flower' or 'target'
            // if key already exists (e.g., multiple targets?), handle appropriately (e.g., make it an array)
            if (plotData.plot[key]) {
                if (!Array.isArray(plotData.plot[key])) {
                    plotData.plot[key] = [plotData.plot[key]]; // convert to array
                }
                plotData.plot[key].push(contentItem[key]);
            } else {
                plotData.plot[key] = contentItem[key];
            }
        });
    }
    return plotData;
}

/**
 * Updates the priorTime field in the garden string for all planted seeds.
 * @param {number} userId - The ID of the user.
 * @param {string} currentGardenString - The current garden string from the database.
 * @returns {Promise<void>}
 */
async function updateGardenPriorTime(userId, currentGardenString) {
    const timestamp = clock.getTimestamp();
    const plots = parseGardenString(currentGardenString);
    let needsUpdate = false;
    for (const plot of plots) {
        if (plot.seedId !== -1) { // only update if a seed is planted
            plot.priorTime = timestamp;
            needsUpdate = true;
        }
    }
    if (needsUpdate) {
        // reconstruct the string
        const updatedGardenString = plots.map(p =>
            `${p.position}~${p.color}~${p.seedId}~${p.plantTime}~${p.priorTime}~${p.active}`
        ).join('|');
        try {
            await database.runQuery('UPDATE users SET garden = ? WHERE id = ?', [updatedGardenString, userId]);
            pretty.debug(`Updated garden priorTime for user ${userId}.`);
        } catch (error) {
            pretty.error(`Failed to update garden priorTime for user ${userId}:`, error);
        }
    }
}

module.exports = {
    parseGardenString,
    calculateFlowerProgress,
    calculatePriorFlowerProgress,
    suggestMoshlingUUID,
    getMoshlingTargetInfo,
    checkCatchableMoshling,
    formatPlotData,
    updateGardenPriorTime,
};