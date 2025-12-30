import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  isSameDay,
  isBefore,
  isAfter,
  format,
  getDay,
  parseISO,
} from 'date-fns';

// ============================================
// Timezone-aware date utilities
// ============================================

/**
 * Get today's date as a YYYY-MM-DD string in a specific timezone
 * @param {string} timezone - IANA timezone string (default: device timezone)
 * @returns {string} - YYYY-MM-DD format
 */
export function getTodayDateString(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Parse a YYYY-MM-DD string to a Date object (at local noon to avoid boundary issues)
 * @param {string} dateStr - YYYY-MM-DD format
 * @returns {Date}
 */
export function parseDateString(dateStr) {
  if (!dateStr) return null;
  // Parse as local noon to avoid timezone boundary issues
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Extract YYYY-MM-DD from any date representation
 * Handles: ISO strings, Date objects, or { localDate } objects
 * @param {string|Date|object} date - The date to extract
 * @returns {string} - YYYY-MM-DD format
 */
export function extractDateString(date) {
  if (!date) return null;
  
  // Already YYYY-MM-DD format
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Object with localDate property (new format)
  if (typeof date === 'object' && date.localDate) {
    return date.localDate;
  }
  
  // ISO string
  if (typeof date === 'string') {
    // Extract date from ISO string using local interpretation
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Date object
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Compare two date strings (YYYY-MM-DD format)
 * @returns {number} - negative if a < b, 0 if equal, positive if a > b
 */
export function compareDateStrings(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

/**
 * Check if a date string is before another
 */
export function isDateStringBefore(dateStr, compareToStr) {
  return dateStr < compareToStr;
}

/**
 * Check if a date string is after another
 */
export function isDateStringAfter(dateStr, compareToStr) {
  return dateStr > compareToStr;
}

/**
 * Check if two date strings are the same day
 */
export function isSameDateString(dateStr1, dateStr2) {
  return dateStr1 === dateStr2;
}

/**
 * Add days to a date string
 * @param {string} dateStr - YYYY-MM-DD format
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} - YYYY-MM-DD format
 */
export function addDaysToDateString(dateStr, days) {
  const date = parseDateString(dateStr);
  const result = addDays(date, days);
  return extractDateString(result);
}

/**
 * Get start of today (midnight)
 */
export function getTodayStart() {
  return startOfDay(new Date());
}

/**
 * Get end of today (23:59:59.999)
 */
export function getTodayEnd() {
  return endOfDay(new Date());
}

/**
 * Get start of a specific day in the week (0 = Monday, 6 = Sunday)
 */
export function getWeekDayDate(baseDate, dayOffset) {
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Week starts on Monday
  return addDays(weekStart, dayOffset);
}

/**
 * Get the start of the week (Monday)
 */
export function getWeekStart(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Get the end of the week (Sunday end of day)
 */
export function getWeekEnd(date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Move to next or previous week
 */
export function shiftWeek(date, offset) {
  return addWeeks(date, offset);
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
 * Check if a date is within the next 7 days (excluding today and tomorrow)
 */
export function isUpcoming(date) {
  const today = getTodayStart();
  const dayAfterTomorrow = addDays(today, 2);
  const weekFromNow = addDays(today, 8);
  return isAfter(date, dayAfterTomorrow) && isBefore(date, weekFromNow);
}

/**
 * Check if a date is in the past (before today)
 */
export function isPast(date) {
  return isBefore(startOfDay(date), getTodayStart());
}

/**
 * Format date for display
 */
export function formatDate(date, formatStr = 'MMM d, yyyy') {
  return format(date, formatStr);
}

/**
 * Format date for input[type="date"]
 * Extracts the local date string for consistent display
 */
export function formatDateForInput(date) {
  if (!date) return '';
  return extractDateString(date) || '';
}

/**
 * Get the day of week (0 = Monday, 6 = Sunday in our system)
 */
export function getDayOfWeek(date) {
  const day = getDay(date);
  // Convert from Sunday = 0 to Monday = 0
  return day === 0 ? 6 : day - 1;
}

/**
 * Categorize tasks into daily sections
 * Uses date string comparison for timezone-agnostic categorization
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
      // Extract the date string from the stored dueDate
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
 * Categorize tasks into weekly sections (by day of week)
 * Uses date string comparison for timezone-agnostic categorization
 * 
 * Key behavior:
 * - Completed tasks are shown in the day they were completed (doneAt), not their due date
 * - Uncompleted tasks are shown based on their due date
 */
export function categorizeWeeklyTasks(tasks, weekStartDate) {
  const days = Array.from({ length: 7 }, () => []);
  
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekStartStr = extractDateString(weekStart);
  const weekEndStr = addDaysToDateString(weekStartStr, 6);
  
  tasks.forEach((task) => {
    // For completed tasks, use the completion date (doneAt) for categorization
    if (task.doneAt) {
      const doneAtStr = extractDateString(task.doneAt);
      
      // Check if completion date is within the week
      if (doneAtStr >= weekStartStr && doneAtStr <= weekEndStr) {
        const doneDate = parseDateString(doneAtStr);
        const dayIndex = getDayOfWeek(doneDate);
        days[dayIndex].push(task);
      }
      return;
    }
    
    // For uncompleted tasks, use due date for categorization
    if (!task.dueDate) return;
    
    const dueDateStr = extractDateString(task.dueDate);
    
    // Check if date is within the week
    if (dueDateStr >= weekStartStr && dueDateStr <= weekEndStr) {
      const dueDate = parseDateString(dueDateStr);
      const dayIndex = getDayOfWeek(dueDate);
      days[dayIndex].push(task);
    }
  });

  return days;
}

/**
 * Sort tasks - incomplete first, then by due date
 * Uses date string comparison for consistent sorting
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
      return compareDateStrings(aDateStr, bDateStr);
    }
    if (aDateStr && !bDateStr) return -1;
    if (!aDateStr && bDateStr) return 1;
    
    // Sort by creation date
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

/**
 * Get week display label (e.g., "December 2025")
 */
export function getWeekLabel(date) {
  return format(date, 'MMMM yyyy');
}

/**
 * Get day names for the week
 */
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

