// Date utility functions for LetsDoIt Web Extension
import { getEffectiveTimezone, getCurrentLocalDateString } from './database.js';

// ============================================
// Timezone-aware date string functions
// ============================================

/**
 * Get today's date as a YYYY-MM-DD string in the effective timezone
 */
export function getTodayDateString() {
  return getCurrentLocalDateString();
}

/**
 * Parse a YYYY-MM-DD date string into a Date object (as local time)
 * This ensures the date is treated as local, not UTC
 */
export function parseDateString(dateStr) {
  if (!dateStr) return null;
  // Handle ISO strings with time component
  if (dateStr.includes('T')) {
    // Extract just the date part
    dateStr = dateStr.split('T')[0];
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Extract YYYY-MM-DD from any date representation
 */
export function extractDateString(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    // If it's already a date string or ISO string, extract the date part
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    // Already a YYYY-MM-DD string
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse as date
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return formatDateToString(d);
    }
    return null;
  }
  if (date instanceof Date) {
    return formatDateToString(date);
  }
  return null;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Create a local ISO-like string (without Z suffix)
 * Used for timestamps like doneAt
 */
export function createLocalISOString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Compare two date strings (YYYY-MM-DD format)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareDateStrings(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1; // null dates go to end
  if (!b) return -1;
  return a.localeCompare(b);
}

/**
 * Check if date string a is before date string b
 */
export function isDateStringBefore(a, b) {
  return compareDateStrings(a, b) < 0;
}

/**
 * Check if date string a is after date string b
 */
export function isDateStringAfter(a, b) {
  return compareDateStrings(a, b) > 0;
}

/**
 * Check if two date strings are the same
 */
export function isSameDateString(a, b) {
  return compareDateStrings(a, b) === 0;
}

/**
 * Add days to a date string, returns new date string
 */
export function addDaysToDateString(dateStr, days) {
  const date = parseDateString(dateStr);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return formatDateToString(date);
}

// ============================================
// Legacy Date object functions (updated for timezone awareness)
// ============================================

/**
 * Get start of day (midnight) for a given date
 */
export function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get end of day for a given date
 */
export function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Add days to a date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if date1 is before date2
 */
export function isBefore(date1, date2) {
  return date1.getTime() < date2.getTime();
}

/**
 * Check if date1 is after date2
 */
export function isAfter(date1, date2) {
  return date1.getTime() > date2.getTime();
}

/**
 * Get start of today (midnight)
 */
export function getTodayStart() {
  return startOfDay(new Date());
}

/**
 * Get end of today
 */
export function getTodayEnd() {
  return endOfDay(new Date());
}

/**
 * Check if a date is today
 */
export function isToday(date) {
  return isSameDay(date, new Date());
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date) {
  return isSameDay(date, addDays(new Date(), 1));
}

/**
 * Check if a date is in the past (before today)
 */
export function isPast(date) {
  return isBefore(startOfDay(date), getTodayStart());
}

/**
 * Check if a date string is in the past
 */
export function isDateStringPast(dateStr) {
  const today = getTodayDateString();
  return isDateStringBefore(dateStr, today);
}

/**
 * Format date for display
 */
export function formatDate(date, formatStr = 'short') {
  // Handle date strings
  const d = typeof date === 'string' ? parseDateString(date) : new Date(date);
  if (!d || isNaN(d.getTime())) return '';
  
  switch (formatStr) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'full':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'input':
      return formatDateToString(d);
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Categorize tasks into daily sections using date strings
 * 
 * Key behavior:
 * - Completed tasks are shown in the day they were completed (doneAt), not their due date
 * - Uncompleted tasks are shown based on their due date
 */
export function categorizeDailyTasks(tasks) {
  const todayStr = getTodayDateString();
  const tomorrowStr = addDaysToDateString(todayStr, 1);

  const unfinished = [];
  const todayTasks = [];
  const tomorrowTasks = [];
  const upcoming = [];
  const someday = [];

  tasks.forEach((task) => {
    // For completed tasks, use the completion date (doneAt) for categorization
    if (task.doneAt) {
      const doneAtStr = extractDateString(task.doneAt);
      
      // Completed in the past - don't show in daily view (they're archived)
      if (isDateStringBefore(doneAtStr, todayStr)) {
        return;
      }
      // Completed today
      else if (isSameDateString(doneAtStr, todayStr)) {
        todayTasks.push(task);
      }
      // Completed tomorrow (edge case, shouldn't happen normally)
      else if (isSameDateString(doneAtStr, tomorrowStr)) {
        tomorrowTasks.push(task);
      }
      // Completed in the future (edge case)
      else if (isDateStringAfter(doneAtStr, tomorrowStr)) {
        upcoming.push(task);
      }
      return;
    }
    
    // For uncompleted tasks, use due date for categorization
    if (!task.dueDate) {
      // No due date = Someday
      someday.push(task);
    } else {
      // Extract date string from dueDate (handles both YYYY-MM-DD and ISO formats)
      const dueDateStr = extractDateString(task.dueDate);

      // Past tasks (before today) - these are overdue
      if (isDateStringBefore(dueDateStr, todayStr)) {
        unfinished.push(task);
      }
      // Today's tasks
      else if (isSameDateString(dueDateStr, todayStr)) {
        todayTasks.push(task);
      }
      // Tomorrow's tasks
      else if (isSameDateString(dueDateStr, tomorrowStr)) {
        tomorrowTasks.push(task);
      }
      // Upcoming (2+ days from now)
      else if (isDateStringAfter(dueDateStr, tomorrowStr)) {
        upcoming.push(task);
      }
    }
  });

  return { unfinished, todayTasks, tomorrowTasks, upcoming, someday };
}

/**
 * Sort tasks - incomplete first, then by due date
 */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    // Completed tasks go to bottom
    if (a.doneAt && !b.doneAt) return 1;
    if (!a.doneAt && b.doneAt) return -1;

    // Sort by due date using date strings
    const aDateStr = extractDateString(a.dueDate);
    const bDateStr = extractDateString(b.dueDate);
    
    if (aDateStr && bDateStr) {
      const cmp = compareDateStrings(aDateStr, bDateStr);
      if (cmp !== 0) return cmp;
    }
    if (aDateStr && !bDateStr) return -1;
    if (!aDateStr && bDateStr) return 1;

    // Sort by creation date (compare strings directly for local timestamps)
    const aCreated = a.createdAt || '';
    const bCreated = b.createdAt || '';
    return aCreated.localeCompare(bCreated);
  });
}

