const pretty = require('../../utils/pretty.js');

/**
 * Formats override data for a location.
 * Handles overrides stored as an array OR an object in storage_locations.json.
 * @param {Array<object>|object|null} overrides - The overrides data from storage_locations.
 * @returns {Array<object>} An array of formatted override objects for XML.
 */
function formatLocationOverrides(overrides) {
    const formattedOverrides = [];
    if (!overrides) {
        return formattedOverrides;
    }
    let overrideList = [];
    if (Array.isArray(overrides)) {
        overrideList = overrides;
    } else if (typeof overrides === 'object' && overrides !== null) {
        overrideList = Object.values(overrides);
    } else {
        pretty.warn("Location overrides data is neither an array nor a valid object.");
        return formattedOverrides;
    }
    for (const override of overrideList) {
        if (!override || typeof override !== 'object') continue;
        const tagName = override.child;
        if (!tagName) continue; 
        // copy all attributes except 'child'
        const attributes = { ...override };
        delete attributes.child;
        // prefix attributes with '@'
        const xmlAttributes = {};
        for (const key in attributes) {
            // ensure value is a string for XML attributes, handle potential null/undefined
            xmlAttributes[`@${key}`] = String(attributes[key] ?? '');
        }
        formattedOverrides.push({ [tagName]: xmlAttributes });
    }
    return formattedOverrides;
}

module.exports = {
    formatLocationOverrides,
};