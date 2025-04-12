const express = require('express');
const router = express.Router();
const pretty = require('../../utils/pretty.js');
const censor = require('../../utils/censor.js');

/**
 * Handles POST requests to check and filter content against a censor list.
 * Expects JSON body: { "Content": "User input text" }
 */
router.post('/', (req, res) => {
    const userId = req.session.userId;
    const originalContent = req.body?.Content;
    if (typeof originalContent !== 'string') {
        pretty.warn(`Content filter request received invalid/missing 'Content' field. Body: ${JSON.stringify(req.body)}`);
        return res.json({
            Original: "",
            Error: "Invalid input content.", // add error just for debugging
            Filtered: "",
            // Result: 0 // 0 = censoring applied (?)
        });
    }
    if (!global.config_censor || !Array.isArray(global.config_censor)) {
        pretty.error("Censor list (global.config_censor) is missing or not an array.");
        // return unfiltered content if censor list is broken
        return res.json({
            Original: originalContent,
            Error: "Censor list unavailable.", // add error just for debugging
            Filtered: originalContent,
            // Result: 0 // 0 = censoring applied (?)
        });
    }
    // censor and return
    const censorResult = censor.filterWords(originalContent, global.config_censor);
    const response = {
        Original: censorResult.original,
        Error: null,
        Filtered: censorResult.filtered,
        ...(censorResult.containsCensored && { Result: 0 })
    };
    if (!censorResult.containsCensored) {
        // should be the same then
        response.Filtered = response.Original;
    } else {
        // response.Filtered = censorResult.filtered.replace(/\*+\*?/g, ''); // removes "****" type replacement, todo make this configurable
        pretty.debug(`Censored content for user ${userId || 'Unknown'}. Original: "${censorResult.original}", Filtered: "${censorResult.filtered}"`);
    }
    res.json(response);
});

module.exports = router;