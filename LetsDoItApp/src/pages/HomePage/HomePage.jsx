import { useState, useCallback, useEffect } from 'react';
import DailyTaskList from '../../components/DailyTaskList';
import WeeklyTaskList from '../../components/WeeklyTaskList';
import TaskModal from '../../components/TaskModal';
import NavToggle, { SettingsButton } from '../../components/NavToggle';
import TodoViewToggle from '../../components/TodoViewToggle';
import SyncButton from '../../components/SyncButton';
import Logo from '../../components/Logo';
import { useSync, SYNC_STATE } from '../../context';
import styles from './HomePage.module.css';

function HomePage() {
  const [isWeekly, setIsWeekly] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { syncState, lastSyncResult } = useSync();

  const handleSelectTask = (task) => {
    setSelectedTask(task);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  const handleTaskUpdate = useCallback(() => {
    // Trigger refresh by updating key
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleToggleView = (weekly) => {
    setIsWeekly(weekly);
    setSelectedTask(null);
  };

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
        <div className={`${styles.todoContainer} ${isWeekly ? styles.weekly : ''}`}>
          <div className={styles.todoHeader}>
            <TodoViewToggle isWeekly={isWeekly} onToggle={handleToggleView} />
            <SyncButton />
          </div>
          
          {isWeekly ? (
            <WeeklyTaskList
              key={`weekly-${refreshKey}`}
              onSelectTask={handleSelectTask}
              selectedTask={selectedTask}
              hideHeader
            />
          ) : (
            <DailyTaskList
              key={`daily-${refreshKey}`}
              onSelectTask={handleSelectTask}
              selectedTask={selectedTask}
              hideHeader
            />
          )}
        </div>
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={handleCloseModal}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}

export default HomePage;
