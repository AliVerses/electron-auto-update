// Get DOM elements
const nodeVersionEl = document.getElementById('node-version');
const electronVersionEl = document.getElementById('electron-version');
const notificationEl = document.getElementById('notification');
const checkUpdateBtn = document.getElementById('check-update-btn');
const triggerUpdateBtn = document.getElementById('trigger-update-btn');
const channelSelectEl = document.getElementById('channel-select');
const progressBarEl = document.getElementById('progress-bar');
const progressTextEl = document.getElementById('progress-text');

// Display version information
window.addEventListener('DOMContentLoaded', async () => {
  // Set versions
  nodeVersionEl.innerText = window.versions.node();
  electronVersionEl.innerText = window.versions.electron();
  
  // Set up update channel select
  const currentChannel = await window.updater.getCurrentChannel();
  channelSelectEl.value = currentChannel;
  
  // Register event listeners
  setupEventListeners();
  
  // Register for update events
  registerForUpdates();
});

function setupEventListeners() {
  // Change update channel
  channelSelectEl.addEventListener('change', async (event) => {
    const selectedChannel = event.target.value;
    const result = await window.updater.setUpdateChannel(selectedChannel);
    
    if (result.status === 'success') {
      showNotification(`Update channel changed to ${result.channel}`, 'info');
    } else {
      showNotification(`Error changing channel: ${result.error}`, 'error');
    }
  });
  
  // Check for updates
  checkUpdateBtn.addEventListener('click', async () => {
    showNotification('Checking for updates...', 'info');
    const result = await window.updater.checkForUpdates();
    
    if (result.status === 'error') {
      showNotification(`Error checking for updates: ${result.error}`, 'error');
    }
  });
  
  // Trigger update
  triggerUpdateBtn.addEventListener('click', async () => {
    showNotification('Installing update and restarting...', 'info');
    await window.updater.triggerUpdate();
  });
}

function registerForUpdates() {
  // Register for update status events
  window.updater.onUpdateStatus((data) => {
    console.log('Update status:', data);
    
    switch (data.type) {
      case 'checking':
        showNotification('Checking for updates...', 'info');
        hideUpdateButton();
        hideProgress();
        break;
        
      case 'available':
        showNotification(`Update available: ${data.data.version}`, 'info');
        hideUpdateButton();
        hideProgress();
        break;
        
      case 'not-available':
        showNotification('No updates available', 'info');
        hideUpdateButton();
        hideProgress();
        break;
        
      case 'error':
        showNotification(`Update error: ${data.data}`, 'error');
        hideUpdateButton();
        hideProgress();
        break;
        
      case 'progress':
        const percent = Math.round(data.data.percent);
        showProgress(percent);
        break;
        
      case 'downloaded':
        showNotification(`Update downloaded. Version ${data.data.version} will be installed on restart.`, 'success');
        showUpdateButton();
        hideProgress();
        break;
    }
  });
}

// Helper functions
function showNotification(message, type = 'info') {
  notificationEl.innerText = message;
  notificationEl.className = `notification ${type}`;
  notificationEl.style.display = 'block';
}

function showUpdateButton() {
  triggerUpdateBtn.style.display = 'inline-block';
}

function hideUpdateButton() {
  triggerUpdateBtn.style.display = 'none';
}

function showProgress(percent) {
  progressBarEl.style.display = 'block';
  progressBarEl.value = percent;
  progressTextEl.innerText = `Downloading update: ${percent}%`;
  progressTextEl.style.display = 'block';
}

function hideProgress() {
  progressBarEl.style.display = 'none';
  progressTextEl.style.display = 'none';
}
