const pretty = require('../utils/pretty.js');

/**
 * Middleware to parse incoming requests based on the configuration.
 * This function dynamically sets up the body parsers for different routes
 * based on the global configuration file.
 * @param {Object} app - The Express application instance.
 * @param {Object} body_parser - The body-parser module instance.
 */
function parser(app, body_parser) {
    try {
        Object.entries(global.config_parse).forEach(([routeName, parseType]) => {
            pretty.debug('Adding parse type for -> ' + routeName + ' (' + parseType + ')');
            switch (parseType) {
                case 'json':
                    app.use(routeName, body_parser.json());
                    break;
                case "xml":
                    app.use(routeName, body_parser.urlencoded({ extended: true }));
                    app.use(routeName, body_parser.xml());
                    break;
                case "urlencoded":
                    app.use(routeName, body_parser.urlencoded({ extended: true }));
                    break;
                case "text":
                    app.use(routeName, body_parser.text());
                    break;
                default:
                    pretty.error('Unknown parse type for -> ' + routeName + ' (' + parseType + ')');
            }
        });
    } catch (error) {
        pretty.error('Error loading PARSE routes: ', error);
    }
}

module.exports = {
    parser,
}