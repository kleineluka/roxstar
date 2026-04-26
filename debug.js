const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const SERVER_DIR = path.join(__dirname, 'server');
const CLIENT_DIR = path.join(__dirname, 'client');
const ELECTRON_PATH = path.join(CLIENT_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
const SERVER_URL = 'http://localhost:3000';
const AUTO_CLOSE_SERVER = false;
const AUTO_OPEN_DEVTOOLS = true;

const children = [];

function log(tag, msg) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${tag}] ${msg}`);
}

function startServer() {
    return new Promise((resolve, reject) => {
        log('SERVER', 'Starting server...');
        const server = spawn('node', ['server.js'], {
            cwd: SERVER_DIR,
            stdio: ['ignore', 'inherit', 'inherit'],
            shell: false
        });
        children.push(server);

        server.on('error', (err) => {
            log('SERVER', `Failed to start: ${err.message}`);
            reject(err);
        });

        server.on('exit', (code) => {
            log('SERVER', `Exited with code ${code}`);
        });

        const poll = setInterval(() => {
            http.get(SERVER_URL, (res) => {
                clearInterval(poll);
                log('SERVER', `Ready! (status ${res.statusCode})`);
                resolve(server);
            }).on('error', () => {});
        }, 500);

        setTimeout(() => {
            clearInterval(poll);
            log('SERVER', 'Assuming server is ready (timeout)');
            resolve(server);
        }, 15000);
    });
}

function startClient(name, partition, loginSlot, extraEnv = {}) {
    const startURL = loginSlot ? `${SERVER_URL}/debug/login/${loginSlot}` : SERVER_URL;
    log(name, `Launching with partition "${partition}", URL: ${startURL}`);
    const client = spawn(ELECTRON_PATH, ['.'], {
        cwd: CLIENT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ROXSTAR_PARTITION: partition, ROXSTAR_URL: startURL, ROXSTAR_DEBUG_MODE: '1', ...extraEnv },
        shell: false
    });
    children.push(client);

    client.on('error', (err) => {
        log(name, `Failed to start: ${err.message}`);
    });

    client.on('exit', (code) => {
        log(name, `Exited with code ${code}`);
        checkAllClosed();
    });

    return client;
}

function checkAllClosed() {
    const alive = children.filter(c => !c.killed && c.exitCode === null);
    const aliveClients = alive.filter(c => c !== children[0]);
    if (aliveClients.length === 0) {
        log('DEBUG', 'All clients closed.');
        if (AUTO_CLOSE_SERVER) {
            log('DEBUG', 'Shutting down server...');
            cleanup();
        }
    }
}

function cleanup() {
    for (const child of children) {
        if (!child.killed && child.exitCode === null) {
            child.kill();
        }
    }
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function main() {
    log('DEBUG', '🎵🎶');
    log('DEBUG', 'Are you ready for the show?');
    log('DEBUG', 'Shake your body to and fro!');
    log('DEBUG', 'Clap your hands and spin around!');
    log('DEBUG', 'It\'s The Missy Kix Dance!');
    log('DEBUG', '================================');
    log('DEBUG', 'RoxStar Dev Launcher!');
    log('DEBUG', 'Starting server + two clients with separate sessions');
    await startServer();
    const sharedClientEnv = {
        ROXSTAR_MUTED: '1',
        ROXSTAR_DEVTOOLS: AUTO_OPEN_DEVTOOLS ? '1' : '0'
    };
    startClient('CLIENT-1', 'persist:roxstar_debug_1', '1', sharedClientEnv);
    startClient('CLIENT-2', 'persist:roxstar_debug_2', '2', sharedClientEnv);
    log('DEBUG', 'Both clients launched with auto-login!');
    log('DEBUG', 'Slot 1 and 2 mapped to usernames in server.json -> "debug-accounts".');
    log('DEBUG', 'Close both client windows or press Ctrl+C to shut everything down.');
}

main().catch((err) => {
    log('DEBUG', `Fatal error: ${err.message}`);
    cleanup();
});
