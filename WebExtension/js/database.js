// Database module for LetsDoIt Web Extension
// Uses IndexedDB for local storage with Google Drive sync support

const DB_NAME = 'LetsDoItDB';
const DB_VERSION = 5;
const TASKS_STORE = 'tasks';
const SETTINGS_STORE = 'settings';
const HABITS_STORE = 'habits';

// Device timezone setting key (stored in localStorage, not synced)
const DEVICE_TIMEZONE_KEY = 'letsdoit_device_timezone';

// Auto-sync callback - will be set by popup.js
let autoSyncCallback = null;

// ============================================
// Timezone Settings (Device-specific, not synced)
// ============================================

/**
 * Get the device timezone setting
 * Returns 'auto' for automatic detection or an IANA timezone string
 */
export function getDeviceTimezone() {
  try {
    return localStorage.getItem(DEVICE_TIMEZONE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Set the device timezone setting
 * This is stored locally and NOT synced
 */
export function setDeviceTimezone(timezone) {
  try {
    localStorage.setItem(DEVICE_TIMEZONE_KEY, timezone);
  } catch (e) {
    console.error('Failed to save device timezone:', e);
  }
}

/**
 * Get the effective timezone (resolves 'auto' to actual timezone)
 */
export function getEffectiveTimezone() {
  const setting = getDeviceTimezone();
  if (setting === 'auto') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return setting;
}

/**
 * Get list of common timezone options for the selector
 */
export function getTimezoneOptions() {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const timezones = [
    { value: 'auto', label: `Automatic (${browserTimezone})` },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
    { value: 'America/Anchorage', label: 'Alaska (AKST)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST)' },
    { value: 'America/Denver', label: 'Mountain Time (MST)' },
    { value: 'America/Chicago', label: 'Central Time (CST)' },
    { value: 'America/New_York', label: 'Eastern Time (EST)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'Atlantic/Reykjavik', label: 'Iceland (GMT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Seoul', label: 'Seoul (KST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Australia/Perth', label: 'Perth (AWST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  ];
  
  // Add browser timezone if not already in list
  if (!timezones.some(tz => tz.value === browserTimezone)) {
    timezones.splice(1, 0, { value: browserTimezone, label: `${browserTimezone} (Browser)` });
  }
  
  return timezones;
}

/**
 * Create a local timestamp string (without 'Z' suffix)
 * This represents local time without implicit UTC conversion
 */
export function createLocalTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Get today's date string in YYYY-MM-DD format for the effective timezone
 */
export function getCurrentLocalDateString() {
  const timezone = getEffectiveTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * Format a date to YYYY-MM-DD in a specific timezone
 */
export function formatDateInTimezone(date, timezone = getEffectiveTimezone()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * Set the callback function to trigger auto-sync after data modifications
 */
export function setAutoSyncCallback(callback) {
  autoSyncCallback = callback;
}

/**
 * Trigger auto-sync if callback is set
 */
function triggerAutoSync() {
  if (autoSyncCallback) {
    autoSyncCallback();
  }
}

// Default tags that come pre-configured
const DEFAULT_TAGS = [
  { id: 'personal', name: 'Personal', color: '#8b5cf6' },
  { id: 'work', name: 'Work', color: '#3b82f6' },
  { id: 'health', name: 'Health', color: '#10b981' },
  { id: 'errands', name: 'Errands', color: '#f59e0b' },
];

// Cache the database connection
let dbPromise = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      console.log(`Upgrading database from v${oldVersion} to v${DB_VERSION}`);

      // Tasks store (v1)
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const store = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        store.createIndex('dueDate', 'dueDate');
        store.createIndex('doneAt', 'doneAt');
        store.createIndex('createdAt', 'createdAt');
      }

      // Settings store (v2)
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }

      // Habits store (v4)
      if (!db.objectStoreNames.contains(HABITS_STORE)) {
        const habitsStore = db.createObjectStore(HABITS_STORE, { keyPath: 'id' });
        habitsStore.createIndex('date', 'date', { unique: true });
        habitsStore.createIndex('year', 'year');
      }
    };
  });

  // Initialize default tags if needed
  const db = await dbPromise;
  const tags = await getSetting('availableTags');
  if (!tags) {
    await setSetting('availableTags', DEFAULT_TAGS);
  }

  return dbPromise;
}

/**
 * Get all tasks from the database
 */
export async function getAllTasks() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readonly');
    const store = tx.objectStore(TASKS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single task by ID
 */
export async function getTask(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readonly');
    const store = tx.objectStore(TASKS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a new task
 */
export async function createTask(task) {
  const db = await initDB();
  const timestamp = createLocalTimestamp();
  const newTask = {
    ...task,
    id: task.id || crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    const store = tx.objectStore(TASKS_STORE);
    const request = store.add(newTask);
    request.onsuccess = async () => {
      await updateLocalDataTimestamp();
      triggerAutoSync();
      resolve(newTask);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing task
 */
export async function updateTask(id, updates) {
  const db = await initDB();
  const existingTask = await getTask(id);
  if (!existingTask) {
    throw new Error(`Task with id ${id} not found`);
  }

  const updatedTask = {
    ...existingTask,
    ...updates,
    id,
    updatedAt: createLocalTimestamp(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    const store = tx.objectStore(TASKS_STORE);
    const request = store.put(updatedTask);
    request.onsuccess = async () => {
      await updateLocalDataTimestamp();
      triggerAutoSync();
      resolve(updatedTask);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a task
 */
export async function deleteTask(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASKS_STORE, 'readwrite');
    const store = tx.objectStore(TASKS_STORE);
    const request = store.delete(id);
    request.onsuccess = async () => {
      await updateLocalDataTimestamp();
      triggerAutoSync();
      resolve(id);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a setting by key
 */
export async function getSetting(key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set a setting by key
 */
export async function setSetting(key, value) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get section expand states
 */
export async function getSectionExpandStates() {
  const states = await getSetting('sectionExpandStates');
  return states || {};
}

/**
 * Set expand state for a specific section
 */
export async function setSectionExpandState(sectionId, isExpanded) {
  const states = await getSectionExpandStates();
  states[sectionId] = isExpanded;
  await setSetting('sectionExpandStates', states);
  return states;
}

/**
 * Get all available tags
 */
export async function getAvailableTags() {
  const tags = await getSetting('availableTags');
  return tags || DEFAULT_TAGS;
}

/**
 * Add a new custom tag
 */
export async function addTag(tag) {
  const tags = await getAvailableTags();
  const timestamp = createLocalTimestamp();
  const newTag = {
    id: tag.id || crypto.randomUUID(),
    name: tag.name,
    color: tag.color || '#6b7280',
    deadline: tag.deadline || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  tags.push(newTag);
  await setSetting('availableTags', tags);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return newTag;
}

/**
 * Complete or uncomplete a tag (for tags with deadlines)
 */
export async function completeTag(tagId, isComplete = true) {
  const tags = await getAvailableTags();
  const index = tags.findIndex(t => t.id === tagId);
  if (index !== -1) {
    tags[index] = {
      ...tags[index],
      completedAt: isComplete ? new Date().toISOString() : null,
    };
    await setSetting('availableTags', tags);
    await updateLocalDataTimestamp();
    triggerAutoSync();
  }
  return tags;
}

// ============================================
// Habit Tracking Functions
// ============================================

/**
 * Get habit entry by date string (YYYY-MM-DD format)
 */
export async function getHabitByDate(dateStr) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HABITS_STORE, 'readonly');
    const store = tx.objectStore(HABITS_STORE);
    const index = store.index('date');
    const request = index.get(dateStr);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all habit entries
 */
export async function getAllHabits() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HABITS_STORE, 'readonly');
    const store = tx.objectStore(HABITS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create or update a habit entry for a specific date
 */
export async function upsertHabit(habitData) {
  const db = await initDB();
  const dateStr = habitData.date;
  const year = parseInt(dateStr.split('-')[0]);

  const existing = await getHabitByDate(dateStr);
  const timestamp = createLocalTimestamp();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(HABITS_STORE, 'readwrite');
    const store = tx.objectStore(HABITS_STORE);

    let entry;
    if (existing) {
      entry = {
        ...existing,
        ...habitData,
        year,
        updatedAt: timestamp,
      };
    } else {
      entry = {
        id: crypto.randomUUID(),
        ...habitData,
        year,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    }

    const request = store.put(entry);
    request.onsuccess = async () => {
      await updateLocalDataTimestamp();
      triggerAutoSync();
      resolve(entry);
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// Data Management Functions
// ============================================

/**
 * Export all data from the database
 */
export async function exportAllData() {
  const db = await initDB();

  const tasks = await getAllTasks();
  const habits = await getAllHabits();
  const localModifiedAt = await getLocalDataModifiedAt();

  const settingsKeys = ['availableTags', 'sectionExpandStates'];
  const settings = {};
  for (const key of settingsKeys) {
    const value = await getSetting(key);
    if (value !== undefined) {
      settings[key] = value;
    }
  }

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    localModifiedAt,
    data: {
      tasks,
      habits,
      settings,
    },
  };
}

/**
 * Import data from a backup
 */
export async function importAllData(importData, options = {}) {
  if (!importData || !importData.data) {
    throw new Error('Invalid import data format');
  }

  const { tasks = [], habits = [], settings = {} } = importData.data;
  const db = await initDB();

  // Clear existing data
  await new Promise((resolve, reject) => {
    const tx = db.transaction([TASKS_STORE, HABITS_STORE], 'readwrite');
    tx.objectStore(TASKS_STORE).clear();
    tx.objectStore(HABITS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Import tasks
  for (const task of tasks) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(TASKS_STORE, 'readwrite');
      const request = tx.objectStore(TASKS_STORE).put(task);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import habits
  for (const habit of habits) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HABITS_STORE, 'readwrite');
      const request = tx.objectStore(HABITS_STORE).put(habit);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import settings
  for (const [key, value] of Object.entries(settings)) {
    await setSetting(key, value);
  }

  if (!options.preserveLocalTimestamp) {
    const importedTimestamp = importData.localModifiedAt || importData.syncedAt || importData.exportedAt;
    if (importedTimestamp) {
      await setSetting('localDataModifiedAt', importedTimestamp);
    } else {
      await updateLocalDataTimestamp();
    }
  }

  return {
    tasksImported: tasks.length,
    habitsImported: habits.length,
    settingsImported: Object.keys(settings).length,
  };
}

/**
 * Delete all data from the database
 */
export async function deleteAllData() {
  const db = await initDB();

  await new Promise((resolve, reject) => {
    const tx = db.transaction([TASKS_STORE, HABITS_STORE, SETTINGS_STORE], 'readwrite');
    tx.objectStore(TASKS_STORE).clear();
    tx.objectStore(HABITS_STORE).clear();
    tx.objectStore(SETTINGS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Re-initialize default tags
  await setSetting('availableTags', DEFAULT_TAGS);

  return { success: true };
}

// ============================================
// Local Data Timestamp Tracking
// ============================================

export async function getLocalDataModifiedAt() {
  const timestamp = await getSetting('localDataModifiedAt');
  return timestamp || null;
}

export async function updateLocalDataTimestamp() {
  const timestamp = createLocalTimestamp();
  await setSetting('localDataModifiedAt', timestamp);
  return timestamp;
}

// ============================================
// Google Drive Sync Functions
// ============================================

export const SYNC_RESULT = {
  PULLED: 'pulled',
  PUSHED: 'pushed',
  UP_TO_DATE: 'upToDate',
  ERROR: 'error',
};

export async function getGoogleDriveSyncSettings() {
  const settings = await getSetting('googleDriveSync');
  return settings || {
    enabled: false,
    fileId: '',
    scriptEndpoint: '',
    lastSyncAt: null,
    autoSync: false,
  };
}

export async function setGoogleDriveSyncSettings(settings) {
  const current = await getGoogleDriveSyncSettings();
  const updated = { ...current, ...settings };
  await setSetting('googleDriveSync', updated);
  return updated;
}

/**
 * Extract file ID from Google Drive share link or URL
 * Accepts full share links or just the ID itself
 */
export function extractGoogleDriveFileId(input) {
  if (!input) return null;

  const trimmed = input.trim();

  // If it's already just an ID (no slashes or query params), return it
  if (!trimmed.includes('/') && !trimmed.includes('?') && trimmed.length > 20) {
    return trimmed;
  }

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];

  const ucMatch = trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) return ucMatch[1];

  return null;
}

/**
 * Fetch data from Google Drive using Google Apps Script
 * Uses a simple GET with NO custom headers to avoid CORS preflight
 */
export async function fetchFromGoogleDrive(scriptEndpoint, fileId) {
  if (!scriptEndpoint) {
    throw new Error('Google Apps Script endpoint is required. Please configure it in Settings.');
  }
  if (!fileId) {
    throw new Error('Google Drive file ID is required. Please configure it in Settings.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    console.log('Fetching from Google Drive via Apps Script...');
    const cacheBuster = Date.now();
    const url = `${scriptEndpoint}?fileId=${encodeURIComponent(fileId)}&_cb=${cacheBuster}`;

    // Simple fetch with NO custom headers to avoid CORS preflight
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || data.error);
    }

    console.log('✓ Successfully fetched data from Google Drive');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('✗ Failed to fetch from Google Drive:', error.message);

    let errorMsg = `Sync failed: ${error.message}\n\n`;

    if (error.name === 'AbortError') {
      errorMsg = 'Request timed out.\n\nCheck that your Apps Script URL is correct and the script is deployed.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMsg += 'Check that:\n';
      errorMsg += '1. Your Apps Script URL is correct\n';
      errorMsg += '2. The script is deployed as a Web App with "Who has access" set to "Anyone"\n';
      errorMsg += '3. You authorized the script when deploying\n';
    }

    throw new Error(errorMsg);
  }
}

/**
 * Push data to Google Drive using Google Apps Script
 * Uses text/plain content type to avoid CORS preflight
 */
export async function pushToGoogleDrive() {
  const settings = await getGoogleDriveSyncSettings();

  if (!settings.scriptEndpoint) {
    throw new Error('Google Apps Script endpoint not configured.');
  }
  if (!settings.fileId) {
    throw new Error('Google Drive file ID not configured.');
  }

  const exportData = await exportAllData();
  const syncData = {
    ...exportData,
    syncedAt: new Date().toISOString(),
    localModifiedAt: await getLocalDataModifiedAt(),
  };

  try {
    console.log('Pushing data to Google Drive via Apps Script...');

    // Use text/plain to avoid CORS preflight (application/json triggers preflight)
    const response = await fetch(`${settings.scriptEndpoint}?fileId=${encodeURIComponent(settings.fileId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify(syncData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      result = { success: true };
    }

    if (result.error) {
      throw new Error(result.message || result.error);
    }

    console.log('✓ Successfully pushed data to Google Drive');

    await setGoogleDriveSyncSettings({
      lastSyncAt: new Date().toISOString(),
    });

    return {
      action: SYNC_RESULT.PUSHED,
      timestamp: syncData.syncedAt,
    };
  } catch (error) {
    console.error('Failed to push to Google Drive:', error);
    throw new Error('Failed to push data to Google Drive: ' + error.message);
  }
}

export async function syncFromGoogleDrive() {
  const settings = await getGoogleDriveSyncSettings();

  if (!settings.scriptEndpoint) {
    throw new Error('Google Apps Script endpoint not configured. Please set it up in Settings.');
  }
  if (!settings.fileId) {
    throw new Error('Google Drive file ID not configured. Please set it up in Settings.');
  }

  const isFirstSync = !settings.lastSyncAt;

  const remoteData = await fetchFromGoogleDrive(settings.scriptEndpoint, settings.fileId);

  const localModifiedAt = await getLocalDataModifiedAt();
  const remoteModifiedAt = remoteData.localModifiedAt || remoteData.syncedAt || remoteData.exportedAt;

  // FIRST SYNC: Always pull from cloud
  if (isFirstSync) {
    console.log('First sync detected - pulling from Google Drive...');
    const importResult = await importAllData(remoteData, { preserveLocalTimestamp: true });

    if (remoteModifiedAt) {
      await setSetting('localDataModifiedAt', remoteModifiedAt);
    }

    await setGoogleDriveSyncSettings({
      lastSyncAt: new Date().toISOString(),
    });

    return {
      action: SYNC_RESULT.PULLED,
      tasksImported: importResult.tasksImported,
      habitsImported: importResult.habitsImported,
      localTimestamp: localModifiedAt,
      remoteTimestamp: remoteModifiedAt,
      isFirstSync: true,
    };
  }

  const localTime = localModifiedAt ? new Date(localModifiedAt).getTime() : 0;
  const remoteTime = remoteModifiedAt ? new Date(remoteModifiedAt).getTime() : 0;

  // Local is newer, push
  if (localTime > remoteTime) {
    console.log('Local data is newer, pushing to Google Drive...');
    await pushToGoogleDrive();
    return {
      action: SYNC_RESULT.PUSHED,
      localTimestamp: localModifiedAt,
      remoteTimestamp: remoteModifiedAt,
    };
  }

  // Remote is newer, pull
  if (remoteTime > localTime) {
    console.log('Remote data is newer, pulling from Google Drive...');
    const importResult = await importAllData(remoteData, { preserveLocalTimestamp: true });

    if (remoteModifiedAt) {
      await setSetting('localDataModifiedAt', remoteModifiedAt);
    }

    await setGoogleDriveSyncSettings({
      lastSyncAt: new Date().toISOString(),
    });

    return {
      action: SYNC_RESULT.PULLED,
      tasksImported: importResult.tasksImported,
      habitsImported: importResult.habitsImported,
      localTimestamp: localModifiedAt,
      remoteTimestamp: remoteModifiedAt,
    };
  }

  // Already in sync
  console.log('Data is already in sync');
  await setGoogleDriveSyncSettings({
    lastSyncAt: new Date().toISOString(),
  });

  return {
    action: SYNC_RESULT.UP_TO_DATE,
    localTimestamp: localModifiedAt,
    remoteTimestamp: remoteModifiedAt,
  };
}

