// Import Electron modules
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
log.transports.file.maxFiles = 5;
log.info('App starting...');

// Global references
let mainWindow = null;
let autoUpdater = null;
let updateChannel = 'stable'; // Options: stable, beta, dev

// Create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  return mainWindow;
}

// Send status updates to the renderer
function sendStatusToWindow(status, data) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { type: status, data });
  }
}

// Configure the update channel
function setUpdateChannel(channel) {
  if (!autoUpdater) return;
  
  updateChannel = channel;
  log.info(`Setting update channel to: ${channel}`);
  
  try {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: `https://dq860ai0sawu9.cloudfront.net/${channel}`,
      channel: channel,
    });
  } catch (err) {
    const errorMessage = err ? (err.message || err.toString()) : 'Unknown error setting feed URL';
    log.error('Error setting feed URL:', errorMessage);
  }
}

// Set up the auto-updater
function initAutoUpdater() {
  try {
    // Import electron-updater after app is ready
    const { autoUpdater: updater } = require('electron-updater');
    autoUpdater = updater;
    
    // Configure logging
    autoUpdater.logger = log;
    log.info('Auto updater initialized');
    
    // Set up event handlers
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates');
      sendStatusToWindow('checking');
    });
    
    autoUpdater.on('update-available', (info) => {
      log.info('Update available', info);
      sendStatusToWindow('available', info);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      log.info('No updates available');
      sendStatusToWindow('not-available');
    });
    
    autoUpdater.on('error', (err) => {
      const errorMessage = err ? (err.message || err.toString()) : 'Unknown update error';
      log.error('Update error', errorMessage);
      sendStatusToWindow('error', errorMessage);
    });
    
    autoUpdater.on('download-progress', (progress) => {
      log.info(`Download progress: ${Math.round(progress.percent)}%`);
      sendStatusToWindow('progress', progress);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded', info);
      sendStatusToWindow('downloaded', info);
    });
    
    // Set the feed URL
    setUpdateChannel(updateChannel);
    
    return true;
  } catch (err) {
    const errorMessage = err ? (err.message || err.toString()) : 'Unknown error';
    log.error('Failed to initialize auto-updater:', errorMessage);
    return false;
  }
}

// Set up IPC handlers
function setupIpc() {
  // Get current channel
  ipcMain.handle('get-current-channel', () => {
    return updateChannel;
  });
  
  // Set update channel
  ipcMain.handle('set-update-channel', (event, channel) => {
    if (!channel || !['stable', 'beta', 'dev'].includes(channel)) {
      return { status: 'error', message: 'Invalid channel' };
    }
    
    setUpdateChannel(channel);
    return { status: 'success', channel };
  });
  
  // Check for updates
  ipcMain.handle('check-for-updates', async () => {
    if (!autoUpdater) {
      return { status: 'error', message: 'Auto-updater not initialized' };
    }
    
    try {
      log.info('Manually checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      log.info('Check for updates result:', result);
      return { status: 'checking' };
    } catch (err) {
      const errorMessage = err ? (err.message || err.toString()) : 'Unknown error';
      log.error('Error checking for updates:', errorMessage);
      return { status: 'error', message: errorMessage };
    }
  });
  
  // Trigger update installation
  ipcMain.handle('trigger-update', () => {
    if (!autoUpdater) {
      return { status: 'error', message: 'Auto-updater not initialized' };
    }
    
    try {
      log.info('Installing update and restarting...');
      autoUpdater.quitAndInstall(true, true);
      return { status: 'installing' };
    } catch (err) {
      const errorMessage = err ? (err.message || err.toString()) : 'Unknown error installing update';
      log.error('Error installing update:', errorMessage);
      return { status: 'error', message: errorMessage };
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  log.info('App is ready');
  
  // Create the main window
  createWindow();
  
  // Set up IPC handlers
  setupIpc();
  
  // Initialize auto-updater
  if (initAutoUpdater()) {
    // Check for updates after a delay
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        const errorMessage = err ? (err.message || err.toString()) : 'Unknown error';
        log.error('Error checking for updates:', errorMessage);
      });
    }, 3000);
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS it's common to re-create a window when the dock icon is clicked
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
