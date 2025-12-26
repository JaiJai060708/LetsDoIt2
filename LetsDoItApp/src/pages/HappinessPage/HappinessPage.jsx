import NavToggle from '../../components/NavToggle';
import HabitTracker from '../../components/HabitTracker';
import styles from './HappinessPage.module.css';

function HappinessPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Let&apos;s Do It!</h1>
          <NavToggle />
        </div>
      </header>

      <main className={styles.main}>
        <HabitTracker />
      </main>
    </div>
  );
}

export default HappinessPage;

