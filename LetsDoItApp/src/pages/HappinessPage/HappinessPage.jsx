import NavToggle from '../../components/NavToggle';
import HabitTracker from '../../components/HabitTracker';
import Logo from '../../components/Logo';
import styles from './HappinessPage.module.css';

function HappinessPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Logo />
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

