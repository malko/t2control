const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setAiMode: (mode, deviceId, pid) => ipcRenderer.send('set-ai-mode', { mode, deviceId, pid }),
  listDevices: () => ipcRenderer.send('list-devices'),
  onDeviceList: (callback) => ipcRenderer.on('device-list', (_event, value) => callback(value)),
  scanObsbotDevices: () => ipcRenderer.send('scan-obsbot-devices'),
  onObsbotScanResults: (callback) => ipcRenderer.on('obsbot-scan-results', (_event, value) => callback(value)),
  onAiModeComplete: (callback) => ipcRenderer.on('ai-mode-complete', (_event, value) => callback(value))
});
