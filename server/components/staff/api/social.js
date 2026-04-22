const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const formats = require('../../utils/formats.js');
const { logStaff } = require('../utils/log.js');

/**
 * GET /staff/api/social/pinboard
 * Fetches a paginated list of pinboard messages, optionally filtered by status or sender/receiver username.
 */
router.get('/pinboard', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;
        const status = req.query.status || null;
        const search = req.query.search ? `%${req.query.search}%` : null;

        const where = [];
        const params = [];

        if (status && status !== 'all') {
            where.push('mb.status = ?');
            params.push(status);
        }
        if (search) {
            where.push('(s.username LIKE ? OR r.username LIKE ?)');
            params.push(search, search);
        }

        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const baseFrom = `
            FROM message_board mb
            LEFT JOIN users s ON s.id = mb.sender
            LEFT JOIN users r ON r.id = mb.receiver
            ${whereClause}
        `;

        const [total, rows] = await Promise.all([
            database.getQuery(`SELECT COUNT(*) as count ${baseFrom}`, params),
            database.getAllQuery(
                `SELECT mb.id, mb.sender, mb.receiver, mb.message, mb.status, mb.reported,
                        mb.watermark, mb.colour, mb.date,
                        s.username AS sender_name, r.username AS receiver_name
                 ${baseFrom}
                 ORDER BY mb.date DESC LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            ),
        ]);

        const messages = (rows ?? []).map(m => ({
            ...m,
            message: formats.decodeBase64(m.message) || m.message,
        }));

        res.json({ total: total?.count ?? 0, page, limit, messages });
    } catch (err) {
        pretty.error('Staff pinboard list error:', err);
        res.status(500).json({ error: 'Failed to fetch pinboard messages.' });
    }
});

/**
 * PUT /staff/api/social/pinboard/:id
 * Updates the message text of a specific pinboard message.
 */
router.put('/pinboard/:id', express.json(), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid message ID.' });
    const { message } = req.body;
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message text is required.' });
    try {
        const encoded = formats.encodeBase64(message.trim());
        await database.runQuery('UPDATE message_board SET message = ? WHERE id = ?', [encoded, id]);
        await logStaff(req.session.staffUsername, 'edit_pinboard', `Pinboard message ID ${id} edited`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff pinboard edit error:', err);
        res.status(500).json({ error: 'Failed to edit message.' });
    }
});

/**
 * DELETE /staff/api/social/pinboard/:id
 * Marks a pinboard message as deleted without removing it from the database.
 */
router.delete('/pinboard/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid message ID.' });
    try {
        await database.runQuery("UPDATE message_board SET status = 'deleted' WHERE id = ?", [id]);
        await logStaff(req.session.staffUsername, 'delete_pinboard', `Pinboard message ID ${id} marked deleted by staff`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff pinboard delete error:', err);
        res.status(500).json({ error: 'Failed to delete message.' });
    }
});

/**
 * POST /staff/api/social/pinboard/:id/approve
 * Approves a pinboard message by setting its status to 'accepted' and clearing any reports.
 */
router.post('/pinboard/:id/approve', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid message ID.' });
    try {
        await database.runQuery("UPDATE message_board SET status = 'accepted', reported = NULL WHERE id = ?", [id]);
        await logStaff(req.session.staffUsername, 'approve_pinboard', `Pinboard message ID ${id} approved by staff`, 0);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff pinboard approve error:', err);
        res.status(500).json({ error: 'Failed to approve message.' });
    }
});

/**
 * POST /staff/api/social/pinboard
 * Creates a new pinboard message on behalf of a user. Both sender and receiver must be specified.
 */
router.post('/pinboard', express.json(), async (req, res) => {
    const senderRaw = parseInt(req.body?.sender_id);
    const receiverRaw = parseInt(req.body?.receiver_id);
    const message = req.body?.message;
    if (isNaN(senderRaw) || isNaN(receiverRaw)) return res.status(400).json({ error: 'Invalid sender or receiver ID.' });
    if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message text is required.' });
    try {
        const encoded = formats.encodeBase64(message.trim());
        await database.runQuery(
            `INSERT INTO message_board (sender, receiver, message, status, watermark, colour) VALUES (?, ?, ?, 'accepted', 0, 0)`,
            [senderRaw, receiverRaw, encoded]
        );
        await logStaff(req.session.staffUsername, 'create_pinboard', `Staff posted pinboard message from user ${senderRaw} to user ${receiverRaw}`, 1);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff pinboard create error:', err);
        res.status(500).json({ error: 'Failed to create message.' });
    }
});

/**
 * GET /staff/api/social/leaderboard
 * Fetches a paginated list of high scores, optionally filtered by game ID or player username.
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
        const offset = (page - 1) * limit;
        const gameId = req.query.game !== undefined && req.query.game !== '' ? parseInt(req.query.game) : null;
        const search = req.query.search ? `%${req.query.search}%` : null;

        const where = [];
        const params = [];

        if (gameId !== null && !isNaN(gameId)) {
            where.push('mh.gameid = ?');
            params.push(gameId);
        }
        if (search) {
            where.push('u.username LIKE ?');
            params.push(search);
        }

        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const baseFrom = `
            FROM minigames_highscores mh
            LEFT JOIN users u ON u.id = mh.user_id
            ${whereClause}
        `;

        const [total, rows] = await Promise.all([
            database.getQuery(`SELECT COUNT(*) as count ${baseFrom}`, params),
            database.getAllQuery(
                `SELECT mh.id, mh.user_id, mh.gameid, mh.score, mh.date, u.username
                 ${baseFrom}
                 ORDER BY mh.score DESC, mh.date ASC LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            ),
        ]);

        res.json({ total: total?.count ?? 0, page, limit, scores: rows ?? [] });
    } catch (err) {
        pretty.error('Staff leaderboard list error:', err);
        res.status(500).json({ error: 'Failed to fetch leaderboard.' });
    }
});

/**
 * DELETE /staff/api/social/leaderboard/:id
 * Removes a high score entry from the leaderboard.
 */
router.delete('/leaderboard/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid score ID.' });
    try {
        const row = await database.getQuery('SELECT user_id, gameid, score FROM minigames_highscores WHERE id = ?', [id]);
        if (!row) return res.status(404).json({ error: 'Score entry not found.' });
        await database.runQuery('DELETE FROM minigames_highscores WHERE id = ?', [id]);
        await logStaff(req.session.staffUsername, 'delete_score', `Deleted score ID ${id} (user ${row.user_id}, game ${row.gameid}, score ${row.score})`, 2);
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff leaderboard delete error:', err);
        res.status(500).json({ error: 'Failed to delete score.' });
    }
});

module.exports = router;
