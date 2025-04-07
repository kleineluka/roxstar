const express = require('express');
const router = express.Router();
const xmlbuilder = require('xmlbuilder');
const username = require('../../features/account/username.js');

// router for username validation
router.get('/', async (req, res) => {
    // get, from the current session, the username
    const session_username = req.session.username;
    // see if the username checks out
    let allowed = await username.isUsernameAllowed(session_username);
    // remove the username from the session, as well as rs_rebundled
    delete req.session.username;
    delete req.session.rs_rebundled;
    await req.session.save();
    // construct the xml response
    let xml_response = xmlbuilder.create('ownernameAvailability').ele('available', allowed.valueOf());
    res.set('Content-Type', 'text/xml');
    res.send(xml_response.end({ prettyPrint: true }));
});

// export the router
module.exports = router;
