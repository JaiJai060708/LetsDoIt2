import { useState, useEffect } from 'react';
import NavToggle, { SettingsButton } from '../../components/NavToggle';
import HabitTracker from '../../components/HabitTracker';
import SyncButton from '../../components/SyncButton';
import Logo from '../../components/Logo';
import { useSync } from '../../context';
import styles from './HappinessPage.module.css';

function HappinessPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { lastSyncResult } = useSync();

  // Refresh data when sync pulls new data (both manual and automatic)
  useEffect(() => {
    if (lastSyncResult?.action === 'pulled') {
      console.log('Data pulled from cloud, refreshing view...');
      setRefreshKey((prev) => prev + 1);
    }
  }, [lastSyncResult]);

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
          headerAction={<SyncButton />}
        />
      </main>
    </div>
  );
}

export default HappinessPage;
