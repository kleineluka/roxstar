const express = require('express');
const router = express.Router();
const database = require('../../server/database.js');
const pretty = require('../../utils/pretty.js');
const notifs = require('../../utils/notifs.js');
const monsterUtils = require('../../features/account/monster.js');

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
        return res.redirect('../../web/login.html');
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
            return res.redirect('../../web/login.html');
        }
        pretty.debug(`Displaying activation page for user "${username}".`);
        res.render('../../web/activation.html', { username: username });
    } catch (error) {
        pretty.error('Error in activation GET route:', error);
        req.session.toast = {
            message: 'An error occurred while checking your account. Please try again later.',
            color: '#ffaaaa'
        };
        res.redirect('/login'); 
    }
});

/**
 * Handles the activation process via POST request.
 */
router.post("/", global.body_parser.urlencoded({ extended: true }), async (req, res) => {
    const userId = req.session.userId; 
    if (!userId) {
        pretty.warn("Activation process started without userId in session. Redirecting to login.");
        return res.redirect('../../web/login.html');
    }
    try {
        // validate user in the database
        const userRow = await database.getQuery(
            'SELECT activation_status FROM users WHERE id = ?',
            [userId]
        );
        if (!userRow) {
            pretty.warn(`Activation failed: User ID ${userId} not found in database. Redirecting to login.`);
            notifs.sendToast(req, res, 'User not found. Please log in again.', '#be9ddf', '../../web/login.html');
            return;
        }
        if (userRow.activation_status !== 'needsActivation') {
            pretty.warn(`Activation attempted for user ID ${userId} with status "${userRow.activation_status}", expected 'needsActivation'. Redirecting to monsters.`);
            return res.redirect('../../web/monsters.html');
        }
        // get the activation form data
        const { name, gender, country, birthMonth, birthDay, birthYear } = req.body;
        if (!name || !gender || !country || !birthMonth || !birthDay || !birthYear) {
            pretty.warn(`Activation form incomplete for user ID ${userId}. Missing fields.`);
            notifs.sendToast(req, res, 'Please make sure you fill out all of the details!', '#be9ddf', '../../web/activation.html');
            return;
        }
        // validate that the monster name they chose is valid
        const isMonsterNameValid = monsterUtils.validateMonsterName(name);
        if (!isMonsterNameValid) {
            pretty.warn(`Activation failed: Monster name "${name}" is invalid for user ID ${userId}.`);
            notifs.sendToast(req, res, 'There was an issue with your monster name, please select another one.', '#be9ddf', '../../web/activation.html');
            return; 
        }
        // calculate birthdate timestamp (into seconds)
        const birthdayTimestamp = new Date(`${birthMonth}/${birthDay}/${birthYear}`).getTime() / 1000;
        const updateSql = `
            UPDATE users
            SET monster_name = ?, gender = ?, country = ?, birthday = ?, activation_status = ?
            WHERE id = ?
        `;
        const updateParams = [name, gender, country, birthdayTimestamp, 'Member', userId]; // using Member for now for game consistency
        const updateResult = await database.runQuery(updateSql, updateParams);
        if (!updateResult || updateResult.changes === 0) {
            pretty.error(`DATABASE: Failed to update user ID ${userId} during activation. Update result: ${JSON.stringify(updateResult)}`);
            notifs.sendToast(req, res, 'Account activation failed due to a server error. Please try again later.', '#ffaaaa', '../../web/activation.html')
            return;
        }
        pretty.print(`Account activated successfully for user ID ${userId} (Username: ${req.session.username}, Monster Name: ${name}).`, 'ACTION');
        // destroy session and redirect to login (todo: make this process a bit smoother, maybe just keep them logged in?)
        req.session.destroy((err) => { 
            if (err) {
                pretty.error("Session destroy error during activation:", err);
            }
            notifs.sendToast(req, res, 'Your account is now registered and you can login!', '#7eb8da', '../../web/login.html'); 
        });
    } catch (error) {
        pretty.error('Unhandled error in activation function:', error);
        notifs.sendToast(req, res, 'An unexpected error occurred during activation. Please try again later.', '#ffaaaa', '../../web/activation.html');
    }
});

module.exports = router;
