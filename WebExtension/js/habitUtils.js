// Habit utility functions for LetsDoIt Web Extension
import { getEffectiveTimezone, getCurrentLocalDateString } from './database.js';

/**
 * Convert a mood score (1-10) to a color
 */
export function scoreToColor(score) {
  if (score === null || score === undefined || score < 0) {
    return '#e5e7eb';
  }

  const colors = {
    1: '#ef4444',
    2: '#f87171',
    3: '#fb923c',
    4: '#fbbf24',
    5: '#facc15',
    6: '#a3e635',
    7: '#4ade80',
    8: '#22c55e',
    9: '#10b981',
    10: '#059669',
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
 * Format a date to YYYY-MM-DD string
 */
export function formatDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date
 */
export function parseDateKey(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date key in the effective timezone
 */
export function getTodayKey() {
  return getCurrentLocalDateString();
}

/**
 * Get today's date key for a specific timezone
 */
export function getTodayKeyForTimezone(timezone = getEffectiveTimezone()) {
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
 * Check if a date string is today
 */
export function isToday(dateStr, timezone = getEffectiveTimezone()) {
  return dateStr === getTodayKeyForTimezone(timezone);
}

/**
 * Check if a date string is in the past
 */
export function isPastDate(dateStr, timezone = getEffectiveTimezone()) {
  return dateStr < getTodayKeyForTimezone(timezone);
}

/**
 * Check if a date string is in the future
 */
export function isFutureDate(dateStr, timezone = getEffectiveTimezone()) {
  return dateStr > getTodayKeyForTimezone(timezone);
}

/**
 * SCORES array for the mood survey
 */
export const SCORES = [
  { value: 1, label: "Couldn't be worse" },
  { value: 2, label: 'Very bad' },
  { value: 3, label: 'Bad' },
  { value: 4, label: 'Meh' },
  { value: 5, label: 'So-so' },
  { value: 6, label: 'Okay' },
  { value: 7, label: 'Good' },
  { value: 8, label: 'Very good' },
  { value: 9, label: 'Great' },
  { value: 10, label: 'Really great' },
];

