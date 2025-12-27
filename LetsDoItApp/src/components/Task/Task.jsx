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

// Extract first URL from text
const extractUrl = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};

function Task({ task, index, onUpdate, onSelect, isSelected, compact = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    getAvailableTags().then(setAvailableTags);
  }, []);

  const getTagById = (tagId) => availableTags.find((t) => t.id === tagId);

  const handleToggleDone = async (e) => {
    e.stopPropagation();
    
    // If task is already done, immediately toggle it back
    if (task.doneAt) {
      await updateTask(task.id, { doneAt: null });
      onUpdate();
      return;
    }
    
    // If marking as done, play animation first
    setIsCompleting(true);
    
    // Wait for animation to complete (1s), then actually mark as done
    setTimeout(async () => {
      const doneAt = new Date().toISOString();
      await updateTask(task.id, { doneAt });
      setIsCompleting(false);
      onUpdate();
    }, 1000);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    await deleteTask(task.id);
    onUpdate();
  };

  const taskIsPast = task.dueDate && isPast(new Date(task.dueDate)) && !task.doneAt;
  const noteUrl = extractUrl(task.note);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.task} ${task.doneAt ? styles.done : ''} ${isCompleting ? styles.completing : ''} ${isSelected ? styles.selected : ''} ${taskIsPast ? styles.past : ''} ${compact ? styles.compact : ''} ${snapshot.isDragging ? styles.dragging : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => onSelect?.(task)}
        >
          <div className={styles.left}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={!!task.doneAt || isCompleting}
              onChange={handleToggleDone}
              onClick={(e) => e.stopPropagation()}
              disabled={isCompleting}
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
            {noteUrl && (
              <a
                href={noteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Open in new tab"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
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
