import { useState, useCallback } from 'react';
import DailyTaskList from '../../components/DailyTaskList';
import WeeklyTaskList from '../../components/WeeklyTaskList';
import TaskModal from '../../components/TaskModal';
import ViewToggle from '../../components/ViewToggle';
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Let&apos;s Do It!</h1>
          <ViewToggle isWeekly={isWeekly} onToggle={handleToggleView} />
        </div>
      </header>

      <main className={styles.main}>
        {isWeekly ? (
          <WeeklyTaskList
            key={`weekly-${refreshKey}`}
            onSelectTask={handleSelectTask}
            selectedTask={selectedTask}
          />
        ) : (
          <DailyTaskList
            key={`daily-${refreshKey}`}
            onSelectTask={handleSelectTask}
            selectedTask={selectedTask}
          />
        )}
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

