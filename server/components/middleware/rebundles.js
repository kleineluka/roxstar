const pretty = require('../utils/pretty.js');

/**
 * This middleware is used to rewrite parameters from the URL into the request session.
 * It is useful for handling dynamic routes and passing parameters to the server.
 **/
async function rewrite_parameters(requested_url, route_pattern) {
    // initialize objects and values
    let parameters = [];
    // find matches and loop through
    const pattern_regex = /%([^%]+)%/g;
    let param_match;
    while ((param_match = pattern_regex.exec(route_pattern)) !== null) {
        // get the position of the match
        const matchIndex = param_match.index;
        const matchLength = param_match[0].length;
        // get everything before or after
        let before = route_pattern.slice(0, matchIndex);
        let after = route_pattern.slice(matchIndex + matchLength);
        // cull before based on the last percentage, and after based on the first
        if (before.lastIndexOf('%') !== -1) {
            before = before.slice(before.lastIndexOf('%') + 1);
        }
        if (after.indexOf('%') !== -1) {
            after = after.slice(0, after.indexOf('%'));
        }
        // now that we have the before and after, use it to get the actual value of the parameter in the url
        const startIndex = requested_url.indexOf(before) + before.length;
        const endIndex = after ? requested_url.indexOf(after) : requested_url.length;
        let param_value = requested_url.substring(startIndex, endIndex);
        let final_parameter_name = param_match[0].replace(/%/g, '');
        // skip if the parameter is noCache.. useless
        if (final_parameter_name === 'noCache') {
            continue;
        }
        // add the name of the parameter and the value to the list
        parameters.push([final_parameter_name, param_value]);
        pretty.debug('Rebundled parameter -> ' + final_parameter_name + ' = ' + param_value);
    }
    // also add an obligatory ?kr_rebundled=true so we know not to redirect again
    parameters.push(['kr_rebundled', 'true']);
    return parameters;
}

/**
 * This middleware is used to rewrite parameters from the URL into the request session.
 * It is useful for handling dynamic routes and passing parameters to the server.
 **/
async function rebundler(req, res, next) {
    // see if the query has been rebundled already
    if (req.session.kr_rebundled) {
        next();
        return;
    }
    // get the url from start until the last slash, or first ?
    let url_base = req.url.substring(0, req.url.lastIndexOf("/"));
    let url_base_two = req.url.substring(0, req.url.indexOf("?"));
    // see if a pattern exists in the provided configuration
    let route_pattern = global.config_rebundles[url_base]?.route_pattern;
    if (!route_pattern) {
        route_pattern = global.config_rebundles[url_base_two]?.route_pattern;
    }
    if (!route_pattern) {
        // we don't need to rebundle here
        next();
        return;
    }
    // extract the parameters and add them to the request
    let rebundled_parameters = await rewrite_parameters(req.url, route_pattern);
    // add them all to the session
    for (let i = 0; i < rebundled_parameters.length; i++) {
        let extra_context = (rebundled_parameters[i][0] == 'rs_rebundled' ? '(roxstar internal flag, ignore for client-side debugging)' : '');
        pretty.debug('Adding ' + rebundled_parameters[i][0] + ' (value: ' + rebundled_parameters[i][1] + ') to the session ' + extra_context + '.');
        req.session[rebundled_parameters[i][0]] = rebundled_parameters[i][1];
    }
    next();
}

module.exports = {
    rebundler,
};
