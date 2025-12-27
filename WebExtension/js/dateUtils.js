// Date utility functions for LetsDoIt Web Extension

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
 * Format date for display
 */
export function formatDate(date, formatStr = 'short') {
  const d = new Date(date);
  
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
      return d.toISOString().split('T')[0];
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Categorize tasks into daily sections
 */
export function categorizeDailyTasks(tasks) {
  const today = getTodayStart();
  const tomorrow = addDays(today, 1);

  const unfinished = [];
  const todayTasks = [];
  const tomorrowTasks = [];
  const upcoming = [];
  const someday = [];

  tasks.forEach((task) => {
    if (!task.dueDate) {
      someday.push(task);
    } else {
      const dueDate = startOfDay(new Date(task.dueDate));

      if (isBefore(dueDate, today)) {
        if (!task.doneAt) {
          unfinished.push(task);
        }
      } else if (isSameDay(dueDate, today)) {
        todayTasks.push(task);
      } else if (isSameDay(dueDate, tomorrow)) {
        tomorrowTasks.push(task);
      } else if (isAfter(dueDate, tomorrow)) {
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

    // Sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    // Sort by creation date
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

