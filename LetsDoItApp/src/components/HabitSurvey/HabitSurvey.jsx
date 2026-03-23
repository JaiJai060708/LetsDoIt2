import { useState } from 'react';
import { format } from 'date-fns';
import { scoreToColor, scoreToLabel, parseDateKey } from '../../utils/habitUtils';
import styles from './HabitSurvey.module.css';

const SCORES = [
  { value: 1, label: "Couldn't be worse" },
  { value: 2, label: 'Very bad' },
  { value: 3, label: 'Bad' },
  { value: 4, label: 'Meh' },
  { value: 5, label: 'So-so' },
  { value: 6, label: 'Okay' },
  { value: 7, label: 'Good' },
  { value: 8, label: 'Very good' },
  { value: 9, label: 'Great' },
  { value: 10, label: 'Really great' },
];

function ScoreBox({ score, label, isSelected, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`${styles.scoreBox} ${isSelected ? styles.selected : ''}`}
      style={{
        backgroundColor: isHovered ? '#1a1a1a' : scoreToColor(score),
        color: isHovered ? 'white' : 'rgba(0, 0, 0, 0.8)',
      }}
      onClick={() => onSelect(score)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={styles.scoreLabel}>{label}</span>
    </div>
  );
}

function HabitSurvey({ dateKey, existingHabit, onSubmit, onClose }) {
  const [score, setScore] = useState(existingHabit?.score || null);
  const [gratitude, setGratitude] = useState(existingHabit?.gratitude || existingHabit?.note || '');
  const [bedtimeThoughts, setBedtimeThoughts] = useState(existingHabit?.bedtimeThoughts || '');
  const [step, setStep] = useState(1); // 1 = score, 2 = note

  const date = parseDateKey(dateKey);
  const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
  const isEditing = !!existingHabit;


  const handleScoreSelect = (value) => {
    setScore(value);
    // Auto-advance to note step after a brief delay
    setTimeout(() => setStep(2), 400);
  };

  const handleSubmit = () => {
    if (score === null) return;
    onSubmit({
      date: dateKey,
      score,
      note: gratitude.trim(),
      gratitude: gratitude.trim(),
      bedtimeThoughts: bedtimeThoughts.trim(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <div className={styles.header}>
          <span className={styles.dateLabel}>{formattedDate}</span>
          {isEditing && <span className={styles.editBadge}>Editing</span>}
        </div>

        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.question}>How do you feel?</h2>
            <div className={styles.scoresContainer}>
              {SCORES.map((s) => (
                <ScoreBox
                  key={s.value}
                  score={s.value}
                  label={s.label}
                  isSelected={score === s.value}
                  onSelect={handleScoreSelect}
                />
              ))}
            </div>
            {score && (
              <div className={styles.selectedInfo}>
                <span
                  className={styles.selectedColor}
                  style={{ backgroundColor: scoreToColor(score) }}
                />
                <span className={styles.selectedLabel}>
                  {scoreToLabel(score)} ({score}/10)
                </span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.selectedPreview}>
              <span
                className={styles.previewColor}
                style={{ backgroundColor: scoreToColor(score) }}
              />
              <span>{scoreToLabel(score)} ({score}/10)</span>
              <button className={styles.changeButton} onClick={() => setStep(1)}>
                Change
              </button>
            </div>

            <h2 className={styles.question}>Tell us more</h2>
            <label className={styles.fieldLabel} htmlFor="gratitude-input">
              Grateful for
            </label>
            <textarea
              id="gratitude-input"
              className={styles.noteInput}
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you grateful for today? (optional)"
              autoFocus
              rows={3}
            />

            <label className={styles.fieldLabel} htmlFor="bedtime-thoughts-input">
              Thoughts before bed
            </label>
            <textarea
              id="bedtime-thoughts-input"
              className={styles.noteInput}
              value={bedtimeThoughts}
              onChange={(e) => setBedtimeThoughts(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dump the thoughts you want to leave here before sleeping. (optional)"
              rows={4}
            />

            <div className={styles.actions}>
              <button className={styles.skipButton} onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={score === null}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HabitSurvey;
