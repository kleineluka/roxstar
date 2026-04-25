const express = require('express');
const os = require('os');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const database = require('../../server/database.js');
const pkg = require('../../../package.json');

/*
 * API endpoint for updating the health page of the server.
 * Currently returns:
 * status: 'ok' if the server is running and can access the database, 'error' otherwise
 * server_name: The name of the server from the configuration
 * server_version: The version of the server from package.json
 * debug: The debug status of the server from the configuration
 * environment: The final URL of the server from the configuration
 * uptime_seconds: The uptime of the server in seconds
 * memory: An object containing memory usage information (rss, heapUsed, heapTotal) in MB
 * database: An object containing the status of the database connection and its size in MB
 * os: An object containing information about the operating system (platform, hostname, arch)
 * node_version: The version of Node.js the server is running on
 * timestamp: The current timestamp in ISO format
 */
router.get('/', async (req, res) => {
    const mem = process.memoryUsage();
    let db_status = 'ok';
    try {
        await database.getQuery('SELECT 1');
    } catch {
        db_status = 'error';
    }
    const db_path = path.resolve(__dirname, '../../../../', global.config_server['database']);
    let db_size_mb = null;
    try {
        db_size_mb = (fs.statSync(db_path).size / 1024 / 1024).toFixed(2);
    } catch { /* file unreadable */ }
    res.json({
        status: 'ok',
        server_name: global.config_server['name'],
        server_version: pkg.version,
        debug: global.config_server['debug'],
        environment: global.config_server['final-url'],
        uptime_seconds: Math.floor(process.uptime()),
        memory: {
            rss_mb: (mem.rss / 1024 / 1024).toFixed(2),
            heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(2),
            heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(2),
        },
        database: {
            status: db_status,
            size_mb: db_size_mb,
        },
        os: {
            platform: os.platform(),
            hostname: os.hostname(),
            arch: os.arch(),
        },
        node_version: process.version,
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
