const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');

/**
 * Handles GET requests to fetch Moshling details by UUID.
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
    if (!global.storage_moshlings) {
        pretty.error("Moshling storage (global.storage_moshlings) not loaded.");
        return res.status(500).json({ error: "Server configuration error" });
    }
    let foundMoshlingData = null;
    // todo: index at startup
    for (const moshlingId in global.storage_moshlings) {
        const moshlingData = global.storage_moshlings[moshlingId];
        if (moshlingData.uuid === moshlingUuid) {
            // foundMoshlingData = { ...moshlingData, srcId: parseInt(moshlingId, 10) }; // unsure if client needs srcId
            foundMoshlingData = moshlingData;
            break;
        }
    }
    // send the moshling back
    if (foundMoshlingData) {
        pretty.debug(`Found Moshling bio for UUID: ${moshlingUuid}`);
        res.json(foundMoshlingData);
    } else {
        pretty.warn(`Moshling bio not found for UUID: ${moshlingUuid}`);
        res.status(404).json({ error: "Moshling not found" });
    }
});

module.exports = router;