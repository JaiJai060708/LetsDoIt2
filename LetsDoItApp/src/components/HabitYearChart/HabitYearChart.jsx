import { useState, useMemo } from 'react';
import { format, getDate } from 'date-fns';
import {
  scoreToColor,
  scoreToLabel,
  scoreToEmoji,
  MONTHS,
  getDaysInMonth,
  formatDateKey,
  isToday,
  isFutureDate,
  habitsByDateKey,
} from '../../utils/habitUtils';
import styles from './HabitYearChart.module.css';

function MonthChart({ month, monthIndex, year, habitsMap, selectedRange, onDayClick, onDayHover }) {
  const days = useMemo(() => getDaysInMonth(year, monthIndex), [year, monthIndex]);

  return (
    <div className={styles.monthWrapper}>
      <div className={styles.monthTitle}>{month}</div>
      <div className={styles.daysGrid}>
        {days.map((day) => {
          const dateKey = formatDateKey(day);
          const habit = habitsMap[dateKey];
          const score = habit?.score;
          const hasData = score !== undefined && score !== null;
          const isTodayDate = isToday(dateKey);
          const isFuture = isFutureDate(dateKey);
          const isSelected = selectedRange.includes(dateKey);
          const isRangeStart = selectedRange[0] === dateKey;
          const isRangeEnd = selectedRange[selectedRange.length - 1] === dateKey;

          return (
            <div
              key={dateKey}
              className={`
                ${styles.dayContainer}
                ${isTodayDate ? styles.today : ''}
                ${isFuture ? styles.future : ''}
                ${isSelected ? styles.selected : ''}
                ${isRangeStart ? styles.rangeStart : ''}
                ${isRangeEnd ? styles.rangeEnd : ''}
                ${!hasData && !isFuture ? styles.noData : ''}
              `}
              style={{
                backgroundColor: hasData ? scoreToColor(score) : undefined,
              }}
              onClick={() => !isFuture && onDayClick(dateKey, habit)}
              onMouseEnter={() => onDayHover(dateKey, habit)}
              onMouseLeave={() => onDayHover(null, null)}
              title={
                hasData
                  ? `${format(day, 'EEEE, MMMM d')}\n${scoreToEmoji(score)} ${scoreToLabel(score)} (${score}/10)`
                  : isFuture
                  ? 'Future date'
                  : `${format(day, 'EEEE, MMMM d')}\nNo entry - click to add`
              }
            >
              <span className={styles.dayNumber}>{getDate(day)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HabitYearChart({ year, habits, selectedRange, onYearChange, onDayClick, onDayHover }) {
  const habitsMap = useMemo(() => habitsByDateKey(habits), [habits]);

  return (
    <div className={styles.container}>
      <div className={styles.yearHeader}>
        <button
          className={styles.yearButton}
          onClick={() => onYearChange(year - 1)}
          aria-label="Previous year"
        >
          ‹
        </button>
        <h2 className={styles.yearTitle}>{year}</h2>
        <button
          className={styles.yearButton}
          onClick={() => onYearChange(year + 1)}
          aria-label="Next year"
        >
          ›
        </button>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Mood:</span>
        <div className={styles.legendScale}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
            <div
              key={score}
              className={styles.legendItem}
              style={{ backgroundColor: scoreToColor(score) }}
              title={`${score}: ${scoreToLabel(score)}`}
            />
          ))}
        </div>
        <div className={styles.legendLabels}>
          <span>Bad</span>
          <span>Great</span>
        </div>
      </div>

      <div className={styles.monthsContainer}>
        {MONTHS.map((month, index) => (
          <MonthChart
            key={month}
            month={month}
            monthIndex={index}
            year={year}
            habitsMap={habitsMap}
            selectedRange={selectedRange}
            onDayClick={onDayClick}
            onDayHover={onDayHover}
          />
        ))}
      </div>
    </div>
  );
}

export default HabitYearChart;

