// LetsDoIt Web Extension - Popup Script
import { 
  initDB, 
  getAllTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  getAvailableTags,
  completeTag,
  getSectionExpandStates,
  setSectionExpandState,
  getHabitByDate,
  upsertHabit,
  getGoogleDriveSyncSettings,
  syncFromGoogleDrive,
  setAutoSyncCallback,
  SYNC_RESULT,
  getCurrentLocalDateString,
  createLocalTimestamp
} from './database.js';
import { 
  categorizeDailyTasks, 
  sortTasks, 
  getTodayStart, 
  addDays, 
  isPast, 
  isToday, 
  isTomorrow, 
  formatDate,
  getTodayDateString,
  isDateStringPast,
  extractDateString,
  createLocalISOString
} from './dateUtils.js';
import { 
  getTodayKey, 
  scoreToColor, 
  scoreToLabel, 
  SCORES 
} from './habitUtils.js';

// Section configuration
const SECTIONS = [
  { id: 'unfinished', title: 'Overdue', tasksKey: 'unfinished', isOverdue: true },
  { id: 'today', title: 'Today', tasksKey: 'todayTasks' },
  { id: 'tomorrow', title: 'Tomorrow', tasksKey: 'tomorrowTasks' },
  { id: 'upcoming', title: 'Upcoming', tasksKey: 'upcoming' },
  { id: 'someday', title: 'Someday', tasksKey: 'someday' },
];

// Sync states
const SYNC_STATE = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  PULLED: 'pulled',
  PUSHED: 'pushed',
  UP_TO_DATE: 'upToDate',
  ERROR: 'error',
  DISABLED: 'disabled',
};

// State
let tasks = {
  unfinished: [],
  todayTasks: [],
  tomorrowTasks: [],
  upcoming: [],
  someday: [],
};
let expandStates = {};
let showHappinessTask = false;
let availableTags = [];
let selectedTags = []; // Tags selected for new task
let selectedHappinessScore = null;
let syncState = SYNC_STATE.DISABLED;
let syncEnabled = false;
let syncStatusMessage = '';
let autoSyncEnabled = false;
let pendingTaskNote = null; // Store URL when capturing page info

// Auto-sync debounce
const AUTO_SYNC_DEBOUNCE = 2000;
let autoSyncTimer = null;
let isSyncing = false;

/**
 * Debounced auto-sync function - called after data modifications
 */
function triggerAutoSync() {
  if (!autoSyncEnabled || !syncEnabled) return;
  
  // Clear any existing timer
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
  }
  
  // Set new debounced timer
  autoSyncTimer = setTimeout(() => {
    console.log('Auto-syncing after data modification...');
    handleSync();
  }, AUTO_SYNC_DEBOUNCE);
}

// DOM Elements
const taskSectionsEl = document.getElementById('taskSections');
const loadingEl = document.getElementById('loading');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoEl = document.querySelector('.logo');
const happinessModal = document.getElementById('happinessModal');
const syncContainer = document.getElementById('syncContainer');
const syncBtn = document.getElementById('syncBtn');
const syncTooltip = document.getElementById('syncTooltip');
const capturePageBtn = document.getElementById('capturePageBtn');
const happinessDateLabel = document.getElementById('happinessDateLabel');
const scoresContainer = document.getElementById('scoresContainer');
const scoreStep = document.getElementById('scoreStep');
const noteStep = document.getElementById('noteStep');
const selectedInfo = document.getElementById('selectedInfo');
const selectedColor = document.getElementById('selectedColor');
const selectedLabel = document.getElementById('selectedLabel');
const previewColor = document.getElementById('previewColor');
const previewLabel = document.getElementById('previewLabel');
const noteInput = document.getElementById('noteInput');
const closeHappinessModal = document.getElementById('closeHappinessModal');
const changeScoreBtn = document.getElementById('changeScoreBtn');
const backBtn = document.getElementById('backBtn');
const submitHappinessBtn = document.getElementById('submitHappinessBtn');
const tagPickerWrapper = document.getElementById('tagPickerWrapper');
const tagBtn = document.getElementById('tagBtn');
const tagDropdown = document.getElementById('tagDropdown');
const tagList = document.getElementById('tagList');

