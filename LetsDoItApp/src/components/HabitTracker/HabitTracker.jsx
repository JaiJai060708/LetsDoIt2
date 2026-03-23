import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import HabitYearChart from '../HabitYearChart';
import HabitSurvey from '../HabitSurvey';
import { getHabitsByYear, upsertHabit, getHabitStats } from '../../db/database';
import {
  scoreToColor,
  scoreToLabel,
  getTodayKey,
  calculateStreak,
} from '../../utils/habitUtils';
import styles from './HabitTracker.module.css';

function StatCard({ label, value, icon, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className={styles.statContent}>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statLabel}>{label}</span>
      </div>
    </div>
  );
}

function RecentEntry({ habit }) {
  const date = new Date(habit.date);
  const hasReflection = Boolean(habit.gratitude || habit.note || habit.bedtimeThoughts);
  return (
    <div className={styles.recentEntry}>
      <div
        className={styles.recentColor}
        style={{ backgroundColor: scoreToColor(habit.score) }}
      />
      <div className={styles.recentInfo}>
        <span className={styles.recentDate}>{format(date, 'EEE, MMM d')}</span>
        <span className={styles.recentScore}>
          {scoreToLabel(habit.score)}
        </span>
      </div>
      {hasReflection && <span className={styles.recentNote}>📝</span>}
    </div>
  );
}

function HabitTracker({ headerAction }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState({ count: 0, average: 0, best: 0, worst: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState([]);
  const [surveyDate, setSurveyDate] = useState(null);
  const [surveyHabit, setSurveyHabit] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);

  const loadHabits = useCallback(async () => {
    try {
      setIsLoading(true);
      const yearHabits = await getHabitsByYear(year);
      const yearStats = await getHabitStats(year);
      setHabits(yearHabits);
      setStats(yearStats);
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // Recent entries (last 7 days with data)
  const recentEntries = useMemo(() => {
    return [...habits]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [habits]);

  // Calculate streak
  const streak = useMemo(() => calculateStreak(habits), [habits]);

  // Today's entry check
  const todayKey = getTodayKey();
  const todayEntry = habits.find((h) => h.date === todayKey);

  const handleDayClick = (dateKey, habit) => {
    setSurveyDate(dateKey);
    setSurveyHabit(habit || null);
  };

  const handleDayHover = (dateKey, habit) => {
    setHoveredDay(dateKey ? { dateKey, habit } : null);
  };

  const handleSurveySubmit = async (data) => {
    try {
      await upsertHabit(data);
      await loadHabits();
      setSurveyDate(null);
      setSurveyHabit(null);
    } catch (error) {
      console.error('Failed to save habit:', error);
    }
  };

  const handleSurveyClose = () => {
    setSurveyDate(null);
    setSurveyHabit(null);
  };

  const handleYearChange = (newYear) => {
    setYear(newYear);
    setSelectedRange([]);
  };

  // Quick log for today
  const handleQuickLog = () => {
    handleDayClick(todayKey, todayEntry);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mood Tracker</h2>
        <p className={styles.subtitle}>Track how you feel each day</p>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <div className={styles.quickActionsLeft}>
          {todayEntry ? (
            <div className={styles.todayStatus}>
              <span className={styles.todayLabel}>Today:</span>
              <div
                className={styles.todayEntry}
                style={{ backgroundColor: scoreToColor(todayEntry.score) }}
                onClick={handleQuickLog}
              >
                {scoreToLabel(todayEntry.score)}
              </div>
            </div>
          ) : (
            <button className={styles.logButton} onClick={handleQuickLog}>
              ✨ Log Today&apos;s Mood
            </button>
          )}
        </div>
        {headerAction && (
          <div className={styles.quickActionsRight}>
            {headerAction}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Entries"
          value={stats.count}
          icon="📊"
          color="var(--stat-color-primary)"
        />
        <StatCard
          label="Average"
          value={stats.average || '—'}
          icon="📈"
          color="var(--stat-color-blue)"
        />
        <StatCard
          label="Best Day"
          value={stats.best ? `${stats.best}/10` : '—'}
          icon="🌟"
          color="var(--stat-color-green)"
        />
        <StatCard
          label="Current Streak"
          value={`${streak} day${streak !== 1 ? 's' : ''}`}
          icon="🔥"
          color="var(--stat-color-amber)"
        />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Year Chart */}
        <div className={styles.chartSection}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <span>Loading your mood data...</span>
            </div>
          ) : (
            <HabitYearChart
              year={year}
              habits={habits}
              selectedRange={selectedRange}
              onYearChange={handleYearChange}
              onDayClick={handleDayClick}
              onDayHover={handleDayHover}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          {/* Hover Preview - shown when hovering */}
          <div className={`${styles.hoverPreview} ${hoveredDay ? styles.visible : ''}`}>
            {hoveredDay && (
              <>
                <div className={styles.hoverDate}>
                  {format(new Date(hoveredDay.dateKey), 'EEEE, MMMM d')}
                </div>
                {hoveredDay.habit ? (
                  <div className={styles.hoverContent}>
                    <div
                      className={styles.hoverScore}
                      style={{ backgroundColor: scoreToColor(hoveredDay.habit.score) }}
                    >
                      {hoveredDay.habit.score}/10
                    </div>
                    <div className={styles.hoverLabel}>
                      {scoreToLabel(hoveredDay.habit.score)}
                    </div>
                    {(hoveredDay.habit.gratitude || hoveredDay.habit.note) && (
                      <div className={styles.hoverDetail}>
                        <span className={styles.hoverDetailLabel}>Grateful for</span>
                        <div className={styles.hoverNote}>
                          {hoveredDay.habit.gratitude || hoveredDay.habit.note}
                        </div>
                      </div>
                    )}
                    {hoveredDay.habit.bedtimeThoughts && (
                      <div className={styles.hoverDetail}>
                        <span className={styles.hoverDetailLabel}>Thoughts before bed</span>
                        <div className={styles.hoverNote}>
                          {hoveredDay.habit.bedtimeThoughts}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.hoverEmpty}>No entry - click to add</div>
                )}
              </>
            )}
          </div>

          {/* Recent Entries - hidden when hovering */}
          <div className={`${styles.recentSection} ${hoveredDay ? styles.hidden : ''}`}>
            {recentEntries.length > 0 ? (
              <>
                <h3 className={styles.sectionTitle}>Recent Entries</h3>
                <div className={styles.recentList}>
                  {recentEntries.map((habit) => (
                    <RecentEntry key={habit.id} habit={habit} />
                  ))}
                </div>
              </>
            ) : habits.length === 0 && !isLoading ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🌱</div>
                <h3>Start Your Journey</h3>
                <p>Click any day on the calendar to log how you felt!</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Survey Modal */}
      {surveyDate && (
        <HabitSurvey
          dateKey={surveyDate}
          existingHabit={surveyHabit}
          onSubmit={handleSurveySubmit}
          onClose={handleSurveyClose}
        />
      )}
    </div>
  );
}

export default HabitTracker;

