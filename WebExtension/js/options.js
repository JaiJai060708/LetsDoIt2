// LetsDoIt Web Extension - Options Page Script
import {
  initDB,
  deleteAllData,
  getGoogleDriveSyncSettings,
  setGoogleDriveSyncSettings,
  syncFromGoogleDrive,
  extractGoogleDriveFileId,
  SYNC_RESULT,
} from './database.js';

// State
let googleDriveLink = '';
let googleDriveWriteEndpoint = '';
let googleDriveEnabled = false;
let googleDriveAutoSync = false;
let googleDriveLastSyncAt = null;
let isGoogleDriveSyncing = false;
let showAdvancedSync = false;
let isEditing = false;

// DOM Elements
const statusBadge = document.getElementById('statusBadge');
const cloudSetup = document.getElementById('cloudSetup');
const cloudConnected = document.getElementById('cloudConnected');
const readLinkInput = document.getElementById('readLinkInput');
const writeLinkInput = document.getElementById('writeLinkInput');
const advancedToggle = document.getElementById('advancedToggle');
const advancedChevron = document.getElementById('advancedChevron');
const advancedPanel = document.getElementById('advancedPanel');
const connectBtn = document.getElementById('connectBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const cloudFileLink = document.getElementById('cloudFileLink');
const editLinkBtn = document.getElementById('editLinkBtn');
const lastSyncTime = document.getElementById('lastSyncTime');
const autoSyncCheckbox = document.getElementById('autoSyncCheckbox');
const syncBtn = document.getElementById('syncBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const setupGuideBtn = document.getElementById('setupGuideBtn');
const setupGuideModal = document.getElementById('setupGuideModal');
const closeSetupGuideBtn = document.getElementById('closeSetupGuideBtn');
const doneSetupGuideBtn = document.getElementById('doneSetupGuideBtn');
const copyScriptBtn = document.getElementById('copyScriptBtn');
const copyBtnText = document.getElementById('copyBtnText');
const scriptCode = document.getElementById('scriptCode');
const toast = document.getElementById('toast');
const toastIcon = document.getElementById('toastIcon');
const toastMessage = document.getElementById('toastMessage');

// Initialize
async function init() {
  try {
    await initDB();
    await loadSettings();
    updateUI();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize:', error);
    showToast('Failed to load settings', 'error');
  }
}

// Load Google Drive settings
async function loadSettings() {
  const settings = await getGoogleDriveSyncSettings();
  googleDriveLink = settings.shareLink || '';
  googleDriveWriteEndpoint = settings.writeEndpoint || '';
  googleDriveEnabled = settings.enabled || false;
  googleDriveAutoSync = settings.autoSync || false;
  googleDriveLastSyncAt = settings.lastSyncAt || null;
  showAdvancedSync = !!settings.writeEndpoint;
}

// Update UI based on state
function updateUI() {
  if (googleDriveEnabled && !isEditing) {
    // Connected state
    cloudSetup.style.display = 'none';
    cloudConnected.style.display = 'flex';
    statusBadge.style.display = 'flex';
    
    // Truncate link for display
    cloudFileLink.textContent = googleDriveLink.length > 50 
      ? `${googleDriveLink.substring(0, 50)}...` 
      : googleDriveLink;
    
    lastSyncTime.textContent = formatLastSync(googleDriveLastSyncAt);
    autoSyncCheckbox.checked = googleDriveAutoSync;
  } else {
    // Setup state
    cloudSetup.style.display = 'flex';
    cloudConnected.style.display = 'none';
    statusBadge.style.display = googleDriveEnabled ? 'flex' : 'none';
    
    readLinkInput.value = googleDriveLink;
    writeLinkInput.value = googleDriveWriteEndpoint;
    
    cancelEditBtn.style.display = isEditing ? 'block' : 'none';
    connectBtn.textContent = isEditing ? 'Update Connection' : 'Connect to Drive';
    
    updateConnectButtonState();
    updateAdvancedPanel();
  }
  
  updateScriptCode();
}

// Update connect button state
function updateConnectButtonState() {
  const hasLink = readLinkInput.value.trim().length > 0;
  connectBtn.disabled = !hasLink && !googleDriveEnabled;
}

// Update advanced panel visibility
function updateAdvancedPanel() {
  advancedPanel.style.display = showAdvancedSync ? 'flex' : 'none';
  advancedChevron.classList.toggle('rotated', showAdvancedSync);
}

// Update script code in setup guide
function updateScriptCode() {
  const fileId = extractGoogleDriveFileId(googleDriveLink) || 'YOUR_FILE_ID_HERE';
  scriptCode.textContent = `// Google Apps Script for LetsDoIt Sync
const FILE_ID = '${fileId}';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const file = DriveApp.getFileById(FILE_ID);
    file.setContent(JSON.stringify(data, null, 2));
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
}

// Format last sync timestamp
function formatLastSync(isoString) {
  if (!isoString) return 'Never';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Show toast notification
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  
  toastIcon.className = `toast-icon ${type}`;
  toastIcon.innerHTML = type === 'success' 
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5" /></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12" /></svg>`;
  
  toast.style.display = 'flex';
  toast.classList.remove('hiding');
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 200);
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Read link input
  readLinkInput.addEventListener('input', () => {
    googleDriveLink = readLinkInput.value;
    updateConnectButtonState();
    updateScriptCode();
  });

  // Write link input
  writeLinkInput.addEventListener('input', () => {
    googleDriveWriteEndpoint = writeLinkInput.value;
  });

  // Advanced toggle
  advancedToggle.addEventListener('click', () => {
    showAdvancedSync = !showAdvancedSync;
    updateAdvancedPanel();
  });

  // Connect button
  connectBtn.addEventListener('click', handleConnect);

  // Cancel edit button
  cancelEditBtn.addEventListener('click', () => {
    isEditing = false;
    loadSettings().then(updateUI);
  });

  // Edit link button
  editLinkBtn.addEventListener('click', () => {
    isEditing = true;
    updateUI();
  });

  // Auto-sync checkbox
  autoSyncCheckbox.addEventListener('change', async () => {
    googleDriveAutoSync = autoSyncCheckbox.checked;
    await setGoogleDriveSyncSettings({ autoSync: googleDriveAutoSync });
    showToast(googleDriveAutoSync ? 'Auto-sync enabled' : 'Auto-sync disabled');
  });

  // Sync button
  syncBtn.addEventListener('click', handleSync);

  // Disconnect button
  disconnectBtn.addEventListener('click', handleDisconnect);

  // Delete all button
  deleteAllBtn.addEventListener('click', () => {
    deleteModal.style.display = 'flex';
  });

  // Cancel delete
  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
  });

  // Confirm delete
  confirmDeleteBtn.addEventListener('click', handleDeleteAll);

  // Delete modal overlay
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.style.display = 'none';
    }
  });

  // Setup guide button
  setupGuideBtn.addEventListener('click', () => {
    setupGuideModal.style.display = 'flex';
  });

  // Close setup guide
  closeSetupGuideBtn.addEventListener('click', () => {
    setupGuideModal.style.display = 'none';
  });

  doneSetupGuideBtn.addEventListener('click', () => {
    setupGuideModal.style.display = 'none';
  });

  // Setup guide modal overlay
  setupGuideModal.addEventListener('click', (e) => {
    if (e.target === setupGuideModal) {
      setupGuideModal.style.display = 'none';
    }
  });

  // Copy script button
  copyScriptBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(scriptCode.textContent);
    copyBtnText.textContent = 'Copied!';
    setTimeout(() => {
      copyBtnText.textContent = 'Copy Script';
    }, 2000);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      deleteModal.style.display = 'none';
      setupGuideModal.style.display = 'none';
    }
  });
}

