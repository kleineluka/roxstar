const express = require('express');
const router = express.Router();
const suggestions = require('../../features/account/suggestions.js');

// router for username validation
router.post('/', async (req, res) => {
    const generatedNames = await suggestions.generateRandomUsernames();
    res.send(JSON.stringify(generatedNames));
});

// export the router
module.exports = router;
