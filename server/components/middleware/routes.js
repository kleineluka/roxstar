const express = require('express');
const router = express.Router();
const formats = require('../utils/formats.js');
const notifs = require('../utils/notifs.js');

// routes
const private_login = require('../web/private/login.js');

/**
 * This handles /login GET requests from the client.
 */
router.get(formats.acceptUrl('login'), async (req, res) => {
    // first check if the user is already logged in
    let to_login = false;
    if (req.cookies && req.cookies.username) {
        // confirm the session key server-side then redirect
        await session.confirmKey(req.cookies.username).then(loggedIn => {
            if (!loggedIn) {
                // provide the login file
                to_login = true;
            }
        }).catch(error => {
            to_login = true;
        });
    } else {
        to_login = true;
    }
    if (to_login && req.session.toast) {
        let toast_message = req.session.toast.message;
        let toast_color = req.session.toast.color;
        delete req.session.toast;
        await req.session.save();
        notifs.toast(req, res, toast_message, toast_color, '../public/login.html');
    } else if (to_login) {
        res.render('../public/login.html');
    }
});

/**
 * This handles /login POST requests from the client.
 */
router.post(formats.acceptUrl('login'), global.body_parser.urlencoded({ extended: true }), async (req, res) => {
    const login_result = await private_login.login(req, res);
    if(login_result != 'no_redirect') {
        const redirection = (login_result != 'noEmail') ? '/monsters' : '/activation';
        res.redirect(redirection);
    }
});

/**
 * This handles /adopt GET requests from the client.
 */
router.get(formats.acceptUrl('adopt'), (req, res) => {
    res.render('../public/adopt.html');
});

/**
 * This handles /activation GET requests from the client.
 */
router.get(formats.acceptUrl('adopt'), (req, res) => {
    res.render('../public/adopt.html');
});

module.exports = {
    router
};
