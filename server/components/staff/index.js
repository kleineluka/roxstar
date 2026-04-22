const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

function render(res, file, locals = {}) {
    ejs.renderFile(path.join(__dirname, 'web', file), locals, {}, (err, html) => {
        if (err) { console.error('EJS render error:', err); return res.status(500).send('Template error'); }
        res.send(html);
    });
}
const auth = require('./middleware/auth.js');
const pretty = require('../utils/pretty.js');

// api routes
const apiAuth = require('./api/auth.js');
const apiStats = require('./api/stats.js');
const apiUsers = require('./api/users.js');
const apiLogs = require('./api/logs.js');
const apiConfig = require('./api/config.js');
const apiShops = require('./api/shops.js');
const apiSocial = require('./api/social.js');

// static assets (css, etc.)
router.use('/assets', express.static(path.join(__dirname, 'web')));

// public routes
router.get('/login', (req, res) => {
    if (req.session.staffLoggedIn) return res.redirect('/staff/home');
    res.sendFile(path.join(__dirname, 'web', 'login.html'));
});
router.use('/api/auth', apiAuth);

// auth wall, all below is gated behind staff login
router.use(auth.requireStaff);

// web pages
router.get('/', (req, res) => res.redirect('/staff/home'));
router.get('/home', (req, res) => render(res, 'home.ejs'));
router.get('/users', (req, res) => render(res, 'moderation/users.ejs'));
router.get('/profile', (req, res) => render(res, 'moderation/profile.ejs'));
router.get('/logs', (req, res) => render(res, 'moderation/logs.ejs'));
router.get('/leaderboard', (req, res) => render(res, 'moderation/leaderboard.ejs'));
router.get('/pinboard', (req, res) => render(res, 'moderation/pinboard.ejs'));
router.get('/shops', (req, res) => render(res, 'management/shops.ejs'));
router.get('/config', (req, res) => render(res, 'management/config.ejs'));

// protected api
router.use('/api/stats', apiStats);
pretty.print("Serving protected route at /api/stats", "STAFF");
router.use('/api/users', apiUsers);
pretty.print("Serving protected route at /api/users", "STAFF");
router.use('/api/logs', apiLogs);
pretty.print("Serving protected route at /api/logs", "STAFF");
router.use('/api/config', apiConfig);
pretty.print("Serving protected route at /api/config", "STAFF");
router.use('/api/shops', apiShops);
pretty.print("Serving protected route at /api/shops", "STAFF");
router.use('/api/social', apiSocial);
pretty.print("Serving protected route at /api/social", "STAFF");

module.exports = router;
