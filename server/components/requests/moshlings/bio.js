const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to fetch Moshling details by UUID.
 * This finds the moshling in the zoo data to get its srcId, then uses that
 * to fetch the full bio from the main moshling storage.
 */
router.get('/:uuid', (req, res) => {
    const loggedInUserId = req.session.userId;
    const moshlingUuid = req.params.uuid;

    if (!loggedInUserId) {
        pretty.warn('Moshling bio request without user session.');
        return res.status(401).json({ error: "Not logged in" });
    }
    if (!moshlingUuid) {
        pretty.warn('Moshling bio request missing UUID parameter.');
        return res.status(400).json({ error: "Missing Moshling UUID" });
    }
    if (!global.storage_zoo || !Array.isArray(global.storage_zoo.moshlingSets) || !global.storage_moshlings) {
        pretty.error("Required storage files (zoo.json or moshlings.json) not loaded.");
        return res.status(500).json({ error: "Server configuration error" });
    }
    // first, find moshling via uuid in zoo
    let foundMoshlingInZoo = null;
    for (const set of global.storage_zoo.moshlingSets) {
        if (set.moshlings && Array.isArray(set.moshlings)) {
            const found = set.moshlings.find(m => m.uuid === moshlingUuid);
            if (found) {
                foundMoshlingInZoo = found;
                break;
            }
        }
    }
    if (!foundMoshlingInZoo || !foundMoshlingInZoo.srcId) {
        pretty.warn(`Moshling bio lookup failed: Could not find UUID ${moshlingUuid} in zoo data.`);
        return res.status(404).json({ error: "Moshling not found in zoo" });
    }
    // now get it from the moshlings.json file
    const moshlingSrcId = foundMoshlingInZoo.srcId;
    const fullMoshlingData = global.storage_moshlings[moshlingSrcId];
    if (fullMoshlingData) {
        pretty.debug(`Found Moshling bio for UUID ${moshlingUuid} (srcId: ${moshlingSrcId})`);
        // the client expects the data from moshlings.json, not zoo.json
        // todo: combine into one json internally
        res.json(fullMoshlingData);
    } else {
        pretty.warn(`Moshling bio lookup failed: Found UUID ${moshlingUuid} with srcId ${moshlingSrcId}, but no matching entry in moshlings.json.`);
        res.status(404).json({ error: "Moshling bio data not found" });
    }
});

module.exports = router;