const express = require('express');
const router = express.Router();

/*
 * Simple ping endpoint for Roxstar Client to see if a server is online (and some metadata).
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        version: null,
        environment: null,
        timestamp: null,
    });
});

module.exports = router;
