const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
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
router.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'web', 'home.html')));
router.get('/users', (req, res) => res.sendFile(path.join(__dirname, 'web', 'users.html')));
router.get('/logs', (req, res) => res.sendFile(path.join(__dirname, 'web', 'logs.html')));
router.get('/shops', (req, res) => res.sendFile(path.join(__dirname, 'web', 'shops.html')));
router.get('/config', (req, res) => res.sendFile(path.join(__dirname, 'web', 'config.html')));
router.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, 'web', 'leaderboard.html')));
router.get('/pinboard', (req, res) => res.sendFile(path.join(__dirname, 'web', 'pinboard.html')));

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
