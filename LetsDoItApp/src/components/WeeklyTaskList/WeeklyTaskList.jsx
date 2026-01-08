import { useState, useEffect, useCallback } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { addDays, isSameDay } from 'date-fns';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { getAllTasks, updateTask, getAvailableTags, completeTag, updateTag } from '../../db/database';
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
  extractDateString,
  parseDateString,
} from '../../utils/dateUtils';
import TaskList from '../TaskList';
import AddTask from '../AddTask';
import styles from './WeeklyTaskList.module.css';

const DAY_IDS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function WeeklyTaskList({ onSelectTask, selectedTask, hideHeader = false }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekTasks, setWeekTasks] = useState(Array(7).fill([]));
  const [isLoading, setIsLoading] = useState(true);
  const [tagDeadlinesByDay, setTagDeadlinesByDay] = useState(
    Array(7).fill(null).map(() => ({ active: [], completed: [] }))
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(null);

  const weekStart = getWeekStart(currentDate);

  // Parse date string to local date (avoids timezone issues)
  const parseLocalDate = (dateStr) => {
    return parseDateString(dateStr);
  };

  // Load tag deadlines for the current week (both active and completed)
  const loadTagDeadlines = useCallback(async () => {
    try {
      const tags = await getAvailableTags();
      const deadlinesByDay = Array(7).fill(null).map(() => ({ active: [], completed: [] }));

      tags.forEach((tag) => {
        // Skip tags without deadline
        if (!tag.deadline) return;
        const deadlineDate = parseLocalDate(tag.deadline);
        if (!deadlineDate) return;
        
        // Check each day of the week
        for (let i = 0; i < 7; i++) {
          const dayDate = getWeekDayDate(currentDate, i);
          if (isSameDay(deadlineDate, dayDate)) {
            if (tag.completedAt) {
              deadlinesByDay[i].completed.push(tag);
            } else {
              deadlinesByDay[i].active.push(tag);
            }
            break;
          }
        }
      });

      setTagDeadlinesByDay(deadlinesByDay);
    } catch (error) {
      console.error('Failed to load tag deadlines:', error);
    }
  }, [currentDate]);

  // Handle completing a tag with deadline
  const handleCompleteTag = async (tagId) => {
    await completeTag(tagId, true);
    loadTagDeadlines();
  };

  // Handle uncompleting a tag
  const handleUncompleteTag = async (tagId) => {
    await completeTag(tagId, false);
    loadTagDeadlines();
  };

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
    loadTagDeadlines();

    const handleFocus = () => {
      loadTasks();
      loadTagDeadlines();
    };
    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, [loadTasks, loadTagDeadlines]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsKeyboardOpen(false);
      setViewportHeight(null);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    let baselineHeight = viewport.height;
    const threshold = 140;

    const handleResize = () => {
      const height = viewport.height;
      const offsetTop = viewport.offsetTop;
      const isOpen = baselineHeight - height > threshold;
      
      setIsKeyboardOpen(isOpen);
      
      if (isOpen) {
        // Calculate the bottom position above the keyboard
        setViewportHeight(height + offsetTop);
      } else {
        setViewportHeight(null);
        baselineHeight = height;
      }
    };

    const handleOrientationChange = () => {
      baselineHeight = viewport.height;
      setViewportHeight(null);
      handleResize();
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isMobile]);

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

    // Check if this is a tag drag (tags have "tag-" prefix)
    const isTagDrag = draggableId.startsWith('tag-');
    
    if (isTagDrag) {
      // Handle tag drag
      const tagId = draggableId.replace('tag-', '');
      const sourceDayId = source.droppableId.replace('tags-', '');
      const destDayId = destination.droppableId.replace('tags-', '');
      
      const sourceIndex = DAY_IDS.indexOf(sourceDayId);
      const destIndex = DAY_IDS.indexOf(destDayId);
      
      if (sourceIndex === -1 || destIndex === -1) return;
      
      // Calculate new deadline as YYYY-MM-DD string
      const newDeadline = extractDateString(getWeekDayDate(currentDate, destIndex));
      
      // Optimistically update UI
      const newTagDeadlines = tagDeadlinesByDay.map(day => ({
        active: [...day.active],
        completed: [...day.completed]
      }));
      
      // Find the tag in source (could be active or completed)
      let movedTag = newTagDeadlines[sourceIndex].active.find(t => t.id === tagId);
      let wasCompleted = false;
      if (!movedTag) {
        movedTag = newTagDeadlines[sourceIndex].completed.find(t => t.id === tagId);
        wasCompleted = true;
      }
      if (!movedTag) return;
      
      // Remove from source
      if (wasCompleted) {
        newTagDeadlines[sourceIndex].completed = newTagDeadlines[sourceIndex].completed.filter(t => t.id !== tagId);
      } else {
        newTagDeadlines[sourceIndex].active = newTagDeadlines[sourceIndex].active.filter(t => t.id !== tagId);
      }
      
      // Add to destination
      const updatedTag = { ...movedTag, deadline: newDeadline };
      if (wasCompleted) {
        newTagDeadlines[destIndex].completed.push(updatedTag);
      } else {
        newTagDeadlines[destIndex].active.push(updatedTag);
      }
      
      setTagDeadlinesByDay(newTagDeadlines);
      
      // Update in database
      try {
        await updateTag(tagId, { deadline: newDeadline });
      } catch (error) {
        console.error('Failed to update tag:', error);
        loadTagDeadlines();
      }
      return;
    }

    // Handle task drag
    const sourceIndex = DAY_IDS.indexOf(source.droppableId);
    const destIndex = DAY_IDS.indexOf(destination.droppableId);

    if (sourceIndex === -1 || destIndex === -1) return;

    // Get the task being moved
    const sourceTasks = weekTasks[sourceIndex];
    const movedTask = sourceTasks.find(t => t.id === draggableId);
    if (!movedTask) return;

    // Calculate new due date as YYYY-MM-DD string (timezone-agnostic)
    const newDueDate = extractDateString(getDateForDayId(destination.droppableId));

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
    <div className={`${styles.container} ${isMobile && isKeyboardOpen ? styles.keyboardOpen : ''}`}>
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
                const dayDeadlines = tagDeadlinesByDay[index] || { active: [], completed: [] };
                const hasAnyTags = dayDeadlines.active.length > 0 || dayDeadlines.completed.length > 0;

                return (
                  <div
                    key={dayName}
                    className={`${styles.dayColumn} ${dayIsPast ? styles.past : ''} ${dayIsToday ? styles.today : ''}`}
                  >
                    <div className={styles.dayHeader}>
                      <span className={styles.dayName}>{dayName}</span>
                      <span className={styles.dayNumber}>{dayDate.getDate()}</span>
                    </div>
                    <Droppable droppableId={`tags-${DAY_IDS[index]}`} type="TAG">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`${styles.dayDeadlines} ${hasAnyTags ? styles.hasTags : ''} ${snapshot.isDraggingOver ? styles.dragOver : ''}`}
                        >
                          {/* Active tags */}
                          {dayDeadlines.active.map((tag, tagIndex) => (
                            <Draggable key={tag.id} draggableId={`tag-${tag.id}`} index={tagIndex}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`${styles.deadlineChip} ${dayIsPast ? styles.overdue : ''} ${dayIsToday ? styles.dueToday : ''} ${dragSnapshot.isDragging ? styles.dragging : ''}`}
                                  style={{ 
                                    backgroundColor: tag.color + '20', 
                                    borderColor: tag.color,
                                    color: tag.color,
                                    ...dragProvided.draggableProps.style
                                  }}
                                  title={`Drag to move or check to complete ${tag.name}`}
                                >
                                  <input
                                    type="checkbox"
                                    className={styles.deadlineCheckbox}
                                    onChange={() => handleCompleteTag(tag.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className={styles.deadlineIcon}>🎯</span>
                                  <span className={styles.deadlineName}>{tag.name}</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {/* Completed tags */}
                          {dayDeadlines.completed.map((tag, tagIndex) => (
                            <Draggable key={tag.id} draggableId={`tag-${tag.id}`} index={dayDeadlines.active.length + tagIndex}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`${styles.deadlineChip} ${styles.completed} ${dragSnapshot.isDragging ? styles.dragging : ''}`}
                                  style={{ 
                                    backgroundColor: tag.color + '10', 
                                    borderColor: tag.color + '60',
                                    color: tag.color,
                                    ...dragProvided.draggableProps.style
                                  }}
                                  title={`Completed - drag to move or uncheck to restore ${tag.name}`}
                                >
                                  <input
                                    type="checkbox"
                                    className={styles.deadlineCheckbox}
                                    checked
                                    onChange={() => handleUncompleteTag(tag.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className={styles.deadlineIcon}>✓</span>
                                  <span className={styles.deadlineName}>{tag.name}</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
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

      <div 
        className={styles.footer}
        style={viewportHeight ? { '--viewport-bottom': `${viewportHeight}px` } : undefined}
      >
        <AddTask
          onTaskCreated={handleTaskCreated}
          defaultDueDate={getDefaultDueDate()}
          compact={isMobile && isKeyboardOpen}
        />
      </div>
    </div>
  );
}

export default WeeklyTaskList;
