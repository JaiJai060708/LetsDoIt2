import { useState, useEffect, useCallback, useRef } from 'react';
import { updateTask, deleteTask } from '../../db/database';
import { formatDateForInput, extractDateString, getTodayDateString } from '../../utils/dateUtils';
import TagSelector from '../TagSelector';
import styles from './TaskModal.module.css';

// Render text with clickable links
const renderTextWithLinks = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're using global flag
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.noteLink}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

function TaskModal({ task, onClose, onUpdate }) {
  const [content, setContent] = useState(task.content);
  const [note, setNote] = useState(task.note || '');
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [isSomeday, setIsSomeday] = useState(!task.dueDate);
  const [tags, setTags] = useState(task.tags || []);
  const [saveTimeout, setSaveTimeout] = useState(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const textareaRef = useRef(null);

  // Auto-save functionality
  const saveChanges = useCallback(async () => {
    try {
      // Store dueDate directly as YYYY-MM-DD string (timezone-agnostic)
      await updateTask(task.id, {
        content,
        note: note || null,
        dueDate: isSomeday ? null : dueDate,
        tags,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  }, [task.id, content, note, dueDate, isSomeday, tags, onUpdate]);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    const timeout = setTimeout(() => {
      saveChanges();
    }, 800);
    
    setSaveTimeout(timeout);
    
    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [content, note, dueDate, isSomeday, tags]);

  const handleToggleDone = async () => {
    // Store doneAt as ISO string (includes timezone info for reference)
    const doneAt = task.doneAt ? null : new Date().toISOString();
    await updateTask(task.id, { doneAt });
    onUpdate();
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onUpdate();
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSomedayChange = (e) => {
    const checked = e.target.checked;
    setIsSomeday(checked);
    if (!checked && !dueDate) {
      setDueDate(getTodayDateString());
    }
  };

  const handleNoteClick = () => {
    setIsEditingNote(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleExitEditingNote = () => {
    setIsEditingNote(false);
  };

  // Format doneAt for display
  const formatDoneAt = (doneAtStr) => {
    if (!doneAtStr) return '';
    // Extract date string for display
    const dateStr = extractDateString(doneAtStr);
    if (!dateStr) return 'Unknown';
    // Parse and format nicely
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            ← Back
          </button>
          <h2 className={styles.title}>Task Details</h2>
          <button className={styles.deleteBtn} onClick={handleDelete}>
            Delete
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.field}>
            <label className={styles.label}>Task</label>
            <input
              type="text"
              className={styles.input}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Task name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Status</label>
            <div className={styles.statusRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={!!task.doneAt}
                  onChange={handleToggleDone}
                />
                <span>Completed</span>
              </label>
              {task.doneAt && (
                <span className={styles.doneDate}>
                  Done on {formatDoneAt(task.doneAt)}
                </span>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Due Date</label>
            <div className={styles.dueDateRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isSomeday}
                  onChange={handleSomedayChange}
                />
                <span>Someday (no due date)</span>
              </label>
              {!isSomeday && (
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tags</label>
            <TagSelector
              selectedTags={tags}
              onChange={setTags}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Notes</label>
              {isEditingNote && (
                <button
                  type="button"
                  className={styles.doneEditingBtn}
                  onClick={handleExitEditingNote}
                >
                  Done
                </button>
              )}
            </div>
            {isEditingNote ? (
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add notes..."
                rows={6}
              />
            ) : (
              <div
                className={`${styles.noteDisplay} ${!note ? styles.noteEmpty : ''}`}
                onClick={handleNoteClick}
              >
                {note ? renderTextWithLinks(note) : 'Add notes...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;
