import { openDB, deleteDB } from 'idb';

const DB_NAME = 'LetsDoItDB';
const DB_VERSION = 9;
const TASKS_STORE = 'tasks';
const SETTINGS_STORE = 'settings';
const HABITS_STORE = 'habits';

// Auto-sync callback - will be set by SyncContext
let autoSyncCallback = null;

/**
 * Set the callback function to trigger auto-sync after data modifications
 * This is called by SyncContext when it mounts
 */
export function setAutoSyncCallback(callback) {
  autoSyncCallback = callback;
}

/**
 * Trigger auto-sync if callback is set
 * Called after data modifications when auto-sync is enabled
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

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`Upgrading database from v${oldVersion} to v${newVersion}`);
      
      // Tasks store (v1)
      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const store = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        store.createIndex('dueDate', 'dueDate');
        store.createIndex('doneAt', 'doneAt');
        store.createIndex('createdAt', 'createdAt');
      }
      // Settings store (v2)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      }
      // Tags support (v3) - initialize default tags
      if (oldVersion < 3) {
        const settingsStore = transaction.objectStore(SETTINGS_STORE);
        settingsStore.put({ key: 'availableTags', value: DEFAULT_TAGS });
      }
      // Habits store (v4) - for mood/habit tracking
      if (!db.objectStoreNames.contains(HABITS_STORE)) {
        const habitsStore = db.createObjectStore(HABITS_STORE, { keyPath: 'id' });
        habitsStore.createIndex('date', 'date', { unique: true });
        habitsStore.createIndex('year', 'year');
        console.log('Created habits store');
      }
    },
    blocked() {
      console.warn('Database upgrade blocked. Please close other tabs using this app.');
    },
    blocking() {
      // Close the connection to unblock the upgrade
      dbPromise?.then(db => db.close());
      dbPromise = null;
    },
  });

  return dbPromise;
}

/**
 * Force re-initialize the database connection
 * Useful when the database schema has changed
 */
export async function reinitDB() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  return initDB();
}

/**
 * Get all tasks from the database
 */
export async function getAllTasks() {
  const db = await initDB();
  return db.getAll(TASKS_STORE);
}

/**
 * Get a single task by ID
 */
export async function getTask(id) {
  const db = await initDB();
  return db.get(TASKS_STORE, id);
}

/**
 * Create a new task
 */
export async function createTask(task) {
  const db = await initDB();
  const newTask = {
    ...task,
    id: task.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.add(TASKS_STORE, newTask);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return newTask;
}

/**
 * Update an existing task
 */
export async function updateTask(id, updates) {
  const db = await initDB();
  const existingTask = await db.get(TASKS_STORE, id);
  if (!existingTask) {
    throw new Error(`Task with id ${id} not found`);
  }
  const updatedTask = {
    ...existingTask,
    ...updates,
    id, // Ensure ID doesn't change
    updatedAt: new Date().toISOString(),
  };
  await db.put(TASKS_STORE, updatedTask);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return updatedTask;
}

/**
 * Delete a task
 */
export async function deleteTask(id) {
  const db = await initDB();
  await db.delete(TASKS_STORE, id);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return id;
}

/**
 * Get tasks filtered by date range
 */
export async function getTasksByDateRange(startDate, endDate) {
  const tasks = await getAllTasks();
  return tasks.filter((task) => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate >= startDate && taskDate < endDate;
  });
}

/**
 * Get tasks with no due date (someday tasks)
 */
export async function getSomedayTasks() {
  const tasks = await getAllTasks();
  return tasks.filter((task) => !task.dueDate);
}

/**
 * Get unfinished tasks that are past their due date
 */
export async function getUnfinishedPastTasks(beforeDate) {
  const tasks = await getAllTasks();
  return tasks.filter((task) => {
    if (!task.dueDate || task.doneAt) return false;
    const taskDate = new Date(task.dueDate);
    return taskDate < beforeDate;
  });
}

/**
 * Clear all tasks (useful for testing)
 */
export async function clearAllTasks() {
  const db = await initDB();
  await db.clear(TASKS_STORE);
}

/**
 * Get a setting by key
 */
export async function getSetting(key) {
  const db = await initDB();
  const result = await db.get(SETTINGS_STORE, key);
  return result?.value;
}

/**
 * Set a setting by key
 */
export async function setSetting(key, value) {
  const db = await initDB();
  await db.put(SETTINGS_STORE, { key, value });
}

