const express = require('express');
const router = express.Router();
let database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');

/*
 * This handles /activation GET requests from the client.
 * It checks if the user is logged in and if they need to activate their account.
 * If not, it redirects them to the login page with a toast message.
 */
router.get('/', async (req, res) => {
    const username = req.session.username; 
    if (!username) {
        pretty.debug("Activation page accessed without username in session. Redirecting to login.");
        req.session.toast = {
            message: 'No active session found. Please log in or create an account.',
            color: '#be9ddf'
        };
        return res.redirect('/login');
    }
    try {
        const userRow = await database.getQuery(
            `SELECT activation_status FROM users WHERE username = ? LIMIT 1`,
            [username]
        );
        if (!userRow || userRow.activation_status !== 'needsActivation') {
            pretty.debug(`Activation attempt for user "${username}" failed: User not found or status not 'needsActivation'.`);
            req.session.toast = {
                message: 'You do not have an account that needs activation! Try logging in again, or making a new account.',
                color: '#be9ddf'
            };
            return res.redirect('/login'); // redirect to login with toast
        }
        pretty.debug(`Displaying activation page for user "${username}".`);
        res.render('../public/activation.html', { username: username });
    } catch (error) {
        pretty.error('Error in activation GET route:', error);
        req.session.toast = {
            message: 'An error occurred while checking your account. Please try again later.',
            color: '#ffaaaa'
        };
        res.redirect('/login'); 
    }
});

module.exports = router;
