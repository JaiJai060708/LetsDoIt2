import { useState, useCallback } from 'react';
import NavToggle, { SettingsButton } from '../../components/NavToggle';
import HabitTracker from '../../components/HabitTracker';
import SyncButton from '../../components/SyncButton';
import Logo from '../../components/Logo';
import styles from './HappinessPage.module.css';

function HappinessPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSyncComplete = useCallback((result) => {
    console.log('Sync complete:', result);
    // Trigger refresh after sync
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Logo />
          <NavToggle />
          <SettingsButton />
        </div>
      </header>

      <main className={styles.main}>
        <HabitTracker 
          key={refreshKey} 
          headerAction={<SyncButton onSyncComplete={handleSyncComplete} />}
        />
      </main>
    </div>
  );
}

export default HappinessPage;