// Initialize
async function init() {
  try {
    await initDB();
    await loadTags();
    await loadTasks();
    await loadExpandStates();
    await checkHappinessSurvey();
    await checkSyncSettings();
    renderSections();
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize:', error);
    showError('Failed to load tasks');
  }
}

// Check sync settings and initialize sync button
async function checkSyncSettings() {
  const settings = await getGoogleDriveSyncSettings();
  syncEnabled = settings.enabled && !!settings.shareLink;
  autoSyncEnabled = settings.autoSync || false;
  
  // Register the auto-sync callback with the database
  setAutoSyncCallback(triggerAutoSync);
  
  if (syncEnabled) {
    syncState = SYNC_STATE.IDLE;
    syncContainer.style.display = 'flex';
    updateSyncButton();
    
    // Auto-sync on load if enabled
    if (settings.autoSync) {
      handleSync();
    }
  } else {
    syncState = SYNC_STATE.DISABLED;
    syncContainer.style.display = 'none';
  }
}

// Handle sync button click
async function handleSync() {
  if (syncState === SYNC_STATE.SYNCING || isSyncing || !syncEnabled) return;
  
  isSyncing = true;
  syncState = SYNC_STATE.SYNCING;
  syncStatusMessage = '';
  updateSyncButton();
  
  try {
    const result = await syncFromGoogleDrive();
    
    // Set state based on sync result
    switch (result.action) {
      case SYNC_RESULT.PULLED:
        syncState = SYNC_STATE.PULLED;
        syncStatusMessage = `Pulled ${result.tasksImported} tasks, ${result.habitsImported} habits`;
        // Reload data after pull
        await loadTasks();
        await checkHappinessSurvey();
        renderSections();
        break;
      case SYNC_RESULT.PUSHED:
        syncState = SYNC_STATE.PUSHED;
        syncStatusMessage = 'Data pushed to cloud';
        break;
      case SYNC_RESULT.UP_TO_DATE:
        syncState = SYNC_STATE.UP_TO_DATE;
        syncStatusMessage = result.note || 'Already up to date';
        break;
      default:
        syncState = SYNC_STATE.UP_TO_DATE;
    }
    
    updateSyncButton();
    showSyncTooltip();
    
    // Reset to idle after status display
    setTimeout(() => {
      syncState = SYNC_STATE.IDLE;
      syncStatusMessage = '';
      updateSyncButton();
      hideSyncTooltip();
    }, 3000);
  } catch (error) {
    console.error('Sync failed:', error);
    syncState = SYNC_STATE.ERROR;
    syncStatusMessage = error.message || 'Sync failed';
    updateSyncButton();
    showSyncTooltip();
    
    // Reset to idle after error display
    setTimeout(() => {
      syncState = SYNC_STATE.IDLE;
      syncStatusMessage = '';
      updateSyncButton();
      hideSyncTooltip();
    }, 5000);
  } finally {
    isSyncing = false;
  }
}

// Update sync button appearance based on state
function updateSyncButton() {
  // Remove all state classes
  syncBtn.classList.remove('syncing', 'pulled', 'pushed', 'upToDate', 'error');
  
  // Add current state class
  if (syncState !== SYNC_STATE.IDLE && syncState !== SYNC_STATE.DISABLED) {
    syncBtn.classList.add(syncState);
  }
  
  // Update icon
  const iconHtml = getSyncIcon();
  const labelText = getSyncLabel();
  
  syncBtn.innerHTML = iconHtml + `<span class="sync-label">${labelText}</span>`;
  syncBtn.disabled = syncState === SYNC_STATE.SYNCING;
}

// Get sync icon SVG based on state
function getSyncIcon() {
  switch (syncState) {
    case SYNC_STATE.SYNCING:
      return `<svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
      </svg>`;
    case SYNC_STATE.PULLED:
      return `<svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>`;
    case SYNC_STATE.PUSHED:
      return `<svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>`;
    case SYNC_STATE.UP_TO_DATE:
      return `<svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>`;
    case SYNC_STATE.ERROR:
      return `<svg class="sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>`;
    default:
      return `<svg class="sync-icon cloud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>`;
  }
}

// Get sync label text based on state
function getSyncLabel() {
  switch (syncState) {
    case SYNC_STATE.SYNCING:
      return 'Syncing...';
    case SYNC_STATE.PULLED:
      return 'Pulled';
    case SYNC_STATE.PUSHED:
      return 'Pushed';
    case SYNC_STATE.UP_TO_DATE:
      return 'Up to date';
    case SYNC_STATE.ERROR:
      return 'Failed';
    default:
      return 'Sync';
  }
}

