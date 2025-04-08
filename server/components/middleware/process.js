const crypto = require('crypto');
const pretty = require('../utils/pretty.js');

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
}

// export the middleware
module.exports = {
    processor,
};

