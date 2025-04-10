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
 * Executes a query (INSERT, UPDATE, DELETE) using db.run.
 * @param {string} query - The SQL query to execute.
 * @param {Array} params - The parameters to bind to the query.
 * @return {Promise<{lastID: number, changes: number}>} - A promise that resolves with an object
 * containing the last inserted ID and the number of rows changed.
 **/
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                pretty.error(`Database run error: ${err.message} | Query: ${query} | Params: ${JSON.stringify(params)}`);
                return reject(err);
            }
            resolve({ lastID: this.lastID, changes: this.changes });
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
 * Simple wrapper for db.all to execute a query and return all rows.
 * @param {string} query - The SQL query to execute.
 * @param {Array} params - The parameters to bind to the query.
 * @return {Promise<Array<object>>} - A promise that resolves to an array of rows.
 **/
function getAllQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => { // Use db.all
            if (err) {
                pretty.error(`Database query error: ${err.message} | Query: ${query} | Params: ${JSON.stringify(params)}`);
                return reject(err);
            }
            resolve(rows); // Resolve with the array of rows
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
    getAllQuery,
    close,
};