const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const auth = require('./middleware/auth.js');

// api routes
const apiAuth = require('./api/auth.js');
const apiStats = require('./api/stats.js');
const apiUsers = require('./api/users.js');
const apiLogs = require('./api/logs.js');
const apiConfig = require('./api/config.js');

// static assets (css, etc.)
router.use('/assets', express.static(path.join(__dirname, 'web')));

// public routes
router.get('/login', (req, res) => {
    if (req.session.staffLoggedIn) return res.redirect('/staff/dashboard');
    res.sendFile(path.join(__dirname, 'web', 'login.html'));
});
router.use('/api/auth', apiAuth);

// auth wall, all below is gated behind staff login
router.use(auth.requireStaff);

// web pages
router.get('/', (req, res) => res.redirect('/staff/dashboard'));
router.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'web', 'dashboard.html')));
router.get('/users', (req, res) => res.sendFile(path.join(__dirname, 'web', 'users.html')));
router.get('/logs', (req, res) => res.sendFile(path.join(__dirname, 'web', 'logs.html')));
router.get('/config', (req, res) => res.sendFile(path.join(__dirname, 'web', 'config.html')));

// protected api
router.use('/api/stats', apiStats);
router.use('/api/users', apiUsers);
router.use('/api/logs', apiLogs);
router.use('/api/config', apiConfig);

module.exports = router;
