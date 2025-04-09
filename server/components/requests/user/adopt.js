const express = require('express');
const router = express.Router();

/**
 * This handles /adopt GET requests from the client.
 */
router.get('/', (req, res) => {
    res.render('../../web/adopt.html');
});

/**
 * This handles /activation GET requests from the client.
 */
router.get('/', (req, res) => {
    res.render('../../web/adopt.html');
});

module.exports = router;