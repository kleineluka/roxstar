const { contextBridge, ipcRenderer } = require('electron');

// expose a safe API to the renderer process
contextBridge.exposeInMainWorld('roxstar', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  setVolume: (vol) => ipcRenderer.send('audio-volume', vol),
  setMuted: (muted) => ipcRenderer.send('audio-mute', muted),
  openDevTools: () => ipcRenderer.send('open-devtools'),
  onReload: (cb) => ipcRenderer.on('shortcut-reload', cb),
  onMuteChanged: (cb) => ipcRenderer.on('mute-changed', (_, muted) => cb(muted)),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
});
