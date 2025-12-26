import { useState, useCallback } from 'react';
import DailyTaskList from '../../components/DailyTaskList';
import WeeklyTaskList from '../../components/WeeklyTaskList';
import TaskModal from '../../components/TaskModal';
import NavToggle from '../../components/NavToggle';
import TodoViewToggle from '../../components/TodoViewToggle';
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
          <NavToggle />
        </div>
      </header>

      <main className={styles.main}>
        <div className={`${styles.todoContainer} ${isWeekly ? styles.weekly : ''}`}>
          <div className={styles.todoHeader}>
            <h2 className={styles.todoTitle}>To Do</h2>
            <TodoViewToggle isWeekly={isWeekly} onToggle={handleToggleView} />
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
