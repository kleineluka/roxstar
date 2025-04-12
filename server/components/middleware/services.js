const pretty = require('../utils/pretty.js');

/**
 * Middleware to handle service routes.
 * This function dynamically sets up the routes based on the configuration.
 * It imports the route handlers from the specified paths and uses them in the Express app.
 */
function servicer(app) {
    Object.entries(global.config_services).forEach(([routeName, routePath]) => {
        try {
            const route_handler_path = '../requests' + routePath;
            const route_handler = require(route_handler_path);
            app.use(routeName, route_handler);
            pretty.print('Added route for listening -> ' + route_handler_path + ' (' + routeName + ')', 'ROUTING');
        } catch (err) {
            pretty.error(`Failed to add service route '${routeName}' from '${routePath}':`, err);
            // print stack trace
            console.error(err.stack);
        }
    });
}

// export the functions
module.exports = {
    servicer,
};