/**
 * Get section expand states
 * Returns an object with section IDs as keys and boolean expand states as values
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
  const newTag = {
    id: tag.id || crypto.randomUUID(),
    name: tag.name,
    color: tag.color || '#6b7280',
    deadline: tag.deadline || null, // ISO date string or null
  };
  tags.push(newTag);
  await setSetting('availableTags', tags);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return newTag;
}

/**
 * Update an existing tag
 */
export async function updateTag(tagId, updates) {
  const tags = await getAvailableTags();
  const index = tags.findIndex(t => t.id === tagId);
  if (index !== -1) {
    // Explicitly handle deadline to allow setting it to null
    const updatedTag = { ...tags[index], ...updates };
    if ('deadline' in updates) {
      updatedTag.deadline = updates.deadline;
    }
    tags[index] = updatedTag;
    await setSetting('availableTags', tags);
    await updateLocalDataTimestamp();
    triggerAutoSync();
  }
  return tags;
}

/**
 * Delete a tag
 */
export async function deleteTag(tagId) {
  const tags = await getAvailableTags();
  const filtered = tags.filter(t => t.id !== tagId);
  await setSetting('availableTags', filtered);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return filtered;
}

// ============================================
// Habit Tracking Functions
// ============================================

/**
 * Ensure the habits store exists, reinitialize DB if needed
 */
async function ensureHabitsStore() {
  let db = await initDB();
  
  // Check if habits store exists
  if (!db.objectStoreNames.contains(HABITS_STORE)) {
    console.log('Habits store not found, forcing database upgrade...');
    // Close current connection
    db.close();
    dbPromise = null;
    
    // Force upgrade by opening with a higher version
    const currentVersion = db.version;
    db = await openDB(DB_NAME, currentVersion + 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(HABITS_STORE)) {
          const habitsStore = database.createObjectStore(HABITS_STORE, { keyPath: 'id' });
          habitsStore.createIndex('date', 'date', { unique: true });
          habitsStore.createIndex('year', 'year');
          console.log('Created habits store via forced upgrade');
        }
      },
    });
    
    // Update the cached promise
    dbPromise = Promise.resolve(db);
  }
  
  return db;
}

/**
 * Get all habit entries
 */
export async function getAllHabits() {
  const db = await ensureHabitsStore();
  return db.getAll(HABITS_STORE);
}

/**
 * Get habit entries for a specific year
 */
export async function getHabitsByYear(year) {
  const db = await ensureHabitsStore();
  const allHabits = await db.getAll(HABITS_STORE);
  return allHabits.filter(h => h.year === year);
}

/**
 * Get a habit entry by date string (YYYY-MM-DD format)
 */
export async function getHabitByDate(dateStr) {
  const db = await ensureHabitsStore();
  const tx = db.transaction(HABITS_STORE, 'readonly');
  const index = tx.store.index('date');
  return index.get(dateStr);
}

/**
 * Create or update a habit entry for a specific date
 */
export async function upsertHabit(habitData) {
  const db = await ensureHabitsStore();
  const dateStr = habitData.date; // Expected format: YYYY-MM-DD
  const year = parseInt(dateStr.split('-')[0]);
  
  // Check if entry exists for this date
  const existing = await getHabitByDate(dateStr);
  
  if (existing) {
    // Update existing
    const updated = {
      ...existing,
      ...habitData,
      year,
      updatedAt: new Date().toISOString(),
    };
    await db.put(HABITS_STORE, updated);
    await updateLocalDataTimestamp();
    triggerAutoSync();
    return updated;
  } else {
    // Create new
    const newEntry = {
      id: crypto.randomUUID(),
      ...habitData,
      year,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.add(HABITS_STORE, newEntry);
    await updateLocalDataTimestamp();
    triggerAutoSync();
    return newEntry;
  }
}

/**
 * Delete a habit entry
 */
export async function deleteHabit(id) {
  const db = await ensureHabitsStore();
  await db.delete(HABITS_STORE, id);
  await updateLocalDataTimestamp();
  triggerAutoSync();
  return id;
}

/**
 * Get habit statistics for a year
 */
export async function getHabitStats(year) {
  const habits = await getHabitsByYear(year);
  
  if (habits.length === 0) {
    return {
      count: 0,
      average: 0,
      best: 0,
      worst: 0,
      streak: 0,
    };
  }
  
  const scores = habits.map(h => h.score).filter(s => s !== undefined && s !== null);
  const sum = scores.reduce((a, b) => a + b, 0);
  
  return {
    count: scores.length,
    average: scores.length > 0 ? (sum / scores.length).toFixed(1) : 0,
    best: Math.max(...scores),
    worst: Math.min(...scores),
  };
}

// ============================================
// Data Management Functions (Export/Import/Delete)
// ============================================

/**
 * Export all data from the database
 * Returns an object containing all tasks, settings, and habits
 */
export async function exportAllData() {
  const db = await initDB();
  
  const tasks = await db.getAll(TASKS_STORE);
  const habits = await db.getAll(HABITS_STORE);
  const localModifiedAt = await getLocalDataModifiedAt();
  
  // Get all user settings (excludes device-specific settings like googleDriveSync and theme)
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
    localModifiedAt: localModifiedAt, // Include sync timestamp
    data: {
      tasks,
      habits,
      settings,
    },
  };
}

