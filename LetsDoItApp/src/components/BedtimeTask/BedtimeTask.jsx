import styles from './BedtimeTask.module.css';

function BedtimeTask({ onClick }) {
  return (
    <div className={styles.task}>
      <div className={styles.left}>
        <span className={styles.icon}>🌙</span>
        <span className={styles.content}>Dump your thoughts before bed</span>
      </div>
      <div className={styles.right}>
        <button className={styles.dumpButton} onClick={onClick}>
          Dump thoughts
        </button>
      </div>
    </div>
  );
}

export default BedtimeTask;
