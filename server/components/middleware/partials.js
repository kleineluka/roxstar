const pretty = require('../utils/pretty.js');
const sessionUtils = require('../server/session.js'); 

/**
 * Middleware to dynamically inject header/footer HTML into HTML responses.
 * It intercepts res.send for applicable routes.
 */
async function inject(req, res, next) {
    // see if/what the path needs injected with
    const currentPath = req.path;
    const headerPaths = global.config_partials?.header || [];
    const footerPaths = global.config_partials?.footer || [];
    const needsHeader = headerPaths.includes(currentPath);
    const needsFooter = footerPaths.includes(currentPath);
    // we don't need to add anything to the response, skip
    if (!needsHeader && !needsFooter) {
        return next();
    }
    pretty.print(`Injecting header/footer for ${currentPath}`);
    
    return next();
}

module.exports = {
    inject,
};