// import dependencies
const net = require('net');
const express = require('express');
const cookieParser = require('cookie-parser');

// import utils
const pretty = require('./components/utils/pretty.js');

// set up the environment
const environment = require('./components/utils/environment.js');
environment.setupEnvironment();

// import servers + initialize database
const { initialize } = require('./components/server/database.js');
initialize();
