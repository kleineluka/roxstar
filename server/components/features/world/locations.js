const pretty = require('../../utils/pretty.js');

/**
 * Formats override data for a location.
 * Handles overrides stored as an array OR an object in storage_locations.json.
 * @param {Array<object>|object|null} overrides - The overrides data from storage_locations.
 * @returns {Array<object>} An array of formatted override objects for XML.
 */
function formatLocationOverrides(overrides) {
    if (!overrides) {
        return {};
    }
    let overrideList = [];
    if (Array.isArray(overrides)) {
        overrideList = overrides;
    } else if (typeof overrides === 'object' && overrides !== null) {
        overrideList = Object.values(overrides);
    } else {
        pretty.warn("Location overrides data is neither an array nor a valid object.");
        return {};
    }
    const orderedKeys = {
        content:   ['args', 'animated', 'id', 'layer', 'handler', 'name', 'path', 'replacedefault', 'structureId', 'tiles', 'type', 'x', 'y', 'z'],
        structure: ['args', 'handler', 'height', 'id', 'layer', 'type', 'width', 'x', 'y', 'z'],
    };
    const grouped = {};
    for (const override of overrideList) {
        if (!override || typeof override !== 'object') continue;
        const tagName = override.child;
        if (!tagName) continue;
        const xmlAttributes = {};
        const keys = orderedKeys[tagName];
        if (keys) {
            for (const key of keys) {
                xmlAttributes[`@${key}`] = String(override[key] ?? '');
            }
        } else {
            const attrs = { ...override };
            delete attrs.child;
            for (const key in attrs) {
                xmlAttributes[`@${key}`] = String(attrs[key] ?? '');
            }
        }
        if (!grouped[tagName]) grouped[tagName] = [];
        grouped[tagName].push(xmlAttributes);
    }
    return grouped;
}

module.exports = {
    formatLocationOverrides,
};