const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  /** Load persisted app data from ~/Library/Application Support/TimeBloom/ */
  loadData: () => ipcRenderer.invoke('store:load'),
  /** Save app data to disk */
  saveData: (data) => ipcRenderer.invoke('store:save', data),
  /** Get the path of the data file (shown in UI) */
  dataPath: () => ipcRenderer.invoke('store:path'),
  /** Scan git repos & lark docs for a given date (YYYY-MM-DD) */
  scanActivities: (date) => ipcRenderer.invoke('tracker:scan', date),
  /** Listen for scheduled scan notification click from main process */
  onOpenImport: (callback) => {
    ipcRenderer.on('tracker:open-import', (_, date) => callback(date));
  },
  /** Feishu Calendar */
  calendarAuth: () => ipcRenderer.invoke('calendar:auth'),
  calendarScan: (date) => ipcRenderer.invoke('calendar:scan', date),
  calendarStatus: () => ipcRenderer.invoke('calendar:status'),
  calendarLogout: () => ipcRenderer.invoke('calendar:logout'),
});
