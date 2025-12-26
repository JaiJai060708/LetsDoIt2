import styles from './TodoViewToggle.module.css';

function TodoViewToggle({ isWeekly, onToggle }) {
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

export default TodoViewToggle;

