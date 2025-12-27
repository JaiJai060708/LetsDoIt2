import { useState, useCallback } from 'react';
import DailyTaskList from '../../components/DailyTaskList';
import WeeklyTaskList from '../../components/WeeklyTaskList';
import TaskModal from '../../components/TaskModal';
import NavToggle, { SettingsButton } from '../../components/NavToggle';
import TodoViewToggle from '../../components/TodoViewToggle';
import SyncButton from '../../components/SyncButton';
import Logo from '../../components/Logo';
import styles from './HomePage.module.css';

function HomePage() {
  const [isWeekly, setIsWeekly] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <div className={`${styles.todoContainer} ${isWeekly ? styles.weekly : ''}`}>
          <div className={styles.todoHeader}>
            <TodoViewToggle isWeekly={isWeekly} onToggle={handleToggleView} />
            <SyncButton onSyncComplete={handleSyncComplete} />
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
