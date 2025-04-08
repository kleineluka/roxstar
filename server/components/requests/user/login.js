const express = require('express');
const router = express.Router();
const formats = require('../../utils/formats.js');
const notifs = require('../../utils/notifs.js');
const loginUtils = require('../../web/private/login.js');

/**
 * This handles /login GET requests from the client.
 */
router.get("/", async (req, res) => { // since we listen at /login, just listen here for /
    console.log('Login page accessed. Checking session for toast message.');
    if (req.session.toast) {
        let toast_message = req.session.toast.message;
        let toast_color = req.session.toast.color;
        delete req.session.toast;
        await req.session.save();
        notifs.sendToast(req, res, toast_message, toast_color, '../public/login.html');
    } else {
        res.render('../public/login.html');
    }
});

/**
 * This handles /login POST requests from the client.
 */
router.post("/", global.body_parser.urlencoded({ extended: true }), async (req, res) => {
    const login_result = await loginUtils.login(req, res);
    if(login_result != 'no_redirect') {
        const redirection = (login_result !== 'needsActivation') ? '/monsters' : '/activation';
        res.redirect(redirection);
    }
});

module.exports = router;