import { openDB } from 'idb';

const DB_NAME = 'LetsDoItDB';
const DB_VERSION = 3;
const TASKS_STORE = 'tasks';
const SETTINGS_STORE = 'settings';

// Default tags that come pre-configured
const DEFAULT_TAGS = [
  { id: 'personal', name: 'Personal', color: '#8b5cf6' },
  { id: 'work', name: 'Work', color: '#3b82f6' },
  { id: 'health', name: 'Health', color: '#10b981' },
  { id: 'errands', name: 'Errands', color: '#f59e0b' },
];

/**
 * Initialize the IndexedDB database
 */
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
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
    },
  });
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

