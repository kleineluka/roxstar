const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pretty = require('../../utils/pretty.js');

const cache_dir = path.resolve(__dirname, '../../../../cache');
const manifest_path = path.resolve(cache_dir, 'resources_manifest.json');

/*
 * API endpoint for serving the resource manifest to RoxStar Clients.
 */
router.get('/', (req, res) => {
    if (!global.config_server['resources-manifest']) {
        pretty.debug('Manifest requested but resources-manifest is disabled.');
        return res.status(404).json({ error: 'Resource manifest is not enabled on this server.' });
    }
    if (!fs.existsSync(manifest_path)) {
        pretty.error('Manifest requested but resources_manifest.json is missing from cache.');
        return res.status(503).json({ error: 'Resource manifest is not available.' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(manifest_path);
});

module.exports = router;
