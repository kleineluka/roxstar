const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const pretty = require('../utils/pretty.js');

const db = new sqlite3.Database(`${__dirname}/../../${global.config_server['database']}`, (err) => {
    if (err) {
        pretty.error(`Failed to connect to SQLite: ${err.message}`);
    } else {
        pretty.print('Connected to SQLite database', 'DATABASE');
    }
});

/** 
 * Initialise the database by running the SQL script.
 * This will create the tables and insert any necessary data.
 * This function should be called once at the start of the server.
 **/
function initialise() {
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

/** 
 * Simple wrapper for db.run to execute a query with parameters.
 * @param {string} query - The SQL query to execute.
 * @param {Array} params - The parameters to bind to the query.
 * @return {Promise} - A promise that resolves to the last ID of the inserted row.
 **/
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

/**
 * Simple wrapper for db.get to execute a query and return a single row.
 * @param {string} query - The SQL query to execute.
 * @param {Array} params - The parameters to bind to the query.
 * @return {Promise} - A promise that resolves to the row returned by the query.
 **/
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

/**
 * Close the database connection.
 * This should be called when the server is shutting down.  
 **/
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
    initialise,
    runQuery,
    getQuery,
    close,
};