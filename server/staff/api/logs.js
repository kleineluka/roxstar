const express = require('express');
const router = express.Router();
const database = require('../../components/server/database.js');
const pretty = require('../../components/utils/pretty.js');

/**
 * GET /staff/api/logs
 * Fetches a paginated list of staff logs, optionally filtered by admin username (partial match). 
 */
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;
        const admin = req.query.admin ? `%${req.query.admin}%` : null;
        let countQuery = 'SELECT COUNT(*) as count FROM logs_staff';
        let listQuery = 'SELECT id, admin, payload, date FROM logs_staff';
        let params = [];
        if (admin) {
            countQuery += ' WHERE admin LIKE ?';
            listQuery += ' WHERE admin LIKE ?';
            params = [admin];
        }
        listQuery += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        const [total, logs] = await Promise.all([
            database.getQuery(countQuery, params),
            database.getAllQuery(listQuery, [...params, limit, offset]),
        ]);
        res.json({
            total: total?.count ?? 0,
            page,
            limit,
            logs: logs ?? [],
        });
    } catch (err) {
        pretty.error('Staff logs error:', err);
        res.status(500).json({ error: 'Failed to fetch logs.' });
    }
});

module.exports = router;
