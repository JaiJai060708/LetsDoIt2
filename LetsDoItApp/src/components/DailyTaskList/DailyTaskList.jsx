import { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { addDays } from 'date-fns';
import { getAllTasks, updateTask, getSectionExpandStates, setSectionExpandState } from '../../db/database';
import { categorizeDailyTasks, sortTasks, getTodayStart } from '../../utils/dateUtils';
import TaskList from '../TaskList';
import AddTask from '../AddTask';
import styles from './DailyTaskList.module.css';

// Section configuration
const SECTIONS = [
  { id: 'unfinished', title: 'Overdue', tasksKey: 'unfinished', isOverdue: true },
  { id: 'today', title: 'Today', tasksKey: 'todayTasks' },
  { id: 'tomorrow', title: 'Tomorrow', tasksKey: 'tomorrowTasks' },
  { id: 'upcoming', title: 'Upcoming', tasksKey: 'upcoming' },
  { id: 'someday', title: 'Someday', tasksKey: 'someday' },
];

function DailyTaskList({ onSelectTask, selectedTask, hideHeader = false }) {
  const [tasks, setTasks] = useState({
    unfinished: [],
    todayTasks: [],
    tomorrowTasks: [],
    upcoming: [],
    someday: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandStates, setExpandStates] = useState({});
  const [expandStatesLoaded, setExpandStatesLoaded] = useState(false);

  // Load expand states from DB
  const loadExpandStates = useCallback(async () => {
    try {
      const states = await getSectionExpandStates();
      setExpandStates(states);
    } catch (error) {
      console.error('Failed to load expand states:', error);
    } finally {
      setExpandStatesLoaded(true);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const allTasks = await getAllTasks();
      const categorized = categorizeDailyTasks(allTasks);
      
      setTasks({
        unfinished: sortTasks(categorized.unfinished),
        todayTasks: sortTasks(categorized.todayTasks),
        tomorrowTasks: sortTasks(categorized.tomorrowTasks),
        upcoming: sortTasks(categorized.upcoming),
        someday: sortTasks(categorized.someday),
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadExpandStates();
    
    // Reload when window regains focus
    const handleFocus = () => loadTasks();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadTasks, loadExpandStates]);

  const handleTaskCreated = () => {
    loadTasks();
  };

  // Check if section is expanded
  // Default: expanded if has tasks, collapsed if empty
  const isSectionExpanded = (sectionId, taskCount) => {
    if (expandStates[sectionId] !== undefined) {
      return expandStates[sectionId];
    }
    // Default: expanded if has tasks
    return taskCount > 0;
  };

  // Toggle section expand state
  const handleToggleSection = async (sectionId) => {
    const currentState = isSectionExpanded(sectionId, tasks[SECTIONS.find(s => s.id === sectionId)?.tasksKey]?.length || 0);
    const newState = !currentState;
    
    // Optimistic update
    setExpandStates(prev => ({ ...prev, [sectionId]: newState }));
    
    // Persist to DB
    try {
      await setSectionExpandState(sectionId, newState);
    } catch (error) {
      console.error('Failed to save expand state:', error);
    }
  };

  // Map droppable IDs to due dates
  const getDueDateForDroppable = (droppableId) => {
    const today = getTodayStart();
    switch (droppableId) {
      case 'today':
        return today.toISOString();
      case 'tomorrow':
        return addDays(today, 1).toISOString();
      case 'upcoming':
        return addDays(today, 7).toISOString();
      case 'someday':
        return null;
      case 'unfinished':
        return today.toISOString(); // Move overdue to today
      default:
        return today.toISOString();
    }
  };

  // Map droppable IDs to task arrays
  const getTasksForDroppable = (droppableId) => {
    switch (droppableId) {
      case 'unfinished': return tasks.unfinished;
      case 'today': return tasks.todayTasks;
      case 'tomorrow': return tasks.tomorrowTasks;
      case 'upcoming': return tasks.upcoming;
      case 'someday': return tasks.someday;
      default: return [];
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a droppable
    if (!destination) return;

    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Get the task being moved
    const sourceTasks = getTasksForDroppable(source.droppableId);
    const movedTask = sourceTasks.find(t => t.id === draggableId);
    if (!movedTask) return;

    // Calculate new due date based on destination
    const newDueDate = getDueDateForDroppable(destination.droppableId);

    // Optimistically update UI
    const newSourceTasks = sourceTasks.filter(t => t.id !== draggableId);
    const destTasks = source.droppableId === destination.droppableId 
      ? newSourceTasks 
      : [...getTasksForDroppable(destination.droppableId)];
    
    const updatedTask = { ...movedTask, dueDate: newDueDate };
    destTasks.splice(destination.index, 0, updatedTask);

    // Update local state immediately for responsiveness
    const newTasks = { ...tasks };
    
    // Update source
    switch (source.droppableId) {
      case 'unfinished': newTasks.unfinished = newSourceTasks; break;
      case 'today': newTasks.todayTasks = newSourceTasks; break;
      case 'tomorrow': newTasks.tomorrowTasks = newSourceTasks; break;
      case 'upcoming': newTasks.upcoming = newSourceTasks; break;
      case 'someday': newTasks.someday = newSourceTasks; break;
    }

    // Update destination (if different from source)
    if (source.droppableId !== destination.droppableId) {
      switch (destination.droppableId) {
        case 'unfinished': newTasks.unfinished = destTasks; break;
        case 'today': newTasks.todayTasks = destTasks; break;
        case 'tomorrow': newTasks.tomorrowTasks = destTasks; break;
        case 'upcoming': newTasks.upcoming = destTasks; break;
        case 'someday': newTasks.someday = destTasks; break;
      }
    } else {
      // Same list reorder
      switch (destination.droppableId) {
        case 'unfinished': newTasks.unfinished = destTasks; break;
        case 'today': newTasks.todayTasks = destTasks; break;
        case 'tomorrow': newTasks.tomorrowTasks = destTasks; break;
        case 'upcoming': newTasks.upcoming = destTasks; break;
        case 'someday': newTasks.someday = destTasks; break;
      }
    }

    setTasks(newTasks);

    // Update in database
    try {
      await updateTask(draggableId, { dueDate: newDueDate });
    } catch (error) {
      console.error('Failed to update task:', error);
      // Reload to get correct state on error
      loadTasks();
    }
  };

  const hasNoTasks = 
    tasks.unfinished.length === 0 &&
    tasks.todayTasks.length === 0 &&
    tasks.tomorrowTasks.length === 0 &&
    tasks.upcoming.length === 0 &&
    tasks.someday.length === 0;

  if (isLoading || !expandStatesLoaded) {
    return (
      <div className={styles.container}>
        {!hideHeader && (
          <div className={styles.header}>
            <h2 className={styles.title}>To Do</h2>
          </div>
        )}
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  // Render a collapsible section
  const renderSection = (section) => {
    const sectionTasks = tasks[section.tasksKey];
    const taskCount = sectionTasks.length;
    const isExpanded = isSectionExpanded(section.id, taskCount);
    
    // Skip overdue section if empty
    if (section.isOverdue && taskCount === 0) {
      return null;
    }

    return (
      <section key={section.id} className={styles.section}>
        <button
          className={`${styles.sectionHeader} ${section.isOverdue ? styles.overdue : ''}`}
          onClick={() => handleToggleSection(section.id)}
          aria-expanded={isExpanded}
        >
          <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}>
            ›
          </span>
          <h3 className={`${styles.sectionTitle} ${section.isOverdue ? styles.overdue : ''}`}>
            {section.title}
          </h3>
          <span className={`${styles.badge} ${section.isOverdue ? styles.overdueBadge : ''}`}>
            {taskCount}
          </span>
        </button>
        <div className={`${styles.sectionContent} ${isExpanded ? styles.expanded : ''}`}>
          <TaskList
            droppableId={section.id}
            tasks={sectionTasks}
            onUpdate={loadTasks}
            onSelectTask={onSelectTask}
            selectedTask={selectedTask}
            emptyMessage={taskCount === 0 ? `No ${section.title.toLowerCase()} tasks` : ''}
          />
        </div>
      </section>
    );
  };

  return (
    <div className={styles.container}>
      {!hideHeader && (
        <div className={styles.header}>
          <h2 className={styles.title}>To Do</h2>
        </div>
      )}

      <div className={styles.content}>
        {hasNoTasks ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyText}>No tasks yet</p>
            <p className={styles.emptySubtext}>Create your first task below</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {SECTIONS.map(renderSection)}
          </DragDropContext>
        )}
      </div>

      <AddTask onTaskCreated={handleTaskCreated} />
    </div>
  );
}

export default DailyTaskList;
