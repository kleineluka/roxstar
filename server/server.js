// import dependencies
const net = require('net');
const express = require('express');
const cookieParser = require('cookie-parser');

// import utils
const pretty = require('./components/utils/pretty.js');

// set up the environment
const environment = require('./components/server/environment.js');
environment.setupEnvironment();

// import servers + initialize database
const database = require('./components/server/database.js');
const cache = require('./components/server/cache.js');
database.initialise();
cache.initialise();
