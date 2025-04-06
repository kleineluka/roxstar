const pretty = require('../utils/pretty.js');

/**
 * Middleware to handle service routes.
 * This function dynamically sets up the routes based on the configuration.
 * It imports the route handlers from the specified paths and uses them in the Express app.
 */
function servicer(app) {
    try {
        // loop through each route in the config and dynamically import and use the corresponding route handler
        Object.entries(global.config_services).forEach(([routeName, routePath]) => {
            console.log(routeName, routePath);
            const route_handler_path = '../requests' + routePath + '.js';
            pretty.debug('Adding route for listening -> ' + route_handler_path + ' (' + routeName + ')');
            const route_handler = require(route_handler_path);
            app.use(routeName, route_handler);
        });
    } catch (error) {
        pretty.error('Error loading SERVICE routes: ', error, 'routes');
    }
}

// export the functions
module.exports = {
    servicer,
};