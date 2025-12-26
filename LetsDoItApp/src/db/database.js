import { openDB, deleteDB } from 'idb';

const DB_NAME = 'LetsDoItDB';
const DB_VERSION = 5;
const TASKS_STORE = 'tasks';
const SETTINGS_STORE = 'settings';
const HABITS_STORE = 'habits';

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
  return updatedTask;
}

/**
 * Delete a task
 */
export async function deleteTask(id) {
  const db = await initDB();
  await db.delete(TASKS_STORE, id);
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
  };
  tags.push(newTag);
  await setSetting('availableTags', tags);
  return newTag;
}

/**
 * Update an existing tag
 */
export async function updateTag(tagId, updates) {
  const tags = await getAvailableTags();
  const index = tags.findIndex(t => t.id === tagId);
  if (index !== -1) {
    tags[index] = { ...tags[index], ...updates };
    await setSetting('availableTags', tags);
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
    return newEntry;
  }
}

/**
 * Delete a habit entry
 */
export async function deleteHabit(id) {
  const db = await ensureHabitsStore();
  await db.delete(HABITS_STORE, id);
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

