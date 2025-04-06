const fs = require('fs');
const path = require('path');
const pretty = require('../utils/pretty.js');

/**
 * Loads a configuration file from the configs directory.
 * @param {*} filename - The name of the file to load.
 * @returns {Object} - The parsed JSON object from the file.
 **/
const loadConfig = (filename) => {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', "..", "configs", filename), 'utf8'));
};

/**
 * Loads a storage file from the storage directory.
 * @param {*} filename - The name of the file to load.
 * @returns {Object} - The parsed JSON object from the file.
 **/
const loadStorage = (filename) => {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', "..", "storage", filename), 'utf8'));
}

/**
 * Loads the provided configuration file and replaces %final_url% with the final URL from the server configuration.
 * This is used for the nullservices/rest/configuration endpoint.
 */
function loadProvided(config_template) {
    let updated_provided = config_template;
    Object.keys(updated_provided).forEach(key => {
        updated_provided[key] = updated_provided[key].replace('%final_url%', global.config_server['final-url']);
    });
    return updated_provided;
}

/**
 * Sets up the environment by loading configuration and storage files into global variables.
 * This function should be called once at the start of the server.
 **/
const setupEnvironment = () => {
    global.config_censor = loadConfig('censor.json');
    global.config_server = loadConfig('server.json');
    global.config_game = loadConfig('game.json');
    global.config_monstar = loadConfig('monstar.json');
    global.config_levels = loadConfig('levels.json');
    global.config_trophies = loadConfig('trophies.json');
    global.config_starter = loadConfig('starter.json');
    global.config_garden = loadConfig('garden.json');
    global.config_provided = loadProvided(loadConfig('provided.json'));
    global.config_rebundles = loadConfig('rebundles.json');
    global.config_services = loadConfig('services.json');
    global.config_parse = loadConfig('parse.json');
    pretty.print('Loaded configurations into volatile memory.', 'ACTION');
    global.storage_bags = loadStorage('bags.json');
    global.storage_clothes = loadStorage('clothes.json');
    global.storage_events = loadStorage('events.json');
    global.storage_funpark = loadStorage('funpark.json');
    global.storage_gifts = loadStorage('gifts.json');
    global.storage_housestyles = loadStorage('housestyles.json');
    global.storage_items = loadStorage('items.json');
    global.storage_monsters = loadStorage('monsters.json');
    global.storage_moshlings = loadStorage('moshlings.json');
    global.storage_puzzles = loadStorage('puzzles.json');
    global.storage_rewards = loadStorage('rewards.json');
    global.storage_locations = loadStorage('locations.json');
    global.storage_seasons = loadStorage('seasons.json');
    global.storage_seeds = loadStorage('seeds.json');
    global.storage_stores = loadStorage('stores.json');
    global.storage_zoo = loadStorage('zoo.json');
    pretty.print('Loaded storage into volatile memory.', 'ACTION');
};

module.exports = { setupEnvironment };