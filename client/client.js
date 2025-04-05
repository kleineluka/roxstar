const { app, BrowserWindow } = require('electron');
const path = require('path');
const UserAgent = require('user-agents');
const userAgent = new UserAgent();
const crypto = require('crypto');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
const use_random_partition = false;
function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
const partitionName = generateRandomString(16);
let partition_name = 'persist:roxstar';
if (use_random_partition) {
  partition_name = `persist:roxstarinst_${partitionName}`;
}

const singleLock = app.requestSingleInstanceLock();
if (!singleLock) {
  console.log("Another instance is running, quitting this one.");
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log("Second instance detected, focusing main window.");
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    console.log("App is ready! Creating window...");
    app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, 'flash/pepflashplayer64_34_0_0_308'));
    app.commandLine.appendSwitch('ppapi-flash-version', '34.0.0.308');
    app.commandLine.appendSwitch("disable-http-cache");
    createWindow();
    app.on('activate', function () {
      console.log("Activate event triggered.");
      if (BrowserWindow.getAllWindows().length === 0) {
        console.log("No windows open, creating new one.");
        createWindow();
      } else {
        console.log("Windows already open.");
        if(mainWindow) mainWindow.focus();
      }
    });
  }).catch(err => {
    console.error("Error during app ready:", err);
    app.quit();
  });
}

app.on('window-all-closed', function () {
  console.log("All windows closed.");
  if (process.platform !== 'darwin') {
    console.log("Quitting app (not macOS).");
    app.quit();
  } else {
    console.log("Not quitting automatically (macOS).");
  }
});

function createWindow() {
  console.log("Executing createWindow function...");
  mainWindow = new BrowserWindow({
    width: 1270,
    height: 800,
    useContentSize: true,
    show: true,
    autoHideMenuBar: true,
    title: "Launching Client...",
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      sandbox: false,
      webSecurity: false,
      partition: partition_name,
      plugins: true
    }
  });

  console.log(`Using partition: ${partition_name}`);
  mainWindow.webContents.setUserAgent(userAgent.toString());
  console.log(`Set User Agent: ${userAgent.toString()}`);
  mainWindow.setMenu(null);
  console.log("Attempting to clear cache...");
  mainWindow.webContents.session.clearCache().then(() => {
    console.log("Cache cleared (maybe). Loading URL...");
    mainWindow.loadURL('http://localhost:3000');
    console.log("Load URL command issued for http://localhost:3000");
  }).catch(err => {
    console.error("Failed to clear cache:", err);
    mainWindow.loadURL('http://localhost:3000');
    console.log("Load URL command issued after cache clear failure.");
  });

  mainWindow.on('closed', function () {
    console.log("Main window closed.");
    mainWindow = null;
  });
 
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load URL: ${errorDescription} (Code: ${errorCode})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log("WebContents finished loading.");
    mainWindow.setTitle("RoxStar Client");
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer Console [${sourceId}:${line}]: ${message}`);
  });

}