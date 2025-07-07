const pretty = require('../utils/pretty.js');
const sessionUtils = require('../server/session.js');

/**
 * Middleware to dynamically inject header/footer HTML into HTML responses.
 * It intercepts res.send for applicable routes.
 */
async function inject(req, res, next) {
    const currentPath = req.path;
    const headerPaths = global.config_partials?.header || [];
    const footerPaths = global.config_partials?.footer || [];
    const needsHeader = headerPaths.includes(currentPath);
    const needsFooter = footerPaths.includes(currentPath);
    // no point in injecting if neither header nor footer is needed
    if (!needsHeader && !needsFooter) {
        return next();
    }
    // get original stuff we will modify
    const originalSend = res.send;
    const app = req.app;
    // send a response with partials inejcted
    res.send = async function (body) {
        const self = this;
        const isHtml = typeof body === 'string' && /<html.*>/i.test(body);
        if (!isHtml) {
            // can't inject into non-HTML responses
            return originalSend.call(self, body);
        }
        pretty.debug(`Injecting partials into HTML response for path: ${currentPath}`);
        let modifiedBody = body;
        try {
            // parse data that is required
            let partialsData = {};
            if (needsHeader) {
                const isLoggedIn = req.session && req.session.userId && req.session.username && req.session.sessionKey
                    ? await sessionUtils.confirmKey(req.session.username, req.session.sessionKey)
                    : false;
                partialsData.signInClass = isLoggedIn ? 'logged-in' : '';
                pretty.debug(`Partial data prepared: ${JSON.stringify(partialsData)}`);
            }
            // async partial rendering
            const renderPartial = (viewPath, data) => {
                return new Promise((resolve, reject) => {
                    app.render(viewPath, data, (err, html) => {
                        if (err) return reject(err);
                        resolve(html);
                    });
                });
            };
            const [headerHtml, footerHtml] = await Promise.all([
                needsHeader ? renderPartial('partials/header.html', partialsData) : Promise.resolve(''),
                needsFooter ? renderPartial('partials/footer.html', partialsData) : Promise.resolve('')
            ]);
            // inject what was needed
            if (needsHeader && headerHtml) {
                modifiedBody = modifiedBody.replace(/<body[^>]*>/i, `$&${headerHtml}`);
            }
            if (needsFooter && footerHtml) {
                modifiedBody = modifiedBody.replace(/<\/body>/i, `${footerHtml}$&`);
            }
            // send the modified body
            pretty.debug(`Sending response with injected partials for path: ${currentPath}`);
            originalSend.call(self, modifiedBody);
        } catch (error) {
            pretty.error(`Error injecting partials for path ${currentPath}:`, error);
            originalSend.call(self, body);
        }
    };
    next();
}

module.exports = {
    inject,
};