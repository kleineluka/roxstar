/**
 * Formats override data for a location.
 * @param {Array<object>|null} overrides - The overrides array from storage_locations, or null.
 * @returns {Array<object>} An array of formatted override objects for XML.
 */
function formatLocationOverrides(overrides) {
    if (!overrides || !Array.isArray(overrides)) {
        return [];
    }
    const formattedOverrides = [];
    for (const override of overrides) {
        const tagName = override.child;
        if (!tagName) continue;
        // copy all attributes except 'child' (helper key)
        const attributes = { ...override };
        delete attributes.child;
        // prefix attributes with '@'
        const xmlAttributes = {};
        for (const key in attributes) {
            xmlAttributes[`@${key}`] = attributes[key];
        }
        formattedOverrides.push({ [tagName]: xmlAttributes });
    }
    return formattedOverrides;
}

module.exports = {
    formatLocationOverrides,
};