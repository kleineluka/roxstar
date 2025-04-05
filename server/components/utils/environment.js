const fs = require('fs');
const path = require('path');
const pretty = require('./pretty.js');

const loadConfig = (filename) => {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', "..", "configs", filename), 'utf8'));
};

const setupEnvironment = () => {
    global.config_censor = loadConfig('censor.json');
    global.config_server = loadConfig('server.json');
    global.config_game = loadConfig('game.json');
    global.config_monstar = loadConfig('monstar.json');
    global.config_levels = loadConfig('levels.json');
    global.config_trophies = loadConfig('trophies.json');
    global.config_starter = loadConfig('starter.json');
    global.config_garden = loadConfig('garden.json');
    global.config_provided = loadConfig('provided.json');
    global.config_services = loadConfig('services.json');
    global.config_parse = loadConfig('parse.json');
    pretty.print('Loaded configurations into volatile memory.', 'ACTION');
};

module.exports = { setupEnvironment };