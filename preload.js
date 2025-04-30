const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  electron: () => process.versions.electron
});

// Expose API for update functionality
contextBridge.exposeInMainWorld('updater', {
  // Check for updates, optionally specify channel
  checkForUpdates: (channel) => ipcRenderer.invoke('check-for-updates', channel),
  
  // Get current update channel
  getCurrentChannel: () => ipcRenderer.invoke('get-current-channel'),
  
  // Set update channel
  setUpdateChannel: (channel) => ipcRenderer.invoke('set-update-channel', channel),
  
  // Trigger update download and installation
  triggerUpdate: () => ipcRenderer.invoke('trigger-update'),
  
  // Register for update status events
  onUpdateStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('update-status', subscription);
    return () => {
      ipcRenderer.removeListener('update-status', subscription);
    };
  }
});
