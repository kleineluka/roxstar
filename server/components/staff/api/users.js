const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const { logStaff } = require('../utils/log.js');

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
        await logStaff(req.session.staffUsername, 'ban', `User ID ${id} was banned`, 2);
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
        await logStaff(req.session.staffUsername, 'unban', `User ID ${id} was unbanned`, 2);
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
        await logStaff(req.session.staffUsername, 'set_staff', `User ID ${id} staff status set to ${value}`, 2);
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
        await logStaff(req.session.staffUsername, 'set_rocks', `User ID ${id} rocks adjusted to ${amount}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set rocks error:', err);
        res.status(500).json({ error: 'Failed to update rocks.' });
    }
});
/**
 * POST /staff/api/users/:id/level
 * Sets a user's level to a specified value (1-999). Requires an active staff session.
 */
router.post('/:id/level', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { level } = req.body;
    if (typeof level !== 'number' || level < 1 || level > 999) return res.status(400).json({ error: 'Invalid level (1-999).' });
    try {
        await database.runQuery('UPDATE users SET level = ? WHERE id = ?', [level, id]);
        await logStaff(req.session.staffUsername, 'set_level', `User ID ${id} level set to ${level}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set level error:', err);
        res.status(500).json({ error: 'Failed to update level.' });
    }
});
/**
 * POST /staff/api/users/:id/happiness
 * Sets a user's happiness value (0-1000). Requires an active staff session.
 */
router.post('/:id/happiness', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { happiness } = req.body;
    if (typeof happiness !== 'number' || happiness < 0 || happiness > 1000) return res.status(400).json({ error: 'Invalid happiness (0-1000).' });
    try {
        await database.runQuery('UPDATE users SET happiness = ? WHERE id = ?', [happiness, id]);
        await logStaff(req.session.staffUsername, 'set_happiness', `User ID ${id} happiness set to ${happiness}`, 0);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set happiness error:', err);
        res.status(500).json({ error: 'Failed to update happiness.' });
    }
});
/**
 * POST /staff/api/users/:id/health
 * Sets a user's health value (0-1000). Requires an active staff session.
 */
router.post('/:id/health', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { health } = req.body;
    if (typeof health !== 'number' || health < 0 || health > 1000) return res.status(400).json({ error: 'Invalid health (0-1000).' });
    try {
        await database.runQuery('UPDATE users SET health = ? WHERE id = ?', [health, id]);
        await logStaff(req.session.staffUsername, 'set_health', `User ID ${id} health set to ${health}`, 0);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set health error:', err);
        res.status(500).json({ error: 'Failed to update health.' });
    }
});
/**
 * POST /staff/api/users/:id/monstername
 * Updates a user's monster name. Requires an active staff session.
 */
router.post('/:id/monstername', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { monster_name } = req.body;
    if (typeof monster_name !== 'string' || !monster_name.trim() || monster_name.length > 30) return res.status(400).json({ error: 'Invalid monster name.' });
    try {
        await database.runQuery('UPDATE users SET monster_name = ? WHERE id = ?', [monster_name.trim(), id]);
        await logStaff(req.session.staffUsername, 'set_monster_name', `User ID ${id} monster name changed to "${monster_name.trim()}"`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set monster name error:', err);
        res.status(500).json({ error: 'Failed to update monster name.' });
    }
});
/**
 * POST /staff/api/users/:id/housestyle
 * Updates a user's house style preference. Requires an active staff session.
 */
router.post('/:id/housestyle', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { house_style } = req.body;
    if (typeof house_style !== 'string' || !house_style.trim()) return res.status(400).json({ error: 'Invalid house style.' });
    try {
        await database.runQuery('UPDATE users SET house_style = ? WHERE id = ?', [house_style.trim(), id]);
        await logStaff(req.session.staffUsername, 'set_house_style', `User ID ${id} house style set to "${house_style.trim()}"`, 0);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set house style error:', err);
        res.status(500).json({ error: 'Failed to update house style.' });
    }
});
/**
 * POST /staff/api/users/:id/garden
 * Updates a user's garden state string. Requires an active staff session.
 */
router.post('/:id/garden', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    const { garden } = req.body;
    if (typeof garden !== 'string') return res.status(400).json({ error: 'Invalid garden data.' });
    try {
        await database.runQuery('UPDATE users SET garden = ? WHERE id = ?', [garden, id]);
        await logStaff(req.session.staffUsername, 'set_garden', `User ID ${id} garden string updated`, 0);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff set garden error:', err);
        res.status(500).json({ error: 'Failed to update garden.' });
    }
});
/**
 * GET /staff/api/users/:id/profile
 * Fetches a user's complete profile data including inventory, moshlings, rooms, and social data.
 */
