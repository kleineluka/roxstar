const crypto = require('crypto');
const pretty = require('../utils/pretty.js');
const formats = require('../utils/formats.js');

/**
 * Middleware to generate a temporary token.
 **/
function generate_token(req, res, next) {
    if (!req.session.tkn) {
        req.session.tkn = crypto.randomBytes(config_server['temp-key-bytes']).toString('hex');
    }
    next();
}

/**
 * Middleware to log requests.
 **/
async function log_request(req, res, next) {
    pretty.request(req.method, req.headers['user-agent'], req.ip, req.url);
    next();
}

/**
 * Specific processes that need to be done for certain routes.
 **/
async function processor(app) {
    app.use(log_request);
    app.use('/activation.html', generate_token);
    app.use(formats.accept_url('login'), generate_token);
}

// export the middleware
module.exports = {
    processor,
};