// Handle connect
async function handleConnect() {
  try {
    await setGoogleDriveSyncSettings({
      shareLink: googleDriveLink,
      writeEndpoint: googleDriveWriteEndpoint,
      enabled: !!googleDriveLink,
    });
    
    googleDriveEnabled = !!googleDriveLink;
    isEditing = false;
    
    updateUI();
    showToast(googleDriveLink ? 'Google Drive settings saved!' : 'Google Drive link removed');
  } catch (error) {
    console.error('Failed to save Google Drive settings:', error);
    showToast('Failed to save Google Drive settings', 'error');
  }
}

// Handle sync
async function handleSync() {
  if (!googleDriveLink) {
    showToast('Please enter a Google Drive share link first', 'error');
    return;
  }
  
  isGoogleDriveSyncing = true;
  syncBtn.classList.add('syncing');
  syncBtn.querySelector('span').textContent = 'Syncing...';
  syncBtn.disabled = true;
  
  try {
    const result = await syncFromGoogleDrive();
    googleDriveLastSyncAt = new Date().toISOString();
    lastSyncTime.textContent = formatLastSync(googleDriveLastSyncAt);
    
    switch (result.action) {
      case SYNC_RESULT.PULLED:
        if (result.isFirstSync) {
          showToast(`First sync complete! Imported ${result.tasksImported} tasks, ${result.habitsImported} habits from cloud`);
        } else {
          showToast(`Pulled ${result.tasksImported} tasks, ${result.habitsImported} habits from cloud`);
        }
        break;
      case SYNC_RESULT.PUSHED:
        showToast('Data pushed to cloud successfully!');
        break;
      case SYNC_RESULT.UP_TO_DATE:
        showToast(result.note || 'Already up to date');
        break;
      default:
        showToast('Sync complete');
    }
  } catch (error) {
    console.error('Google Drive sync failed:', error);
    showToast(`Sync failed: ${error.message}`, 'error');
  } finally {
    isGoogleDriveSyncing = false;
    syncBtn.classList.remove('syncing');
    syncBtn.querySelector('span').textContent = 'Sync Now';
    syncBtn.disabled = false;
  }
}

// Handle disconnect
async function handleDisconnect() {
  googleDriveLink = '';
  googleDriveWriteEndpoint = '';
  googleDriveEnabled = false;
  googleDriveAutoSync = false;
  googleDriveLastSyncAt = null;
  showAdvancedSync = false;
  
  await setGoogleDriveSyncSettings({
    shareLink: '',
    writeEndpoint: '',
    enabled: false,
    autoSync: false,
    lastSyncAt: null,
  });
  
  updateUI();
  showToast('Google Drive disconnected');
}

// Handle delete all
async function handleDeleteAll() {
  try {
    await deleteAllData();
    deleteModal.style.display = 'none';
    showToast('All data has been deleted');
  } catch (error) {
    console.error('Delete failed:', error);
    showToast('Failed to delete data', 'error');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

