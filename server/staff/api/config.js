const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pretty = require('../../components/utils/pretty.js');
const database = require('../../components/server/database.js');

const CONFIGS_DIR = path.resolve(__dirname, '../../configs');

/**
 * Logs a staff action to the database for auditing purposes.
 */
async function logAction(adminUsername, action, targetId, detail) {
    const payload = JSON.stringify({ action, targetId, detail });
    await database.runQuery(
        'INSERT INTO logs_staff (admin, payload) VALUES (?, ?)',
        [adminUsername, payload]
    );
}

/**
 * Safely resolves a config file path from a given name, preventing directory traversal.
 */
function safeConfigPath(name) {
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) return null;
    const resolved = path.resolve(CONFIGS_DIR, `${name}.json`);
    if (!resolved.startsWith(CONFIGS_DIR + path.sep) && resolved !== CONFIGS_DIR) return null;
    return resolved;
}

/**
 * GET /staff/api/config
 * Returns a list of all config file names (without extension).
 */
router.get('/', (req, res) => {
    try {
        const files = fs.readdirSync(CONFIGS_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace(/\.json$/, ''))
            .sort();
        res.json({ configs: files });
    } catch (err) {
        pretty.error('Staff config list error:', err);
        res.status(500).json({ error: 'Failed to list configs.' });
    }
});

/**
 * GET /staff/api/config/:name
 * Returns the parsed contents of a specific config file.
 */
router.get('/:name', (req, res) => {
    const filePath = safeConfigPath(req.params.name);
    if (!filePath) return res.status(400).json({ error: 'Invalid config name.' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Config not found.' });
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        res.json({ name: req.params.name, content: parsed });
    } catch (err) {
        pretty.error('Staff config read error:', err);
        res.status(500).json({ error: 'Failed to read config.' });
    }
});

/**
 * PUT /staff/api/config/:name
 * Writes new JSON content to a specific config file.
 */
router.put('/:name', async (req, res) => {
    const filePath = safeConfigPath(req.params.name);
    if (!filePath) return res.status(400).json({ error: 'Invalid config name.' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Config not found.' });
    const { content } = req.body;
    if (content === undefined || content === null) {
        return res.status(400).json({ error: 'Missing content.' });
    }
    let serialized;
    try {
        if (typeof content !== 'object') {
            JSON.parse(content);
            serialized = content;
        } else {
            serialized = JSON.stringify(content, null, 4);
        }
    } catch {
        return res.status(400).json({ error: 'Invalid JSON content.' });
    }
    try {
        fs.writeFileSync(filePath, serialized, 'utf8');
        await logAction(req.session.staffUsername, 'edit_config', req.params.name, null);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff config write error:', err);
        res.status(500).json({ error: 'Failed to save config.' });
    }
});

module.exports = router;