router.get('/:id/profile', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID.' });
    try {
        const [user, moshlings, rooms, allItems, clothes, dressup, seeds, friendRow, messages] = await Promise.all([
            database.getQuery(
                'SELECT id, username, monster_name, email, staff, activation_status, rocks, level, happiness, health, gender, country, house_style, garden, creation_date, last_active, register_ip, last_ip, monster, primary_colour, secondary_colour FROM users WHERE id = ?',
                [id]
            ),
            database.getAllQuery('SELECT * FROM moshlings WHERE user_id = ? ORDER BY date DESC', [id]),
            database.getAllQuery('SELECT * FROM rooms WHERE user_id = ? ORDER BY id ASC', [id]),
            database.getAllQuery('SELECT * FROM items WHERE user_id = ? ORDER BY room_id ASC, z ASC', [id]),
            database.getAllQuery('SELECT * FROM clothes WHERE user_id = ? ORDER BY date DESC', [id]),
            database.getAllQuery('SELECT * FROM dressup WHERE user_id = ? ORDER BY layer ASC', [id]),
            database.getAllQuery('SELECT * FROM seeds WHERE user_id = ? ORDER BY date DESC', [id]),
            database.getQuery("SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND status = 'accepted'", [id]),
            database.getAllQuery(
                `SELECT mb.id, mb.sender, mb.receiver, mb.message, mb.status, mb.date,
                        s.username AS sender_name, r.username AS receiver_name
                 FROM message_board mb
                 LEFT JOIN users s ON s.id = mb.sender
                 LEFT JOIN users r ON r.id = mb.receiver
                 WHERE mb.receiver = ? ORDER BY mb.date DESC LIMIT 15`,
                [id]
            ),
        ]);

        if (!user) return res.status(404).json({ error: 'User not found.' });

        function resolveName(storage, itemId) {
            return storage?.[itemId]?.name ?? null;
        }

        const itemsByRoom = {};
        for (const item of (allItems ?? [])) {
            if (!itemsByRoom[item.room_id]) itemsByRoom[item.room_id] = [];
            itemsByRoom[item.room_id].push({ ...item, name: resolveName(global.storage_items, item.item_id) });
        }

        res.json({
            user,
            moshlings: (moshlings ?? []).map(m => ({ ...m, name: resolveName(global.storage_moshlings, m.srcId) })),
            rooms: (rooms ?? []).map(r => ({ ...r, items: itemsByRoom[r.id] ?? [] })),
            clothes: (clothes ?? []).map(c => ({ ...c, name: resolveName(global.storage_clothes, c.item_id) })),
            dressup: (dressup ?? []).map(d => ({ ...d, name: resolveName(global.storage_clothes, d.item_id) })),
            seeds: (seeds ?? []).map(s => ({ ...s, name: resolveName(global.storage_seeds, s.item_id) })),
            friends: { total: friendRow?.count ?? 0 },
            messages: messages ?? [],
        });
    } catch (err) {
        pretty.error('Staff profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});
/**
 * DELETE /staff/api/users/:id/moshlings/:moshId
 * Removes a moshling from a user's collection. Requires an active staff session.
 */
router.delete('/:id/moshlings/:moshId', async (req, res) => {
    const id = parseInt(req.params.id);
    const moshId = parseInt(req.params.moshId);
    if (isNaN(id) || isNaN(moshId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        await database.runQuery('DELETE FROM moshlings WHERE id = ? AND user_id = ?', [moshId, id]);
        await logStaff(req.session.staffUsername, 'remove_moshling', `Moshling row ${moshId} removed from user ${id}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff remove moshling error:', err);
        res.status(500).json({ error: 'Failed to remove moshling.' });
    }
});
/**
 * DELETE /staff/api/users/:id/items/:itemId
 * Removes an item from a user's room. Requires an active staff session.
 */
router.delete('/:id/items/:itemId', async (req, res) => {
    const id = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    if (isNaN(id) || isNaN(itemId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        await database.runQuery('DELETE FROM items WHERE id = ? AND user_id = ?', [itemId, id]);
        await logStaff(req.session.staffUsername, 'remove_item', `Room item row ${itemId} removed from user ${id}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff remove item error:', err);
        res.status(500).json({ error: 'Failed to remove item.' });
    }
});
/**
 * DELETE /staff/api/users/:id/clothes/:clotheId
 * Removes a clothing item from a user's inventory. Requires an active staff session.
 */
router.delete('/:id/clothes/:clotheId', async (req, res) => {
    const id = parseInt(req.params.id);
    const clotheId = parseInt(req.params.clotheId);
    if (isNaN(id) || isNaN(clotheId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        await database.runQuery('DELETE FROM clothes WHERE id = ? AND user_id = ?', [clotheId, id]);
        await logStaff(req.session.staffUsername, 'remove_clothes', `Clothing item row ${clotheId} removed from user ${id}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff remove clothing error:', err);
        res.status(500).json({ error: 'Failed to remove clothing item.' });
    }
});
/**
 * DELETE /staff/api/users/:id/dressup/:dressId
 * Removes a currently worn item from a user. Requires an active staff session.
 */
router.delete('/:id/dressup/:dressId', async (req, res) => {
    const id = parseInt(req.params.id);
    const dressId = parseInt(req.params.dressId);
    if (isNaN(id) || isNaN(dressId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        await database.runQuery('DELETE FROM dressup WHERE id = ? AND user_id = ?', [dressId, id]);
        await logStaff(req.session.staffUsername, 'remove_dressup', `Dressup item row ${dressId} removed from user ${id}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff remove dressup error:', err);
        res.status(500).json({ error: 'Failed to remove dressup item.' });
    }
});
/**
 * DELETE /staff/api/users/:id/seeds/:seedId
 * Removes a seed from a user's inventory. Requires an active staff session.
 */
router.delete('/:id/seeds/:seedId', async (req, res) => {
    const id = parseInt(req.params.id);
    const seedId = parseInt(req.params.seedId);
    if (isNaN(id) || isNaN(seedId)) return res.status(400).json({ error: 'Invalid ID.' });
    try {
        await database.runQuery('DELETE FROM seeds WHERE id = ? AND user_id = ?', [seedId, id]);
        await logStaff(req.session.staffUsername, 'remove_seed', `Seed row ${seedId} removed from user ${id}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff remove seed error:', err);
        res.status(500).json({ error: 'Failed to remove seed.' });
    }
});

module.exports = router;