// Show sync tooltip
function showSyncTooltip() {
  if (!syncStatusMessage) return;
  
  syncTooltip.textContent = syncStatusMessage;
  syncTooltip.classList.remove('error', 'success', 'info');
  
  if (syncState === SYNC_STATE.ERROR) {
    syncTooltip.classList.add('error');
  } else if (syncState === SYNC_STATE.PULLED || syncState === SYNC_STATE.PUSHED) {
    syncTooltip.classList.add('success');
  } else if (syncState === SYNC_STATE.UP_TO_DATE) {
    syncTooltip.classList.add('info');
  }
  
  syncTooltip.classList.add('visible');
}

// Hide sync tooltip
function hideSyncTooltip() {
  syncTooltip.classList.remove('visible');
}

// Load tags
async function loadTags() {
  availableTags = await getAvailableTags();
  
  // Set "personal" tag as default
  const personalTag = availableTags.find(tag => tag.name.toLowerCase() === 'personal');
  if (personalTag && !personalTag.completedAt) {
    selectedTags = [personalTag.id];
  }
  
  updateTagButton();
}

// Update tag button to show selected tags as colored dots
function updateTagButton() {
  if (selectedTags.length === 0) {
    tagBtn.innerHTML = '🏷️';
    tagBtn.classList.remove('has-selection');
  } else {
    tagBtn.classList.add('has-selection');
    let html = '<div class="tag-indicators">';
    
    // Show up to 3 tag dots
    selectedTags.slice(0, 3).forEach(tagId => {
      const tag = getTagById(tagId);
      if (tag) {
        html += `<span class="tag-dot" style="background-color: ${tag.color}" title="${tag.name}"></span>`;
      }
    });
    
    // Show +N if more than 3
    if (selectedTags.length > 3) {
      html += `<span class="tag-more">+${selectedTags.length - 3}</span>`;
    }
    
    html += '</div>';
    tagBtn.innerHTML = html;
  }
}

// State for completed tags visibility
let showCompletedTags = false;

// Render tag list in dropdown
function renderTagList() {
  const activeTags = availableTags.filter(tag => !tag.completedAt);
  const completedTags = availableTags.filter(tag => tag.completedAt && tag.deadline);
  
  let html = '';
  
  if (activeTags.length === 0 && completedTags.length === 0) {
    html = '<p class="no-tags">No tags available</p>';
  } else {
    // Active tags
    if (activeTags.length === 0) {
      html += '<p class="no-tags">No active tags</p>';
    } else {
      html += activeTags.map(tag => `
        <label class="tag-option">
          <input type="checkbox" ${selectedTags.includes(tag.id) ? 'checked' : ''} data-tag-id="${tag.id}">
          <span class="tag-preview" style="background-color: ${tag.color}20; color: ${tag.color}; border-color: ${tag.color}">
            ${tag.name}
          </span>
        </label>
      `).join('');
    }
    
    // Completed tags section
    if (completedTags.length > 0) {
      html += `
        <button class="completed-toggle" id="completedToggle">
          <span class="completed-chevron ${showCompletedTags ? 'expanded' : ''}">›</span>
          <span class="completed-label">Completed (${completedTags.length})</span>
        </button>
      `;
      
      if (showCompletedTags) {
        html += '<div class="completed-list">';
        html += completedTags.map(tag => `
          <div class="completed-tag-row">
            <span class="completed-tag-preview" style="background-color: ${tag.color}20; color: ${tag.color}; border-color: ${tag.color}">
              ${tag.name}
            </span>
            <button class="restore-btn" data-tag-id="${tag.id}" title="Restore tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        `).join('');
        html += '</div>';
      }
    }
  }
  
  tagList.innerHTML = html;
  
  // Add event listeners for checkboxes
  tagList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const tagId = e.target.dataset.tagId;
      handleTagToggle(tagId);
    });
  });
  
  // Add event listener for completed toggle
  const completedToggle = tagList.querySelector('#completedToggle');
  if (completedToggle) {
    completedToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      showCompletedTags = !showCompletedTags;
      renderTagList();
    });
  }
  
  // Add event listeners for restore buttons
  tagList.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tagId = btn.dataset.tagId;
      await handleRestoreTag(tagId);
    });
  });
}

