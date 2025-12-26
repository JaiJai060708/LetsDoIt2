import { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { addDays } from 'date-fns';
import { getAllTasks, updateTask } from '../../db/database';
import {
  getWeekStart,
  getWeekDayDate,
  shiftWeek,
  getWeekLabel,
  categorizeWeeklyTasks,
  sortTasks,
  isPast,
  isToday,
  DAY_NAMES,
} from '../../utils/dateUtils';
import TaskList from '../TaskList';
import AddTask from '../AddTask';
import styles from './WeeklyTaskList.module.css';

const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function WeeklyTaskList({ onSelectTask, selectedTask, hideHeader = false }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekTasks, setWeekTasks] = useState(Array(7).fill([]));
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = getWeekStart(currentDate);

  const loadTasks = useCallback(async () => {
    try {
      const allTasks = await getAllTasks();
      const categorized = categorizeWeeklyTasks(allTasks, currentDate);
      setWeekTasks(categorized.map((dayTasks) => sortTasks(dayTasks)));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadTasks();

    const handleFocus = () => loadTasks();
    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, [loadTasks]);

  const handlePrevWeek = () => {
    setCurrentDate(shiftWeek(currentDate, -1));
  };

  const handleNextWeek = () => {
    setCurrentDate(shiftWeek(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskCreated = () => {
    loadTasks();
  };

  // Get the date for a day droppable ID
  const getDateForDayId = (dayId) => {
    const dayIndex = DAY_IDS.indexOf(dayId);
    if (dayIndex === -1) return new Date();
    return getWeekDayDate(currentDate, dayIndex);
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceIndex = DAY_IDS.indexOf(source.droppableId);
    const destIndex = DAY_IDS.indexOf(destination.droppableId);

    if (sourceIndex === -1 || destIndex === -1) return;

    // Get the task being moved
    const sourceTasks = weekTasks[sourceIndex];
    const movedTask = sourceTasks.find(t => t.id === draggableId);
    if (!movedTask) return;

    // Calculate new due date
    const newDueDate = getDateForDayId(destination.droppableId).toISOString();

    // Optimistically update UI
    const newWeekTasks = [...weekTasks];
    
    // Remove from source
    newWeekTasks[sourceIndex] = sourceTasks.filter(t => t.id !== draggableId);
    
    // Add to destination
    const updatedTask = { ...movedTask, dueDate: newDueDate };
    const destTasks = sourceIndex === destIndex 
      ? newWeekTasks[destIndex] 
      : [...weekTasks[destIndex]];
    destTasks.splice(destination.index, 0, updatedTask);
    newWeekTasks[destIndex] = destTasks;

    setWeekTasks(newWeekTasks);

    // Update in database
    try {
      await updateTask(draggableId, { dueDate: newDueDate });
    } catch (error) {
      console.error('Failed to update task:', error);
      loadTasks();
    }
  };

  // Get the current day for adding tasks
  const getDefaultDueDate = () => {
    const today = new Date();
    if (today >= weekStart && today <= addDays(weekStart, 6)) {
      return today;
    }
    return weekStart;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <button className={styles.navBtn} onClick={handleToday}>
            Today
          </button>
          <button className={styles.navBtn} onClick={handlePrevWeek}>
            ‹
          </button>
          <button className={styles.navBtn} onClick={handleNextWeek}>
            ›
          </button>
          <h2 className={styles.monthTitle}>{getWeekLabel(weekStart)}</h2>
        </div>
      </div>

      <div className={styles.weekContainer}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <span>Loading...</span>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className={styles.daysGrid}>
              {DAY_NAMES.map((dayName, index) => {
                const dayDate = getWeekDayDate(currentDate, index);
                const dayIsPast = isPast(dayDate) && !isToday(dayDate);
                const dayIsToday = isToday(dayDate);

                return (
                  <div
                    key={dayName}
                    className={`${styles.dayColumn} ${dayIsPast ? styles.past : ''} ${dayIsToday ? styles.today : ''}`}
                  >
                    <div className={styles.dayHeader}>
                      <span className={styles.dayName}>{dayName}</span>
                      <span className={styles.dayNumber}>{dayDate.getDate()}</span>
                    </div>
                    <div className={styles.dayContent}>
                      <TaskList
                        droppableId={DAY_IDS[index]}
                        tasks={weekTasks[index]}
                        onUpdate={loadTasks}
                        onSelectTask={onSelectTask}
                        selectedTask={selectedTask}
                        compact
                        emptyMessage=""
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      <div className={styles.footer}>
        <AddTask
          onTaskCreated={handleTaskCreated}
          defaultDueDate={getDefaultDueDate()}
        />
      </div>
    </div>
  );
}

export default WeeklyTaskList;
