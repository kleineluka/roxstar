const net = require('net');
const express = require('express');
const session = require('express-session');
const mustache = require('mustache-express');
const cookieParser = require('cookie-parser');
const path = require('path');
const pretty = require('./components/utils/pretty.js');

// set up the environment
const environment = require('./components/server/environment.js');
environment.setupEnvironment();

// set up database and cache
const database = require('./components/server/database.js');
const cache = require('./components/server/cache.js');
database.initialise();
cache.initialise();

// allocate the body parsers (BEFORE routing)
global.body_parser = require('body-parser');
require('body-parser-xml')(global.body_parser);

// import middleware
const middleware_rebundles = require('./components/middleware/rebundles.js'); 
const middleware_process = require('./components/middleware/process.js');
const middleware_routes = require('./components/middleware/routes.js');
const middleware_config = require('./components/middleware/config.js');
const middleware_services = require('./components/middleware/services.js');
const middleware_parse = require('./components/middleware/parse.js');

// set up the server
const app = express();
app.use(session({
    secret: config_server['session-secret'],
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));
app.set('trust proxy', true) // mainly for running with nginx
app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', __dirname + '/components/web/public'); 
app.use(cookieParser());

// apply middleware stack
app.use(middleware_rebundles.rebundler);
middleware_process.processor(app);
middleware_parse.parser(app);
app.use('/', middleware_routes.router);
app.use('/', middleware_config.router);
middleware_services.servicer(app);
app.use(express.static(path.join(__dirname, 'resources')));

// create the server
app.listen(config_server['port'], config_server['host'], () => {
    pretty.print("Server started on " + config_server['host'] + ':' + config_server['port'], "SERVER");
});