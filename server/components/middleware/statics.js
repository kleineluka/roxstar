const express = require('express');
const path = require('path');
const pretty = require('../utils/pretty.js');

/**
 * Configures and applies all static file serving routes to the Express app
 * based on the global configuration loaded from statics.json.
 * @param {object} app - The Express application instance.
 * @param {string} rootDir - The application's root directory (__dirname from server.js).
 */
function serve(app, rootDir) {
    // ensure that the config for the paths are properly loaded
    if (!global.config_statics || !Array.isArray(global.config_statics)) {
        pretty.error("Statics configuration (global.config_statics) is missing or not an array. Static files will not be served.");
        return;
    }
    // iterate through the config array and set up each static route
    global.config_statics.forEach(routeConfig => {
        if (!routeConfig.virtualPath || !routeConfig.physicalPath) {
            pretty.warn(`Skipping invalid static route config entry: ${JSON.stringify(routeConfig)}`);
            return; // skip this entry if it's not properly set up
        }
        // the full physical path
        const physicalPath = path.join(rootDir, routeConfig.physicalPath);
        // apply the middleware
        app.use(routeConfig.virtualPath, express.static(physicalPath));
        // and just print for info
        pretty.print(
            `Mapping ${routeConfig.physicalPath} (physical) -> ${routeConfig.virtualPath} (virtual)`,
            'ROUTING'
        );
    });
}

module.exports = {
    serve,
};