// Toggle tag selection
function handleTagToggle(tagId) {
  if (selectedTags.includes(tagId)) {
    selectedTags = selectedTags.filter(id => id !== tagId);
  } else {
    selectedTags.push(tagId);
  }
  updateTagButton();
}

// Restore a completed tag
async function handleRestoreTag(tagId) {
  await completeTag(tagId, false);
  await loadTags();
  renderTagList();
}

// Toggle tag dropdown
function toggleTagDropdown() {
  const isVisible = tagDropdown.style.display !== 'none';
  if (isVisible) {
    tagDropdown.style.display = 'none';
  } else {
    renderTagList();
    tagDropdown.style.display = 'block';
  }
}

// Close tag dropdown
function closeTagDropdown() {
  tagDropdown.style.display = 'none';
}

// Load tasks
async function loadTasks() {
  const allTasks = await getAllTasks();
  const categorized = categorizeDailyTasks(allTasks);
  
  tasks = {
    unfinished: sortTasks(categorized.unfinished),
    todayTasks: sortTasks(categorized.todayTasks),
    tomorrowTasks: sortTasks(categorized.tomorrowTasks),
    upcoming: sortTasks(categorized.upcoming),
    someday: sortTasks(categorized.someday),
  };
}

// Load expand states
async function loadExpandStates() {
  expandStates = await getSectionExpandStates();
}

// Check if today's happiness survey is completed
async function checkHappinessSurvey() {
  const todayKey = getTodayKey();
  const todayHabit = await getHabitByDate(todayKey);
  showHappinessTask = !todayHabit;
}

// Get tag by ID
function getTagById(tagId) {
  return availableTags.find(t => t.id === tagId);
}

// Check if section is expanded
function isSectionExpanded(sectionId, taskCount) {
  if (expandStates[sectionId] !== undefined) {
    return expandStates[sectionId];
  }
  return taskCount > 0;
}

// Format deadline display
function formatDeadline(deadline) {
  if (!deadline) return null;
  // Use date string comparison for deadline display
  const deadlineStr = extractDateString(deadline);
  const todayStr = getTodayDateString();
  
  if (deadlineStr === todayStr) return 'Today';
  
  // Check tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = extractDateString(tomorrow);
  if (deadlineStr === tomorrowStr) return 'Tomorrow';
  
  return formatDate(deadline);
}