/**
 * Import data from a backup file
 * Replaces all existing data with the imported data
 * @param {object} importData - The data to import
 * @param {object} options - Import options
 * @param {boolean} options.preserveLocalTimestamp - If true, don't update localDataModifiedAt (used by sync)
 */
export async function importAllData(importData, options = {}) {
  if (!importData || !importData.data) {
    throw new Error('Invalid import data format');
  }
  
  const { tasks = [], habits = [], settings = {} } = importData.data;
  const db = await initDB();
  
  // Clear existing data
  await db.clear(TASKS_STORE);
  await db.clear(HABITS_STORE);
  
  // Import tasks
  const tx1 = db.transaction(TASKS_STORE, 'readwrite');
  for (const task of tasks) {
    await tx1.store.put(task);
  }
  await tx1.done;
  
  // Import habits
  const tx2 = db.transaction(HABITS_STORE, 'readwrite');
  for (const habit of habits) {
    await tx2.store.put(habit);
  }
  await tx2.done;
  
  // Import settings (user preferences only, preserves device-specific settings like googleDriveSync)
  for (const [key, value] of Object.entries(settings)) {
    await setSetting(key, value);
  }
  
  // Update the local data timestamp unless explicitly told not to
  // This ensures sync operations work correctly after import
  if (!options.preserveLocalTimestamp) {
    // Use the timestamp from the imported data if available, otherwise use current time
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
 * This action is irreversible!
 */
export async function deleteAllData() {
  const db = await initDB();
  
  // Clear all stores
  await db.clear(TASKS_STORE);
  await db.clear(HABITS_STORE);
  await db.clear(SETTINGS_STORE);
  
  // Re-initialize default tags
  await setSetting('availableTags', DEFAULT_TAGS);
  
  return { success: true };
}

// ============================================
// Local Data Timestamp Tracking
// ============================================

/**
 * Get the timestamp of when local data was last modified
 */
export async function getLocalDataModifiedAt() {
  const timestamp = await getSetting('localDataModifiedAt');
  return timestamp || null;
}

/**
 * Update the local data modification timestamp
 * Called whenever tasks or habits are created, updated, or deleted
 */
export async function updateLocalDataTimestamp() {
  const timestamp = new Date().toISOString();
  await setSetting('localDataModifiedAt', timestamp);
  return timestamp;
}

// ============================================
// Device Timezone Settings (not synced)
// ============================================

/**
 * Get the configured device timezone
 * This is device-specific and NOT synced
 * Returns IANA timezone string (e.g., 'America/Los_Angeles', 'Europe/Berlin')
 */
export async function getDeviceTimezone() {
  const tz = await getSetting('deviceTimezone');
  // Default to browser's timezone if not set
  return tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Set the device timezone
 * This is device-specific and NOT synced
 * @param {string} timezone - IANA timezone string
 */
export async function setDeviceTimezone(timezone) {
  await setSetting('deviceTimezone', timezone);
  return timezone;
}

/**
 * Get the current local date string (YYYY-MM-DD) in the configured timezone
 */
export async function getCurrentLocalDateString() {
  const timezone = await getDeviceTimezone();
  return formatDateInTimezone(new Date(), timezone);
}

/**
 * Format a date to YYYY-MM-DD string in a specific timezone
 * @param {Date} date - The date to format
 * @param {string} timezone - IANA timezone string
 * @returns {string} - YYYY-MM-DD formatted string
 */
export function formatDateInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Create a UTC ISO string that preserves the local date meaning
 * Stores as noon UTC to avoid date boundary issues
 * @param {string} localDateStr - YYYY-MM-DD format
 * @returns {object} - { utcTimestamp, localDate, timezone }
 */
export function createDateWithTimezone(localDateStr, timezone) {
  // Store the local date string directly (this is the user's intent)
  // Also store a UTC reference point (noon on that day in UTC)
  // and the timezone for reference
  const [year, month, day] = localDateStr.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  return {
    utcTimestamp: utcNoon.toISOString(),
    localDate: localDateStr,
    timezone: timezone,
  };
}

/**
 * Extract the local date string from a stored date
 * Handles both new format (with localDate) and legacy format (ISO string only)
 * @param {string|object} storedDate - Either an ISO string or { utcTimestamp, localDate, timezone }
 * @returns {string} - YYYY-MM-DD format
 */
export function extractLocalDate(storedDate) {
  if (!storedDate) return null;
  
  // New format: object with localDate
  if (typeof storedDate === 'object' && storedDate.localDate) {
    return storedDate.localDate;
  }
  
  // Legacy format: ISO string - extract the date part
  // For legacy dates, we parse and format to get YYYY-MM-DD
  if (typeof storedDate === 'string') {
    // If it's already YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(storedDate)) {
      return storedDate;
    }
    // ISO string - extract date portion, handling timezone
    // We treat the stored time as the intended local date
    const date = new Date(storedDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

// ============================================
// Google Drive Sync Functions
// ============================================

// Sync result types
export const SYNC_RESULT = {
  PULLED: 'pulled',      // Remote was newer, pulled data
  PUSHED: 'pushed',      // Local was newer, pushed data
  UP_TO_DATE: 'upToDate', // Already in sync
  ERROR: 'error',
};

/**
 * Get Google Drive sync settings
 */
export async function getGoogleDriveSyncSettings() {
  const settings = await getSetting('googleDriveSync');
  return settings || {
    enabled: false,
    shareLink: '',
    writeEndpoint: '', // Google Apps Script Web App URL for writing
    lastSyncAt: null,
    autoSync: false,
  };
}

/**
 * Save Google Drive sync settings
 */
export async function setGoogleDriveSyncSettings(settings) {
  const current = await getGoogleDriveSyncSettings();
  const updated = { ...current, ...settings };
  await setSetting('googleDriveSync', updated);
  return updated;
}

/**
 * Convert a Google Drive share link to a direct download URL
 * Handles formats like:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 */
export function convertGoogleDriveLinkToDirectUrl(shareLink) {
  if (!shareLink) return null;
  
  let url = shareLink.trim();
  
  // Extract file ID from various Google Drive URL formats
  let fileId = null;
  
  // Format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    fileId = fileMatch[1];
  }
  
  // Format: https://drive.google.com/open?id=FILE_ID
  if (!fileId) {
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }
  }
  
  // Format: https://drive.google.com/uc?id=FILE_ID&export=download (already direct)
  if (!fileId) {
    const ucMatch = url.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) {
      fileId = ucMatch[1];
    }
  }
  
  return fileId;
}

/**
 * Extract file ID from Google Drive share link
 */
export function extractGoogleDriveFileId(shareLink) {
  return convertGoogleDriveLinkToDirectUrl(shareLink);
}

/**
 * Fetch with timeout wrapper and cache-busting
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      // Disable caching
      cache: 'no-store',
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

/**
 * Fetch data from a Google Drive shared file
 * Uses multiple CORS proxies with fallback for reliability
 * Includes cache-busting to always get fresh data
 */
export async function fetchFromGoogleDrive(shareLink) {
  const fileId = extractGoogleDriveFileId(shareLink);
  
  if (!fileId) {
    throw new Error('Invalid Google Drive share link');
  }
  
  // Add cache-busting timestamp to the URL
  const cacheBuster = Date.now();
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}&_cb=${cacheBuster}`;
  
  // List of CORS proxies to try (in order of preference)
  // Each proxy URL includes a cache-buster parameter
  const corsProxies = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}&_t=${cacheBuster}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&_t=${cacheBuster}`,
    (url) => `https://cors-anywhere.herokuapp.com/${url}`,
  ];
  
  let lastError = null;
  
  // Try each proxy until one works
  for (const proxyFn of corsProxies) {
    const proxyUrl = proxyFn(directUrl);
    
    try {
      console.log(`Trying CORS proxy: ${proxyUrl.split('?')[0]}... (cache-buster: ${cacheBuster})`);
      const response = await fetchWithTimeout(proxyUrl, {}, 20000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      
      // Check if we got an HTML error page instead of JSON
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of JSON - file may not be publicly accessible');
      }
      
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        console.log('Successfully fetched fresh data from Google Drive');
        return data;
      } catch (e) {
        throw new Error('Failed to parse response as JSON');
      }
    } catch (error) {
      console.warn(`Proxy failed: ${error.message}`);
      lastError = error;
      // Continue to next proxy
    }
  }
  
  // All proxies failed
  throw new Error(`Failed to fetch from Google Drive after trying all proxies. Last error: ${lastError?.message || 'Unknown error'}. Make sure the file is shared publicly ("Anyone with the link can view").`);
}

