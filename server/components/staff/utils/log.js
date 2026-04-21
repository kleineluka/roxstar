const database = require('../../server/database.js');

async function logStaff(adminUsername, eventName, eventDescription, severity = 0) {
    await database.runQuery(
        'INSERT INTO logs_staff (admin, event_name, event_description, severity) VALUES (?, ?, ?, ?)',
        [adminUsername, eventName, eventDescription, severity]
    );
}

module.exports = { logStaff };
