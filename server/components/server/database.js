// imports
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const pretty = require('../utils/pretty.js');

// create database connection
const db = new sqlite3.Database(`${__dirname}/../../${global.config_server['database']}`, (err) => {
    if (err) {
        pretty.error(`Failed to connect to SQLite: ${err.message}`);
    } else {
        pretty.print('Connected to SQLite database', 'DATABASE');
    }
});

// function to initialize the database
function initialize() {

    // db script is: ../../database.sql
    const dbScriptPath = `${__dirname}/../../database.sql`;
    if (!fs.existsSync(dbScriptPath)) {
        pretty.error(`Database script not found: ${dbScriptPath}..`);
        return;
    }

    // set up if not set up yet
    db.exec(fs.readFileSync(dbScriptPath, 'utf-8'), (err) => {
        if (err) {
            pretty.error(`Failed to initialize database: ${err.message}`);
        } else {
            pretty.print('Database initialized successfully.', 'DATABASE');
        }
    });

}

// function to run SQL queries with parameters
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                pretty.error(`Database query error: ${err.message}`);
                return reject(err);
            }
            resolve(this.lastID);
        });
    });
}

// function to get data with parameters
function getQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) {
                pretty.error(`Database query error: ${err.message}`);
                return reject(err);
            }
            resolve(row);
        });
    });
}

// function to close the database connection
function close() {
    db.close((err) => {
        if (err) {
            pretty.error(`Error closing the database: ${err.message}`);
        } else {
            pretty.print('Database connection closed');
        }
    });
}

module.exports = {
    initialize,
    runQuery,
    getQuery,
    close,
};