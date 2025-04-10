const pretty = require('../../utils/pretty.js');

/**
 * Formats all available arcade games for XML output.
 * @returns {Array<object>} An array of formatted game objects.
 */
function formatArcadeGames() {
    if (!global.storage_funpark) {
        pretty.error("Arcade game storage (global.storage_funpark) not loaded.");
        return [];
    }
    const formattedGames = [];
    for (const gameId in global.storage_funpark) {
        const game = global.storage_funpark[gameId];
        formattedGames.push({
            game: { 
                '@enabled': String(game.enabled !== false),
                '@flashVersion': game.flashVersion || '9.0.0',
                '@height': game.height || 0,
                '@icon': game.icon || '',
                '@id': gameId, // Use key as ID
                '@name': game.name || 'Unknown Game',
                '@payload': (game.payload || '') + '?v=1',
                '@sort': game.sort || gameId, 
                '@subscription': String(game.subscription === true || game.subscription === 'true'),
                '@width': game.width || 0,
                added: {}
            }
        });
    }
    formattedGames.sort((a, b) => (a['@sort'] || 0) - (b['@sort'] || 0));
    return formattedGames.map(game => ({ game: { ...game, added: {} } }));
}

module.exports = {
    formatArcadeGames,
};