import { useState } from 'react';
import { upsertHabit } from '../../db/database';
import { getTodayKey } from '../../utils/habitUtils';
import styles from './BedtimeDump.module.css';

function BedtimeDump({ onClose, onSaved }) {
  const [thoughts, setThoughts] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!thoughts.trim()) return;
    setIsSaving(true);
    try {
      const todayKey = getTodayKey();
      await upsertHabit({ date: todayKey, bedtimeThoughts: thoughts.trim() });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save bedtime thoughts:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h2 className={styles.title}>Thoughts before bed</h2>
        <p className={styles.subtitle}>Dump what&apos;s on your mind before you sleep.</p>
        <textarea
          className={styles.textarea}
          value={thoughts}
          onChange={(e) => setThoughts(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          autoFocus
          rows={6}
        />
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!thoughts.trim() || isSaving}
          >
            {isSaving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BedtimeDump;
