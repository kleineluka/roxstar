const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../../server/database.js');
const usernameUtils = require('../../features/account/username.js');
const homeUtils = require('../../features/account/home.js');
const inventoryUtils = require('../../features/account/inventory.js');
const clock = require('../../utils/clock.js');
const formats = require('../../utils/formats.js');
const pretty = require('../../utils/pretty.js');

router.post('/', global.body_parser.xml(), async (req, res) => {
    // ensure that the request body is valid XML and contains the required fields
    if (!req.body || !req.body.adoption) {
        pretty.error("Adoption request failed: Missing or invalid XML body.");
        const xmlError = formats.buildXmlResponse(1, 'Invalid request format.', global.config_server['pretty-print-replies']);
        return res.status(400).type('application/xml').send(xmlError);
    }
    try {
        const { adoption } = req.body;
        const monsterId = adoption?.monster?.[0];
        const colour1 = adoption?.colour1?.[0];
        const colour2 = adoption?.colour2?.[0];
        const email = adoption?.email?.[0];
        const username = adoption?.username?.[0];
        const password = adoption?.password?.[0];
        // const affiliate = adoption?.affiliate?.[0] || '';
        // const referrer = adoption?.referrer?.[0] || '';
        // const adoptionMode = adoption?.adoptionMode?.[0];
        if (!monsterId || !colour1 || !colour2 || !email || !username || !password) {
            pretty.warn("Adoption failed: Missing required fields in XML body.");
            const xmlError = formats.buildXmlResponse(1, 'Missing required adoption details.', global.config_server['pretty-print-replies']);
            return res.status(400).type('application/xml').send(xmlError);
        }
        // map monster id to type name
        const monsterTypes = { '1': "diavlo", '2': "furi", '3': "zommer", '4': "poppet", '5': "katsuma", '6': "luvli" };
        const monsterType = monsterTypes[monsterId];
        if (!monsterType) {
            pretty.warn(`Adoption failed: Invalid monster ID "${monsterId}".`);
            const xmlError = formats.buildXmlResponse(1, 'Invalid monster selection.', global.config_server['pretty-print-replies']);
            return res.status(400).type('application/xml').send(xmlError);
        }
        // validate username and email
        const isUsernameValid = await usernameUtils.isUsernameAllowed(username, true);
        if (!isUsernameValid) {
            pretty.debug(`Adoption failed: Username "${username}" is not allowed.`);
            const xmlError = formats.buildXmlResponse(1, 'Please try another username!', global.config_server['pretty-print-replies']);
            return res.status(409).type('application/xml').send(xmlError);
        }
        const isEmailValid = formats.validateEmail(email); // todo: check if email is already in use
        if (!isEmailValid) {
            pretty.debug(`Adoption failed: Email "${email}" is invalid.`);
            const xmlError = formats.buildXmlResponse(1, 'Invalid email format.', global.config_server['pretty-print-replies']);
            return res.status(400).type('application/xml').send(xmlError);
        }
        // hash password and insert into database
        const hashedPassword = await bcrypt.hash(password, global.config_server['password-salt-rounds']);
        const timestamp = clock.getTimestamp();
        const userInsertSql = `
            INSERT INTO users (
                email, username, monster_name, password, register_ip,
                monster, primary_colour, secondary_colour, creation_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const userInsertParams = [
            email, username, username, hashedPassword, req.ip,
            monsterType, colour1, colour2, timestamp
        ];
        const insertResult = await database.runQuery(userInsertSql, userInsertParams);
        if (!insertResult || !insertResult.lastID || insertResult.lastID <= 0) {
            pretty.error(`Failed to insert new user "${username}". Result: ${JSON.stringify(insertResult)}`);
            const xmlError = formats.buildXmlResponse(1, 'Failed to create account due to a server error.', global.config_server['pretty-print-replies']);
            return res.status(500).type('application/xml').send(xmlError); 
        }
        const newUserId = insertResult.lastID;
        pretty.print(`Successfully created user "${username}" with ID ${newUserId}.`, 'DATABASE');
        // start giving them the starter things (room, items)
        const newRoomId = await homeUtils.giveRoom(newUserId);
        if (!newRoomId) {
            pretty.error(`Failed to create initial room for new user ID ${newUserId}. Continuing with inventory.`);
        } else {
            // only give starter house items if the room was successfully created
            await homeUtils.giveStarterHouse(newUserId, newRoomId, global.config_starter);
        }
        await inventoryUtils.giveStarterInventory(newUserId, global.config_starter);
        pretty.debug(`Session updated for new user ${newUserId}.`);
        const xmlSuccess = formats.buildXmlResponse(0, 'success', global.config_server['pretty-print-replies']);
        pretty.print(`User adoption successful for "${username}" (ID: ${newUserId}).`, 'ACTION');
        res.status(200).type('application/xml').send(xmlSuccess); //
    } catch (error) {
        pretty.error('Unhandled error during user adoption:', error);
        const xmlError = formats.buildXmlResponse(1, 'An unexpected server error occurred.', global.config_server['pretty-print-replies']);
        res.status(500).type('application/xml').send(xmlError); // Internal Server Error
    }
});

module.exports = router;