// Extract first URL from text
function extractUrl(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// Create task element
function createTaskElement(task) {
  // Use date string comparison for past check
  const dueDateStr = extractDateString(task.dueDate);
  const taskIsPast = dueDateStr && isDateStringPast(dueDateStr);
  const taskEl = document.createElement('div');
  taskEl.className = `task ${task.doneAt ? 'done' : ''} ${taskIsPast && !task.doneAt ? 'past' : ''}`;
  taskEl.dataset.taskId = task.id;

  const leftEl = document.createElement('div');
  leftEl.className = 'task-left';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = !!task.doneAt;
  checkbox.addEventListener('change', () => handleToggleDone(task.id, !task.doneAt));

  const content = document.createElement('span');
  content.className = 'task-content';
  content.textContent = task.content;

  leftEl.appendChild(checkbox);
  leftEl.appendChild(content);

  // Tags
  if (task.tags && task.tags.length > 0) {
    const tagsEl = document.createElement('div');
    tagsEl.className = 'task-tags';
    
    task.tags.forEach(tagId => {
      const tag = getTagById(tagId);
      if (!tag) return;
      
      const tagEl = document.createElement('span');
      tagEl.className = 'task-tag';
      tagEl.style.backgroundColor = tag.color + '20';
      tagEl.style.color = tag.color;
      tagEl.style.borderColor = tag.color;
      tagEl.textContent = tag.name;
      
      if (tag.deadline) {
        const deadlineText = formatDeadline(tag.deadline);
        if (deadlineText) {
          const deadlineEl = document.createElement('span');
          deadlineEl.className = 'tag-deadline';
          deadlineEl.textContent = `📅 ${deadlineText}`;
          tagEl.appendChild(deadlineEl);
        }
      }
      
      tagsEl.appendChild(tagEl);
    });
    
    leftEl.appendChild(tagsEl);
  }

  const rightEl = document.createElement('div');
  rightEl.className = 'task-right';

  // Link button if note contains a URL
  const noteUrl = extractUrl(task.note);
  if (noteUrl) {
    const linkBtn = document.createElement('a');
    linkBtn.href = noteUrl;
    linkBtn.target = '_blank';
    linkBtn.rel = 'noopener noreferrer';
    linkBtn.className = 'link-btn';
    linkBtn.title = 'Open in new tab';
    linkBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>`;
    linkBtn.addEventListener('click', (e) => e.stopPropagation());
    rightEl.appendChild(linkBtn);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.title = 'Delete task';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleDeleteTask(task.id);
  });
  rightEl.appendChild(deleteBtn);

  taskEl.appendChild(leftEl);
  taskEl.appendChild(rightEl);

  return taskEl;
}

// Create happiness task element
function createHappinessTaskElement() {
  const taskEl = document.createElement('div');
  taskEl.className = 'happiness-task';

  const leftEl = document.createElement('div');
  leftEl.className = 'happiness-left';

  const icon = document.createElement('span');
  icon.className = 'happiness-icon';
  icon.textContent = '✨';

  const content = document.createElement('span');
  content.className = 'happiness-content';
  content.textContent = 'Track your happiness';

  leftEl.appendChild(icon);
  leftEl.appendChild(content);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'check-yourself-btn';
  checkBtn.textContent = 'Check yourself';
  checkBtn.addEventListener('click', openHappinessModal);

  taskEl.appendChild(leftEl);
  taskEl.appendChild(checkBtn);

  return taskEl;
}

// Create section element
function createSectionElement(section) {
  const sectionTasks = tasks[section.tasksKey];
  const taskCount = sectionTasks.length;
  const isTodaySection = section.id === 'today';
  
  // Skip overdue section if empty
  if (section.isOverdue && taskCount === 0) {
    return null;
  }

  const isExpanded = isSectionExpanded(section.id, taskCount);
  const displayCount = isTodaySection && showHappinessTask ? taskCount + 1 : taskCount;

  const sectionEl = document.createElement('section');
  sectionEl.className = 'section';
  sectionEl.dataset.sectionId = section.id;

  // Header
  const headerEl = document.createElement('button');
  headerEl.className = `section-header ${section.isOverdue ? 'overdue' : ''}`;
  headerEl.setAttribute('aria-expanded', isExpanded);
  headerEl.addEventListener('click', () => handleToggleSection(section.id));

  const chevron = document.createElement('span');
  chevron.className = `chevron ${isExpanded ? 'expanded' : ''}`;
  chevron.textContent = '›';

  const title = document.createElement('h3');
  title.className = `section-title ${section.isOverdue ? 'overdue' : ''}`;
  title.textContent = section.title;

  const badge = document.createElement('span');
  badge.className = `badge ${section.isOverdue ? 'overdue-badge' : ''}`;
  badge.textContent = displayCount;

  headerEl.appendChild(chevron);
  headerEl.appendChild(title);
  headerEl.appendChild(badge);

  // Content
  const contentEl = document.createElement('div');
  contentEl.className = `section-content ${isExpanded ? 'expanded' : ''}`;

  const taskListEl = document.createElement('div');
  taskListEl.className = 'task-list';

  // Add happiness task if today section
  if (isTodaySection && showHappinessTask) {
    taskListEl.appendChild(createHappinessTaskElement());
  }

  // Add tasks
  if (sectionTasks.length === 0 && !(isTodaySection && showHappinessTask)) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty';
    emptyEl.textContent = `No ${section.title.toLowerCase()} tasks`;
    taskListEl.appendChild(emptyEl);
  } else {
    sectionTasks.forEach(task => {
      taskListEl.appendChild(createTaskElement(task));
    });
  }

  contentEl.appendChild(taskListEl);
  sectionEl.appendChild(headerEl);
  sectionEl.appendChild(contentEl);

  return sectionEl;
}

// Render all sections
function renderSections() {
  loadingEl.style.display = 'none';
  taskSectionsEl.innerHTML = '';

  const hasNoTasks = 
    tasks.unfinished.length === 0 &&
    tasks.todayTasks.length === 0 &&
    tasks.tomorrowTasks.length === 0 &&
    tasks.upcoming.length === 0 &&
    tasks.someday.length === 0 &&
    !showHappinessTask;

  if (hasNoTasks) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-state';
    emptyEl.innerHTML = `
      <div class="empty-icon">📋</div>
      <p class="empty-text">No tasks yet</p>
      <p class="empty-subtext">Create your first task below</p>
    `;
    taskSectionsEl.appendChild(emptyEl);
    return;
  }

  SECTIONS.forEach(section => {
    const sectionEl = createSectionElement(section);
    if (sectionEl) {
      taskSectionsEl.appendChild(sectionEl);
    }
  });
}

// Handle toggle section
async function handleToggleSection(sectionId) {
  const section = SECTIONS.find(s => s.id === sectionId);
  const taskCount = tasks[section.tasksKey]?.length || 0;
  const currentState = isSectionExpanded(sectionId, taskCount);
  const newState = !currentState;
  
  expandStates[sectionId] = newState;
  await setSectionExpandState(sectionId, newState);
  
  renderSections();
}

// Handle toggle done
async function handleToggleDone(taskId, done) {
  // If unchecking, do it immediately
  if (!done) {
    await updateTask(taskId, { doneAt: null });
    await loadTasks();
    renderSections();
    return;
  }
  
  // If marking as done, play animation first
  const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);
  const checkbox = taskEl?.querySelector('.task-checkbox');
  
  if (taskEl) {
    taskEl.classList.add('completing');
    if (checkbox) {
      checkbox.checked = true;
      checkbox.disabled = true;
    }
  }
  
  // Wait for animation to complete (1s), then actually mark as done
  setTimeout(async () => {
    // Use local timestamp instead of UTC ISO string
    const doneAt = createLocalISOString();
    await updateTask(taskId, { doneAt });
    await loadTasks();
    renderSections();
  }, 1000);
}

// Handle delete task
async function handleDeleteTask(taskId) {
  await deleteTask(taskId);
  await loadTasks();
  renderSections();
}

// Handle add task
async function handleAddTask() {
  const content = newTaskInput.value.trim();
  if (!content) return;

  // Use today's date string as dueDate (timezone-aware)
  const todayDateStr = getTodayDateString();
  
  await createTask({
    content,
    dueDate: todayDateStr,
    note: pendingTaskNote,
    doneAt: null,
    tags: [...selectedTags],
  });

  newTaskInput.value = '';
  pendingTaskNote = null;
  updateCaptureButtonState();
  closeTagDropdown();
  
  // Reset to default "personal" tag
  const personalTag = availableTags.find(tag => tag.name.toLowerCase() === 'personal');
  selectedTags = personalTag && !personalTag.completedAt ? [personalTag.id] : [];
  updateTagButton();
  
  await loadTasks();
  renderSections();
}

// Get current tab info
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Handle capture page info
async function handleCapturePageInfo() {
  // If already active, toggle off - clear everything
  if (pendingTaskNote) {
    newTaskInput.value = '';
    pendingTaskNote = null;
    updateCaptureButtonState();
    return;
  }
  
  try {
    const tab = await getCurrentTab();
    if (tab) {
      // Set the task title to the page title
      newTaskInput.value = tab.title || '';
      // Store the URL as the pending note
      pendingTaskNote = tab.url || null;
      updateCaptureButtonState();
      newTaskInput.focus();
    }
  } catch (error) {
    console.error('Failed to capture page info:', error);
  }
}

// Update capture button visual state
function updateCaptureButtonState() {
  if (pendingTaskNote) {
    capturePageBtn.classList.add('active');
    capturePageBtn.title = 'Page URL will be added to note';
  } else {
    capturePageBtn.classList.remove('active');
    capturePageBtn.title = 'Add current page info';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Logo click - open website
  logoEl.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://lets-do-it.xyz' });
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Sync button
  syncBtn.addEventListener('click', handleSync);
  syncBtn.addEventListener('mouseenter', () => {
    if (syncStatusMessage && [SYNC_STATE.ERROR, SYNC_STATE.PULLED, SYNC_STATE.PUSHED, SYNC_STATE.UP_TO_DATE].includes(syncState)) {
      showSyncTooltip();
    }
  });
  syncBtn.addEventListener('mouseleave', () => {
    if (syncState !== SYNC_STATE.SYNCING) {
      hideSyncTooltip();
    }
  });
  
  // Auto-sync when popup becomes visible (visibility change)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const settings = await getGoogleDriveSyncSettings();
      if (settings.enabled && settings.autoSync && settings.shareLink) {
        console.log('Popup became visible, auto-syncing...');
        handleSync();
      }
    }
  });

  // Add task
  addTaskBtn.addEventListener('click', handleAddTask);
  newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  });
  
  // Capture page info
  capturePageBtn.addEventListener('click', handleCapturePageInfo);
  
  // Clear pending note when input is manually cleared
  newTaskInput.addEventListener('input', () => {
    if (newTaskInput.value === '' && pendingTaskNote) {
      pendingTaskNote = null;
      updateCaptureButtonState();
    }
  });
  
  // Tag picker
  tagBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTagDropdown();
  });
  
  // Close tag dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!tagPickerWrapper.contains(e.target)) {
      closeTagDropdown();
    }
  });

  // Happiness modal
  closeHappinessModal.addEventListener('click', closeHappinessModalFn);
  happinessModal.addEventListener('click', (e) => {
    if (e.target === happinessModal) {
      closeHappinessModalFn();
    }
  });
  changeScoreBtn.addEventListener('click', () => goToScoreStep());
  backBtn.addEventListener('click', () => goToScoreStep());
  submitHappinessBtn.addEventListener('click', handleSubmitHappiness);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && happinessModal.style.display !== 'none') {
      closeHappinessModalFn();
    }
    if (e.key === 'Enter' && e.metaKey && happinessModal.style.display !== 'none') {
      handleSubmitHappiness();
    }
  });
}

// Happiness modal functions
function openHappinessModal() {
  // Use timezone-aware date formatting
  const todayStr = getTodayDateString();
  const [year, month, day] = todayStr.split('-').map(Number);
  const today = new Date(year, month - 1, day);
  
  happinessDateLabel.textContent = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  selectedHappinessScore = null;
  noteInput.value = '';
  
  renderScoreBoxes();
  goToScoreStep();
  
  happinessModal.style.display = 'flex';
}

function closeHappinessModalFn() {
  happinessModal.style.display = 'none';
  selectedHappinessScore = null;
  noteInput.value = '';
}

function renderScoreBoxes() {
  scoresContainer.innerHTML = '';
  
  SCORES.forEach(({ value, label }) => {
    const box = document.createElement('div');
    box.className = `score-box ${selectedHappinessScore === value ? 'selected' : ''}`;
    box.style.backgroundColor = scoreToColor(value);
    box.textContent = label;
    
    box.addEventListener('click', () => selectScore(value));
    box.addEventListener('mouseenter', () => {
      box.style.backgroundColor = '#1a1a1a';
      box.style.color = 'white';
    });
    box.addEventListener('mouseleave', () => {
      box.style.backgroundColor = scoreToColor(value);
      box.style.color = 'rgba(0, 0, 0, 0.8)';
    });
    
    scoresContainer.appendChild(box);
  });
}

function selectScore(value) {
  selectedHappinessScore = value;
  
  selectedInfo.style.display = 'flex';
  selectedColor.style.backgroundColor = scoreToColor(value);
  selectedLabel.textContent = `${scoreToLabel(value)} (${value}/10)`;
  
  // Auto-advance to note step
  setTimeout(() => goToNoteStep(), 400);
}

function goToScoreStep() {
  scoreStep.style.display = 'block';
  noteStep.style.display = 'none';
  renderScoreBoxes();
}

function goToNoteStep() {
  if (!selectedHappinessScore) return;
  
  scoreStep.style.display = 'none';
  noteStep.style.display = 'block';
  
  previewColor.style.backgroundColor = scoreToColor(selectedHappinessScore);
  previewLabel.textContent = `${scoreToLabel(selectedHappinessScore)} (${selectedHappinessScore}/10)`;
  
  noteInput.focus();
}

async function handleSubmitHappiness() {
  if (!selectedHappinessScore) return;
  
  await upsertHabit({
    date: getTodayKey(),
    score: selectedHappinessScore,
    note: noteInput.value.trim(),
  });
  
  closeHappinessModalFn();
  showHappinessTask = false;
  renderSections();
}

function showError(message) {
  loadingEl.innerHTML = `
    <div class="error-icon">⚠️</div>
    <span>${message}</span>
  `;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