/**
 * Push data to Google Drive using a Google Apps Script Web App
 * The web app URL should be set in writeEndpoint setting
 */
export async function pushToGoogleDrive() {
  const settings = await getGoogleDriveSyncSettings();
  
  if (!settings.writeEndpoint) {
    throw new Error('No write endpoint configured. Please set up a Google Apps Script Web App.');
  }
  
  // Export all local data
  const exportData = await exportAllData();
  
  // Add sync metadata
  const syncData = {
    ...exportData,
    syncedAt: new Date().toISOString(),
    localModifiedAt: await getLocalDataModifiedAt(),
  };
  
  try {
    const response = await fetch(settings.writeEndpoint, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script requires no-cors for POST
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(syncData),
    });
    
    // Note: with no-cors mode, we can't read the response
    // We'll assume success if no error is thrown
    
    // Update last sync timestamp
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

/**
 * Sync data with Google Drive
 * Compares local and remote timestamps and syncs accordingly:
 * - FIRST SYNC (never synced before): Always pull from Google Drive, replacing local data
 * - If remote is newer: pull from Google Drive
 * - If local is newer: push to Google Drive
 * - If same: no action needed
 */
export async function syncFromGoogleDrive() {
  const settings = await getGoogleDriveSyncSettings();
  
  if (!settings.shareLink) {
    throw new Error('No Google Drive share link configured');
  }
  
  // Check if this is the first sync (never synced before)
  const isFirstSync = !settings.lastSyncAt;
  
  // Fetch remote data
  const remoteData = await fetchFromGoogleDrive(settings.shareLink);
  
  // Get timestamps
  const localModifiedAt = await getLocalDataModifiedAt();
  const remoteModifiedAt = remoteData.localModifiedAt || remoteData.syncedAt || remoteData.exportedAt;
  
  // FIRST SYNC: Always pull from cloud, replacing local data (no push allowed)
  if (isFirstSync) {
    console.log('First sync detected - pulling from Google Drive and replacing local data...');
    // Use preserveLocalTimestamp: true so we can set it to remote timestamp ourselves
    const importResult = await importAllData(remoteData, { preserveLocalTimestamp: true });
    
    // Set the local modified timestamp to match the remote
    // This prevents immediate re-sync
    if (remoteModifiedAt) {
      await setSetting('localDataModifiedAt', remoteModifiedAt);
    }
    
    // Update last sync timestamp (marks that first sync is complete)
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
  
  // Compare timestamps for subsequent syncs
  const localTime = localModifiedAt ? new Date(localModifiedAt).getTime() : 0;
  const remoteTime = remoteModifiedAt ? new Date(remoteModifiedAt).getTime() : 0;
  
  // If local is newer and we have a write endpoint, push
  if (localTime > remoteTime && settings.writeEndpoint) {
    console.log('Local data is newer, pushing to Google Drive...');
    const result = await pushToGoogleDrive();
    return {
      action: SYNC_RESULT.PUSHED,
      localTimestamp: localModifiedAt,
      remoteTimestamp: remoteModifiedAt,
    };
  }
  
  // If remote is newer, pull
  if (remoteTime > localTime) {
    console.log('Remote data is newer, pulling from Google Drive...');
    // Use preserveLocalTimestamp: true so we can set it to remote timestamp ourselves
    const importResult = await importAllData(remoteData, { preserveLocalTimestamp: true });
    
    // Set the local modified timestamp to match the remote
    // This prevents immediate re-sync
    if (remoteModifiedAt) {
      await setSetting('localDataModifiedAt', remoteModifiedAt);
    }
    
    // Update last sync timestamp
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
  
  // If local is newer but no write endpoint, still report success but note that push isn't available
  if (localTime > remoteTime && !settings.writeEndpoint) {
    console.log('Local data is newer but no write endpoint configured');
    // Update last sync timestamp anyway
    await setGoogleDriveSyncSettings({
      lastSyncAt: new Date().toISOString(),
    });
    
    return {
      action: SYNC_RESULT.UP_TO_DATE, // Can't push, so consider it up to date
      localTimestamp: localModifiedAt,
      remoteTimestamp: remoteModifiedAt,
      note: 'Local data is newer. Configure write endpoint to enable push.',
    };
  }
  
  // Timestamps are equal or both null - already in sync
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

