import styles from './ViewToggle.module.css';

function ViewToggle({ isWeekly, onToggle }) {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.option} ${!isWeekly ? styles.active : ''}`}
        onClick={() => onToggle(false)}
      >
        Daily
      </button>
      <button
        className={`${styles.option} ${isWeekly ? styles.active : ''}`}
        onClick={() => onToggle(true)}
      >
        Weekly
      </button>
    </div>
  );
}

export default ViewToggle;

