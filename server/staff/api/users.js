const express = require('express');
const router = express.Router();
const database = require('../../components/server/database.js');
const pretty = require('../../components/utils/pretty.js');

/**
 * Logs a staff action to the database.
 */
async function logAction(adminUsername, action, targetId, detail) {
    const payload = JSON.stringify({ action, targetId, detail });
    await database.runQuery(
        'INSERT INTO logs_staff (admin, payload) VALUES (?, ?)',
        [adminUsername, payload]
    );
}

/**
 * GET /staff/api/users
 * Fetches a paginated list of users, optionally filtered by a search term that matches 
 * username, email, or monster name. Requires an active staff session.
 */
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;
        const search = req.query.search ? `%${req.query.search}%` : null;
        let countQuery = 'SELECT COUNT(*) as count FROM users';
        let listQuery = 'SELECT id, username, monster_name, email, staff, activation_status, rocks, level, creation_date, last_active FROM users';
        let params = [];
        if (search) {
            countQuery += ' WHERE username LIKE ? OR email LIKE ? OR monster_name LIKE ?';
            listQuery += ' WHERE username LIKE ? OR email LIKE ? OR monster_name LIKE ?';
            params = [search, search, search];
        }
        listQuery += ' ORDER BY creation_date DESC LIMIT ? OFFSET ?';
        const [total, users] = await Promise.all([
            database.getQuery(countQuery, params),
            database.getAllQuery(listQuery, [...params, limit, offset]),
        ]);
        res.json({
            total: total?.count ?? 0,
            page,
            limit,
            users: users ?? [],
        });
    } catch (err) {
        pretty.error('Staff users list error:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

/**
 * GET /staff/api/users/:id
 * Fetches detailed information about a specific user by ID. Requires an active staff session.
 */
router.get('/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    try {
        const user = await database.getQuery(
            'SELECT id, username, monster_name, email, staff, activation_status, rocks, level, gender, country, creation_date, last_active, register_ip, last_ip FROM users WHERE id = ?',
            [id]
        );
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        pretty.error('Staff get user error:', err);
        res.status(500).json({ error: 'Failed to fetch user.' });
    }
});

/**
 * POST /staff/api/users/:id/ban
 * Bans a user by setting their activation_status to 'banned'. Requires an active staff session.
 */
router.post('/:id/ban', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    try {
        await database.runQuery('UPDATE users SET activation_status = ? WHERE id = ?', ['banned', id]);
        await logAction(req.session.staffUsername, 'ban', id, null);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff ban error:', err);
        res.status(500).json({ error: 'Failed to ban user.' });
    }
});

/**
 * POST /staff/api/users/:id/unban
 * Unbans a user by setting their activation_status to 'Member'. Requires an active staff session.
 */
router.post('/:id/unban', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    try {
        await database.runQuery('UPDATE users SET activation_status = ? WHERE id = ?', ['Member', id]);
        await logAction(req.session.staffUsername, 'unban', id, null);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff unban error:', err);
        res.status(500).json({ error: 'Failed to unban user.' });
    }
});

/**
 * POST /staff/api/users/:id/staff
 * Toggles a user's staff status. Requires an active staff session.
 */
router.post('/:id/staff', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { value } = req.body;
    if (value !== 0 && value !== 1) return res.status(400).json({ error: 'Value must be 0 or 1.' });
    try {
        await database.runQuery('UPDATE users SET staff = ? WHERE id = ?', [value, id]);
        await logAction(req.session.staffUsername, 'set_staff', id, value);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff toggle error:', err);
        res.status(500).json({ error: 'Failed to update staff status.' });
    }
});

/**
 * POST /staff/api/users/:id/rocks
 * Sets a user's rocks to a specific amount. Requires an active staff session.
 */
router.post('/:id/rocks', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount < 0) return res.status(400).json({ error: 'Invalid rocks amount.' });
    try {
        await database.runQuery('UPDATE users SET rocks = ? WHERE id = ?', [amount, id]);
        await logAction(req.session.staffUsername, 'set_rocks', id, amount);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set rocks error:', err);
        res.status(500).json({ error: 'Failed to update rocks.' });
    }
});

module.exports = router;
