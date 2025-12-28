import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createTask, getAvailableTags, syncFromGoogleDrive, getGoogleDriveSyncSettings } from '../../db/database';
import { getTodayDateString } from '../../utils/dateUtils';
import styles from './AddTaskPage.module.css';

function AddTaskPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('creating'); // 'creating' | 'syncing' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [createdTask, setCreatedTask] = useState(null);
  const hasCreatedRef = useRef(false);

  const closeOrRedirect = () => {
    // window.close() only works if the tab was opened via JavaScript
    window.close();
    // If window.close() didn't work (tab opened directly), redirect to home
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 100);
  };

  useEffect(() => {
    const createTaskFromParams = async () => {
      // Prevent double creation from StrictMode
      if (hasCreatedRef.current) return;
      hasCreatedRef.current = true;
      try {
        // Get params from URL
        const title = searchParams.get('title');
        const due = searchParams.get('due');
        const tagsParam = searchParams.get('tags');
        const note = searchParams.get('note');

        // Validate required field
        if (!title) {
          setStatus('error');
          setError('Missing required parameter: title');
          return;
        }

        // Parse tags - can be comma-separated tag IDs or names
        let tagIds = [];
        if (tagsParam) {
          const availableTags = await getAvailableTags();
          const tagInputs = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
          
          for (const tagInput of tagInputs) {
            // First try to find by ID
            const tagById = availableTags.find(t => t.id === tagInput);
            if (tagById) {
              tagIds.push(tagById.id);
              continue;
            }
            
            // Then try to find by name (case-insensitive)
            const tagByName = availableTags.find(
              t => t.name.toLowerCase() === tagInput.toLowerCase()
            );
            if (tagByName) {
              tagIds.push(tagByName.id);
            }
            // Skip unknown tags silently
          }
        }

        // Parse due date - accepts YYYY-MM-DD format or keywords like 'today', 'tomorrow'
        let dueDate = due;
        if (due) {
          const lowerDue = due.toLowerCase();
          if (lowerDue === 'today') {
            dueDate = getTodayDateString();
          } else if (lowerDue === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dueDate = tomorrow.toISOString().split('T')[0];
          } else if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
            // If not a valid date format, default to today
            dueDate = getTodayDateString();
          }
        } else {
          // Default to today if no due date specified
          dueDate = getTodayDateString();
        }

        // Create the task
        const newTask = await createTask({
          content: title,
          dueDate: dueDate,
          note: note || null,
          doneAt: null,
          tags: tagIds,
        });

        setCreatedTask(newTask);

        // Check if sync is enabled and trigger sync
        const syncSettings = await getGoogleDriveSyncSettings();
        if (syncSettings.enabled && syncSettings.shareLink) {
          setStatus('syncing');
          try {
            await syncFromGoogleDrive();
            setStatus('success');
            // Close after a brief success display
            setTimeout(closeOrRedirect, 800);
          } catch (syncError) {
            console.error('Sync failed:', syncError);
            // Still show success for task creation, but note sync failed
            setStatus('success');
            setTimeout(closeOrRedirect, 800);
          }
        } else {
          // No sync configured, just show success and close
          setStatus('success');
          setTimeout(closeOrRedirect, 800);
        }
      } catch (err) {
        console.error('Failed to create task:', err);
        setStatus('error');
        setError(err.message || 'Failed to create task');
      }
    };

    createTaskFromParams();
  }, [searchParams, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'creating' && (
          <>
            <div className={styles.spinner} />
            <p className={styles.message}>Creating task...</p>
          </>
        )}

        {status === 'syncing' && (
          <>
            <div className={styles.spinner} />
            <p className={styles.message}>Syncing...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.title}>Task Created!</h2>
            <p className={styles.taskContent}>{createdTask?.content}</p>
            <p className={styles.redirectMessage}>Closing...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.errorIcon}>✕</div>
            <h2 className={styles.title}>Error</h2>
            <p className={styles.errorMessage}>{error}</p>
            <button 
              className={styles.homeButton}
              onClick={() => navigate('/', { replace: true })}
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AddTaskPage;
