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
} from 'date-fns';

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
 */
export function formatDateForInput(date) {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
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
 */
export function categorizeDailyTasks(tasks) {
  const today = getTodayStart();
  const tomorrow = addDays(today, 1);
  const weekFromNow = addDays(today, 7);

  const unfinished = [];
  const todayTasks = [];
  const tomorrowTasks = [];
  const upcoming = [];
  const someday = [];

  tasks.forEach((task) => {
    if (!task.dueDate) {
      // No due date = Someday
      someday.push(task);
    } else {
      const dueDate = startOfDay(new Date(task.dueDate));
      
      // Past tasks (before today)
      if (isBefore(dueDate, today)) {
        // Only show unfinished past tasks in Overdue
        // Completed past tasks are hidden (they're done)
        if (!task.doneAt) {
          unfinished.push(task);
        }
      }
      // Today's tasks (both completed and uncompleted)
      else if (isSameDay(dueDate, today)) {
        todayTasks.push(task);
      }
      // Tomorrow's tasks
      else if (isSameDay(dueDate, tomorrow)) {
        tomorrowTasks.push(task);
      }
      // Upcoming (2+ days from now)
      else if (isAfter(dueDate, tomorrow)) {
        upcoming.push(task);
      }
    }
  });

  return { unfinished, todayTasks, tomorrowTasks, upcoming, someday };
}

/**
 * Categorize tasks into weekly sections (by day of week)
 */
export function categorizeWeeklyTasks(tasks, weekStartDate) {
  const days = Array.from({ length: 7 }, () => []);
  
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    
    const dueDate = new Date(task.dueDate);
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    
    if (dueDate >= weekStart && dueDate <= weekEnd) {
      const dayIndex = getDayOfWeek(dueDate);
      days[dayIndex].push(task);
    }
  });

  return days;
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

