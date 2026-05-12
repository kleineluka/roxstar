const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const path = require('path');
const crypto = require('crypto');
const UserAgent = require('user-agents');
const { version } = require('./package.json');

// live-reload during development — watches all files, soft-reloads renderer, hard-restarts on main process change
try { require('electron-reloader')(module, { ignore: [/node_modules/, /flash/] }); } catch (_) {}

if (require('electron-squirrel-startup')) app.quit();

// internal config
const USE_RANDOM_PARTITION = false;
const ALLOW_MULTIPLE_INSTANCES = true;
const FLASH_PATH = path.join(__dirname, 'flash/pepflashplayer64_34_0_0_308');
const FLASH_VERSION = '34.0.0.308';
const DEFAULT_URL = process.env.ROXSTAR_URL || 'http://localhost:3000';

// partioning to isolate client data for multiple instances
let partitionName = process.env.ROXSTAR_PARTITION || 'persist:roxstar';
if (USE_RANDOM_PARTITION) {
  const rand = crypto.randomBytes(8).toString('hex');
  partitionName = `persist:roxstarinst_${rand}`;
}

// flash support arguments
app.commandLine.appendSwitch('ppapi-flash-path', FLASH_PATH);
app.commandLine.appendSwitch('ppapi-flash-version', FLASH_VERSION);
app.commandLine.appendSwitch('disable-http-cache');

// single instance lock
if (!ALLOW_MULTIPLE_INSTANCES) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) { app.quit(); }
  else {
    app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
    boot();
  }
} else {
  boot();
}

// cleanup on all windows closed (except on macOS where it's common for apps to stay open until explicitly quit)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

let mainWindow = null;
let _isMuted = process.env.ROXSTAR_MUTED === '1';
let _zoomFactor = 1.0;
let _webviewContents = null;

// main windows etup
function boot() {
  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); else if (mainWindow) mainWindow.focus(); });
  }).catch(err => { console.error('App ready error:', err); app.quit(); });
}

function createWindow() {
  const devtools = process.env.ROXSTAR_DEVTOOLS === '1';
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: devtools ? sw : 1270,
    height: devtools ? sh : 800,
    x: devtools ? 0 : undefined,
    y: devtools ? 0 : undefined,
    useContentSize: true,
    autoHideMenuBar: true,
    title: 'RoxStar Client',
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      webviewTag: true,
      partition: partitionName,
      plugins: true,
      preload: path.join(__dirname, 'src/preload.js'),
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src/renderer/index.html'));

  // expose config and controls to the renderer process
  ipcMain.handle('get-config', () => ({ defaultUrl: DEFAULT_URL, partition: partitionName, zoomFactor: _zoomFactor, muted: _isMuted, version, electronVersion: process.versions.electron, nodeVersion: process.versions.node, isDebugMode: process.env.ROXSTAR_DEBUG_MODE === '1' }));

  // audio controls
  ipcMain.on('audio-mute', (_, muted) => { 
    _isMuted = muted; 
    mainWindow.webContents.setAudioMuted(muted); 
    if (_webviewContents) _webviewContents.setAudioMuted(muted);
  });

  // zoom controls
  ipcMain.on('set-zoom', (_, factor) => { _zoomFactor = Math.max(0.3, Math.min(factor, 3.0)); mainWindow.webContents.setZoomFactor(_zoomFactor); });

  // cache controls
  ipcMain.handle('clear-cache', () => mainWindow.webContents.session.clearCache());

  // devtools shortcut
  ipcMain.on('open-devtools', () => (_webviewContents ?? mainWindow.webContents).openDevTools({ mode: 'detach' }));

  // reload shortcut (Ctrl+R or Cmd+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'r' && input.type === 'keyDown') {
      event.preventDefault();
      mainWindow.webContents.send('shortcut-reload');
    }
  });

  // context menu with reload, zoom, mute, and devtools options
  function buildContextMenu() {
    return Menu.buildFromTemplate([
      { label: '🔄️ Reload', click: () => mainWindow.webContents.send('shortcut-reload') },
      { type: 'separator' },
      { label: _isMuted ? '🔊 Unmute' : '🔇 Mute', click: () => {
          _isMuted = !_isMuted;
          mainWindow.webContents.setAudioMuted(_isMuted);
          if (_webviewContents) _webviewContents.setAudioMuted(_isMuted);
          mainWindow.webContents.send('mute-changed', _isMuted);
      }},
      { type: 'separator' },
      { label: '🔍 Zoom In', click: () => { _zoomFactor = +Math.min(_zoomFactor + 0.1, 3.0).toFixed(1); mainWindow.webContents.setZoomFactor(_zoomFactor); } },
      { label: '🔭 Zoom Out', click: () => { _zoomFactor = +Math.max(_zoomFactor - 0.1, 0.3).toFixed(1); mainWindow.webContents.setZoomFactor(_zoomFactor); } },
      { label: '♻️ Reset Zoom', click: () => { _zoomFactor = 1.0; mainWindow.webContents.setZoomFactor(1.0); } },
      { type: 'separator' },
      { label: '🔨 DevTools (Detached)', click: () => (_webviewContents ?? mainWindow.webContents).openDevTools({ mode: 'detach' }) },
    ]);
  }
  mainWindow.webContents.on('context-menu', () => buildContextMenu().popup({ window: mainWindow }));
  ipcMain.on('show-context-menu', () => buildContextMenu().popup({ window: mainWindow }));

  // cleanup on close
  mainWindow.on('closed', () => { mainWindow = null; ipcMain.removeAllListeners(); });

  // for the dev suite
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(_zoomFactor);
    if (process.env.ROXSTAR_MUTED === '1') mainWindow.webContents.setAudioMuted(true);
  });

  // track the webview's webContents so DevTools always targets the game, not the shell
  mainWindow.webContents.on('did-attach-webview', (_, webviewContents) => {
    _webviewContents = webviewContents;
    
    webviewContents.on('console-message', (_, level, msg, line, src) => {
      console.log(`[game ${src}:${line}] ${msg}`);
      if (mainWindow) {
        const methods = ['debug', 'log', 'warn', 'error'];
        const method = methods[level] || 'log';
        mainWindow.webContents.executeJavaScript(`console.${method}(${JSON.stringify('[game ' + src + ':' + line + '] ' + msg)})`).catch(() => {});
      }
    });

    if (_isMuted) {
      webviewContents.setAudioMuted(true);
    }

    if (devtools) {
      webviewContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => console.error(`Load failed [${code}]: ${desc}`));
  mainWindow.webContents.on('console-message', (_, _level, msg, line, src) => console.log(`[renderer ${src}:${line}] ${msg}`));

  const ua = new UserAgent();
  mainWindow.webContents.setUserAgent(ua.toString());
}