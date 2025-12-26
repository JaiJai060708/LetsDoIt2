import { useState, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { updateTask, deleteTask, getAvailableTags } from '../../db/database';
import { isPast } from '../../utils/dateUtils';
import styles from './Task.module.css';

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
                  return (
                    <span
                      key={tag.id}
                      className={styles.tag}
                      style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className={styles.right}>
            {task.note && <span className={styles.noteIndicator} title="Has notes">📝</span>}
            {(isHovered || compact) && (
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
