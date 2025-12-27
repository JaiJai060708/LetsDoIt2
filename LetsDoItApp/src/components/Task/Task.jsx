import { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { updateTask, deleteTask, getAvailableTags } from '../../db/database';
import { isPast, isToday, isTomorrow } from '../../utils/dateUtils';
import styles from './Task.module.css';

// Parse date string to local date (avoids timezone issues with YYYY-MM-DD format)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  // If it's already a full ISO string, parse it normally
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // For YYYY-MM-DD format, parse as local date to avoid timezone shift
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to format deadline display
const formatDeadline = (deadline) => {
  if (!deadline) return null;
  const date = parseLocalDate(deadline);
  if (!date) return null;
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Check if deadline is urgent (today or past)
const isDeadlineUrgent = (deadline) => {
  if (!deadline) return false;
  const date = parseLocalDate(deadline);
  return date && (isPast(date) || isToday(date));
};

// Check if deadline is soon (tomorrow)
const isDeadlineSoon = (deadline) => {
  if (!deadline) return false;
  const date = parseLocalDate(deadline);
  return date && isTomorrow(date);
};

function Task({ task, index, onUpdate, onSelect, isSelected, compact = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    getAvailableTags().then(setAvailableTags);
  }, []);

  const getTagById = (tagId) => availableTags.find((t) => t.id === tagId);

  const handleToggleDone = async (e) => {
    e.stopPropagation();
    const doneAt = task.doneAt ? null : new Date().toISOString();
    await updateTask(task.id, { doneAt });
    onUpdate();
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteTask(task.id);
    onUpdate();
  };

  const taskIsPast = task.dueDate && isPast(new Date(task.dueDate)) && !task.doneAt;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.task} ${task.doneAt ? styles.done : ''} ${isSelected ? styles.selected : ''} ${taskIsPast ? styles.past : ''} ${compact ? styles.compact : ''} ${snapshot.isDragging ? styles.dragging : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => onSelect?.(task)}
        >
          <div className={styles.left}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={!!task.doneAt}
              onChange={handleToggleDone}
              onClick={(e) => e.stopPropagation()}
            />
            <span className={styles.content}>{task.content}</span>
            {task.tags && task.tags.length > 0 && (
              <div className={styles.tags}>
                {task.tags.map((tagId) => {
                  const tag = getTagById(tagId);
                  if (!tag) return null;
                  const deadlineText = formatDeadline(tag.deadline);
                  const urgent = isDeadlineUrgent(tag.deadline);
                  const soon = isDeadlineSoon(tag.deadline);
                  return (
                    <span
                      key={tag.id}
                      className={`${styles.tag} ${urgent ? styles.tagUrgent : ''} ${soon ? styles.tagSoon : ''}`}
                      style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                    >
                      {tag.name}
                      {deadlineText && (
                        <span className={`${styles.tagDeadline} ${urgent ? styles.urgent : ''} ${soon ? styles.soon : ''}`}>
                          📅 {deadlineText}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className={styles.right}>
            {task.note && <span className={styles.noteIndicator} title="Has notes">📝</span>}
            {isHovered && (
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                title="Delete task"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default Task;
