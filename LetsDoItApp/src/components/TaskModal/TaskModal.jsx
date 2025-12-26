import { useState, useEffect, useCallback } from 'react';
import { updateTask, deleteTask } from '../../db/database';
import { formatDateForInput } from '../../utils/dateUtils';
import TagSelector from '../TagSelector';
import styles from './TaskModal.module.css';

function TaskModal({ task, onClose, onUpdate }) {
  const [content, setContent] = useState(task.content);
  const [note, setNote] = useState(task.note || '');
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [isSomeday, setIsSomeday] = useState(!task.dueDate);
  const [tags, setTags] = useState(task.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState(null);

  // Auto-save functionality
  const saveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // Parse date as local noon to avoid timezone issues
      // new Date("YYYY-MM-DD") is parsed as UTC midnight, which can shift to previous day in timezones behind UTC
      // Using "YYYY-MM-DDT12:00:00" ensures it's parsed as local time and noon prevents any day shift
      const parsedDueDate = dueDate ? new Date(dueDate + 'T12:00:00').toISOString() : null;
      await updateTask(task.id, {
        content,
        note: note || null,
        dueDate: isSomeday ? null : parsedDueDate,
        tags,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
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
      setDueDate(formatDateForInput(new Date()));
    }
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
                  Done on {new Date(task.doneAt).toLocaleDateString()}
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
            <label className={styles.label}>Notes</label>
            <textarea
              className={styles.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add notes..."
              rows={6}
            />
          </div>
        </div>

        <footer className={styles.footer}>
          {isSaving ? (
            <span className={styles.saving}>Saving...</span>
          ) : (
            <span className={styles.saved}>✓ Saved</span>
          )}
        </footer>
      </div>
    </div>
  );
}

export default TaskModal;

