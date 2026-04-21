const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../../components/server/database.js');
const pretty = require('../../components/utils/pretty.js');

/**
 * POST /staff/api/auth/login
 * Authenticates a staff user and creates a session if successful. 
 * Only users with the 'staff' flag can log in through this endpoint.
 */
router.post('/login', express.json(), async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const user = await database.getQuery(
            'SELECT id, username, password, staff FROM users WHERE username = ?',
            [username]
        );
        if (!user || !user.staff) {
            return res.status(401).json({ error: 'Invalid credentials or insufficient permissions.' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials or insufficient permissions.' });
        }
        req.session.staffLoggedIn = true;
        req.session.staffUserId = user.id;
        req.session.staffUsername = user.username;
        await req.session.save();
        res.json({ success: true });
    } catch (err) {
        pretty.error('Staff login error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

/**
 * POST /staff/api/auth/logout
 * Logs out the current staff user by clearing their session.
 */
router.post('/logout', (req, res) => {
    req.session.staffLoggedIn = false;
    req.session.staffUserId = null;
    req.session.staffUsername = null;
    req.session.save(() => res.json({ success: true }));
});

/**
 * GET /staff/api/auth/me
 * Returns the currently logged-in staff user's information. Requires an active staff session.
 * If no staff user is logged in, returns a 401 Unauthorized error.
 */
router.get('/me', (req, res) => {
    if (!req.session.staffLoggedIn) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    res.json({ username: req.session.staffUsername, id: req.session.staffUserId });
});

module.exports = router;
