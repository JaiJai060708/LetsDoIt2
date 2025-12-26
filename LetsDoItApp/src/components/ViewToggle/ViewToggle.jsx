import styles from './ViewToggle.module.css';

// View modes: 'daily', 'weekly', 'habits'
function ViewToggle({ view, onViewChange }) {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.option} ${view === 'daily' ? styles.active : ''}`}
        onClick={() => onViewChange('daily')}
      >
        Daily
      </button>
      <button
        className={`${styles.option} ${view === 'weekly' ? styles.active : ''}`}
        onClick={() => onViewChange('weekly')}
      >
        Weekly
      </button>
      <button
        className={`${styles.option} ${view === 'habits' ? styles.active : ''}`}
        onClick={() => onViewChange('habits')}
      >
        Mood
      </button>
    </div>
  );
}

export default ViewToggle;

