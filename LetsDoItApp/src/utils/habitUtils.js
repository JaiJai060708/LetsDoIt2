import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

// ============================================
// Timezone-aware habit date utilities
// ============================================

/**
 * Get today's date as a YYYY-MM-DD string in a specific timezone
 * @param {string} timezone - IANA timezone string (default: device timezone)
 * @returns {string} - YYYY-MM-DD format
 */
export function getTodayKeyForTimezone(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Convert a mood score (1-10) to a color
 * Uses a gradient from red (bad) to green (good)
 */
export function scoreToColor(score) {
  if (score === null || score === undefined || score < 0) {
    return '#e5e7eb'; // Gray for no data
  }

  // Color palette from worst to best mood
  const colors = {
    1: '#ef4444',  // Red - Couldn't be worse
    2: '#f87171',  // Light red - Very bad
    3: '#fb923c',  // Orange - Bad
    4: '#fbbf24',  // Amber - Meh
    5: '#facc15',  // Yellow - So-so
    6: '#a3e635',  // Lime - Okay
    7: '#4ade80',  // Green - Good
    8: '#22c55e',  // Emerald - Very good
    9: '#10b981',  // Teal - Great
    10: '#059669', // Dark teal - Really great
  };

  return colors[score] || '#e5e7eb';
}

/**
 * Get emoji for a mood score
 */
export function scoreToEmoji(score) {
  const emojis = {
    1: '😢',
    2: '😞',
    3: '😟',
    4: '😕',
    5: '😐',
    6: '🙂',
    7: '😊',
    8: '😄',
    9: '😁',
    10: '🤩',
  };

  return emojis[score] || '❓';
}

/**
 * Get label for a mood score
 */
export function scoreToLabel(score) {
  const labels = {
    1: "Couldn't be worse",
    2: 'Very bad',
    3: 'Bad',
    4: 'Meh',
    5: 'So-so',
    6: 'Okay',
    7: 'Good',
    8: 'Very good',
    9: 'Great',
    10: 'Really great',
  };

  return labels[score] || 'No data';
}

/**
 * Get all months with their data
 */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get days in a month for a given year
 */
export function getDaysInMonth(year, monthIndex) {
  const start = startOfMonth(new Date(year, monthIndex));
  const end = endOfMonth(new Date(year, monthIndex));
  return eachDayOfInterval({ start, end });
}

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a YYYY-MM-DD string to a Date
 */
export function parseDateKey(dateStr) {
  return parseISO(dateStr);
}

/**
 * Get today's date key
 * Uses the default device timezone for consistency
 */
export function getTodayKey() {
  return getTodayKeyForTimezone();
}

/**
 * Check if a date is today
 * @param {string} dateStr - YYYY-MM-DD format
 * @param {string} timezone - Optional timezone (defaults to device timezone)
 */
export function isToday(dateStr, timezone) {
  const todayKey = timezone ? getTodayKeyForTimezone(timezone) : getTodayKey();
  return dateStr === todayKey;
}

/**
 * Check if a date is in the past
 * @param {string} dateStr - YYYY-MM-DD format
 * @param {string} timezone - Optional timezone (defaults to device timezone)
 */
export function isPastDate(dateStr, timezone) {
  const todayKey = timezone ? getTodayKeyForTimezone(timezone) : getTodayKey();
  return dateStr < todayKey;
}

/**
 * Check if a date is in the future
 * @param {string} dateStr - YYYY-MM-DD format
 * @param {string} timezone - Optional timezone (defaults to device timezone)
 */
export function isFutureDate(dateStr, timezone) {
  const todayKey = timezone ? getTodayKeyForTimezone(timezone) : getTodayKey();
  return dateStr > todayKey;
}

/**
 * Group habit entries by date key for quick lookup
 */
export function habitsByDateKey(habits) {
  const map = {};
  habits.forEach(h => {
    if (h.date) {
      map[h.date] = h;
    }
  });
  return map;
}

/**
 * Calculate streak (consecutive days with entries)
 */
export function calculateStreak(habits) {
  if (!habits.length) return 0;
  
  const sortedDates = habits
    .map(h => h.date)
    .sort()
    .reverse();
  
  const today = getTodayKey();
  let streak = 0;
  let currentDate = today;
  
  for (const date of sortedDates) {
    if (date === currentDate) {
      streak++;
      // Move to previous day
      const d = parseDateKey(currentDate);
      d.setDate(d.getDate() - 1);
      currentDate = formatDateKey(d);
    } else if (date < currentDate) {
      break;
    }
  }
  
  return streak;
}

