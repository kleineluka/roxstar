const express = require('express');
const router = express.Router();
const database = require('../../components/server/database.js');
const pretty = require('../../components/utils/pretty.js');

/**
 * GET /staff/api/stats
 * Fetches various statistics about the user base and staff logs. Requires an active staff session.
 */
router.get('/', async (req, res) => {
    try {
        const now = Math.floor(Date.now() / 1000);
        const dayAgo = now - 86400;
        const weekAgo = now - 604800;
        const [totalUsers, activeToday, activeWeek, newToday, staffCount, totalLogs] = await Promise.all([
            database.getQuery('SELECT COUNT(*) as count FROM users'),
            database.getQuery('SELECT COUNT(*) as count FROM users WHERE last_active > ?', [dayAgo]),
            database.getQuery('SELECT COUNT(*) as count FROM users WHERE last_active > ?', [weekAgo]),
            database.getQuery('SELECT COUNT(*) as count FROM users WHERE creation_date > ?', [dayAgo]),
            database.getQuery('SELECT COUNT(*) as count FROM users WHERE staff = 1'),
            database.getQuery('SELECT COUNT(*) as count FROM logs_staff'),
        ]);
        res.json({
            totalUsers: totalUsers?.count ?? 0,
            activeToday: activeToday?.count ?? 0,
            activeWeek: activeWeek?.count ?? 0,
            newToday: newToday?.count ?? 0,
            staffCount: staffCount?.count ?? 0,
            totalLogs: totalLogs?.count ?? 0,
        });
    } catch (err) {
        pretty.error('Staff stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

module.exports = router;
