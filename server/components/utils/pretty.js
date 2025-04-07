const chalk = require('chalk');

const header_styling = {
    'LOGS': chalk.magentaBright,
    'DEBUG': chalk.magenta,
    'ERROR': chalk.redBright,
    "TIMESTAMP": chalk.yellowBright,
    "REQUEST": chalk.blue,
    "REDIRECT": chalk.yellowBright,
    "DATABASE": chalk.cyanBright,
    'ACTION': chalk.greenBright,
    'WARN': chalk.yellowBright,
    'CACHE': chalk.redBright,
    'SESSION MANAGER': chalk.greenBright,
    'SERVER': chalk.blueBright,
    'ROUTING': chalk.yellowBright,
};

const request_styling = {
    'GET': chalk.greenBright.bold,
    'POST': chalk.blueBright.bold,
    'PUT': chalk.yellowBright.bold,
    'DELETE': chalk.redBright.bold,
    "URL": chalk.cyan.bold,
    "IP": chalk.magenta.bold,
    "USERAGENT": chalk.yellow,
};

/**
 * Generates a rainbow-colored string from the input message.
 * @param {string} msg - The message to colorize.
 * @return {string} - The rainbow-colored string.
 */
function pretty_rainbow(msg) {
    let color_range = [chalk.red, chalk.yellow, chalk.green, chalk.blue, chalk.magenta, chalk.cyan];
    let rainbow = '';
    for (let i = 0; i < msg.length; i++) {
        rainbow += color_range[i % color_range.length](msg[i]);
    }
    return rainbow;
}

/**
 * Prints a message to the console with a specific source tag.
 * @param {string} msg - The message to print.
 * @param {string} [source='LOGS'] - The source of the message (e.g., 'LOGS', 'DEBUG', 'ERROR').
 */
function print(msg, source = 'LOGS') {
    if (!global.pretty_name) global.pretty_name = pretty_rainbow(config_server['name']);
    var header = '[';
    header += global.pretty_name + ' @ ';
    var date = new Date();
    let formatted_date = (date.getHours() < 10 ? '0' : '') + date.getHours();
    formatted_date += ':' + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    header += header_styling['TIMESTAMP'](formatted_date) + '] -> ';
    header += header_styling[source](source) + ': ';
    header = '\x1b[1m' + header + '\x1b[0m' + msg;
    console.log(header); // ta-da!
}

/**
 * Prints a debug message to the console, if debugging is enabled.
 * @param {string} msg - The debug message to print.
 */
function debug(msg) {
    if (global.config_server['debug']) print(msg, 'DEBUG');
}

/**
 * Prints an error message to the console.
 * @param {string} msg - The error message to print.
 * @param {Error} [error] - An optional error object to include in the message.
 */
function error(msg, error = null) {
    if (error) msg += ' | ' + error;
    print(msg, 'ERROR');
}

/**
 * Prints a request message to the console.
 * @param {string} kind - The type of request (GET, POST, etc.).
 * @param {string} userAgent - The user agent string of the request.
 * @param {string} ip - The IP address of the requester.
 * @param {string} url - The requested URL.
 */
function request(kind, userAgent, ip, url) {
    if (kind == null || userAgent == null || ip == null || url == null) return;
    kind = request_styling[kind](kind);
    userAgent = 'UA: ' + request_styling['USERAGENT'](userAgent);
    ip = 'IP @ ' + request_styling['IP'](ip);
    url = request_styling['URL'](url);
    let msg = 'Recieving a ' + kind + ' request from ' + ip + ' (' + userAgent + ') for ' + url + '.';
    if (config_server['debug']) {
        print(msg, 'REQUEST');
    }
}

module.exports = {
    print,
    debug,
    error,
    request
};