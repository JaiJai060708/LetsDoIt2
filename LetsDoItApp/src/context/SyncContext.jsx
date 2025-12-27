import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  getGoogleDriveSyncSettings, 
  syncFromGoogleDrive,
  SYNC_RESULT,
} from '../db/database';

// Sync states
export const SYNC_STATE = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  PULLED: 'pulled',
  PUSHED: 'pushed',
  UP_TO_DATE: 'upToDate',
  ERROR: 'error',
  DISABLED: 'disabled',
};

const SyncContext = createContext();

// Debounce time for auto-sync after data modifications (ms)
const AUTO_SYNC_DEBOUNCE = 2000;

export function SyncProvider({ children }) {
  const [syncState, setSyncState] = useState(SYNC_STATE.DISABLED);
  const [isEnabled, setIsEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastSyncResult, setLastSyncResult] = useState(null);
  
  // Debounce timer ref
  const autoSyncTimerRef = useRef(null);
  // Track if we're in the middle of a sync
  const isSyncingRef = useRef(false);
  // Queue auto-sync if one is in progress
  const pendingAutoSyncRef = useRef(false);

  // Check sync settings and update state
  const refreshSyncSettings = useCallback(async () => {
    const settings = await getGoogleDriveSyncSettings();
    const enabled = settings.enabled && !!settings.shareLink;
    setIsEnabled(enabled);
    setAutoSyncEnabled(settings.autoSync || false);
    if (!enabled) {
      setSyncState(SYNC_STATE.DISABLED);
    } else if (syncState === SYNC_STATE.DISABLED) {
      setSyncState(SYNC_STATE.IDLE);
    }
    return settings;
  }, [syncState]);

  // Load sync settings on mount
  useEffect(() => {
    refreshSyncSettings();
  }, []);

  // The core sync function
  const performSync = useCallback(async () => {
    if (isSyncingRef.current || !isEnabled) {
      if (!isEnabled) return null;
      // Queue for later if currently syncing
      pendingAutoSyncRef.current = true;
      return null;
    }
    
    isSyncingRef.current = true;
    setSyncState(SYNC_STATE.SYNCING);
    setStatusMessage('');
    
    try {
      const result = await syncFromGoogleDrive();
      
      // Set state based on sync result
      switch (result.action) {
        case SYNC_RESULT.PULLED:
          setSyncState(SYNC_STATE.PULLED);
          setStatusMessage(`Pulled ${result.tasksImported} tasks, ${result.habitsImported} habits`);
          break;
        case SYNC_RESULT.PUSHED:
          setSyncState(SYNC_STATE.PUSHED);
          setStatusMessage('Data pushed to cloud');
          break;
        case SYNC_RESULT.UP_TO_DATE:
          setSyncState(SYNC_STATE.UP_TO_DATE);
          setStatusMessage(result.note || 'Already up to date');
          break;
        default:
          setSyncState(SYNC_STATE.UP_TO_DATE);
      }
      
      setLastSyncResult(result);
      
      // Reset to idle after status display
      setTimeout(() => {
        setSyncState(SYNC_STATE.IDLE);
        setStatusMessage('');
      }, 3000);
      
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncState(SYNC_STATE.ERROR);
      setStatusMessage(error.message || 'Sync failed');
      setLastSyncResult({ action: SYNC_RESULT.ERROR, error: error.message });
      
      // Reset to idle after error display
      setTimeout(() => {
        setSyncState(SYNC_STATE.IDLE);
        setStatusMessage('');
      }, 5000);
      
      return { action: SYNC_RESULT.ERROR, error: error.message };
    } finally {
      isSyncingRef.current = false;
      
      // Check if there's a pending auto-sync
      if (pendingAutoSyncRef.current) {
        pendingAutoSyncRef.current = false;
        // Schedule it after a short delay
        setTimeout(() => performSync(), 500);
      }
    }
  }, [isEnabled]);

  // Manual sync trigger (for button clicks)
  const triggerSync = useCallback(async () => {
    return performSync();
  }, [performSync]);

  // Auto-sync trigger (called after data modifications)
  // This is debounced to avoid multiple syncs in quick succession
  const triggerAutoSync = useCallback(() => {
    // Only auto-sync if enabled
    if (!autoSyncEnabled || !isEnabled) {
      return;
    }
    
    // Clear any existing timer
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }
    
    // Set new debounced timer
    autoSyncTimerRef.current = setTimeout(() => {
      console.log('Auto-syncing after data modification...');
      performSync();
    }, AUTO_SYNC_DEBOUNCE);
  }, [autoSyncEnabled, isEnabled, performSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, []);

  // Initial auto-sync on app load if enabled
  useEffect(() => {
    const performInitialSync = async () => {
      const settings = await getGoogleDriveSyncSettings();
      if (settings.enabled && settings.autoSync && settings.shareLink) {
        console.log('Auto-syncing on app load...');
        performSync();
      }
    };
    
    performInitialSync();
  }, []);

  // Auto-sync when tab becomes active/visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Check if auto-sync is enabled
        const settings = await getGoogleDriveSyncSettings();
        if (settings.enabled && settings.autoSync && settings.shareLink) {
          console.log('Tab became active, auto-syncing...');
          performSync();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [performSync]);

  const value = {
    // State
    syncState,
    isEnabled,
    autoSyncEnabled,
    statusMessage,
    lastSyncResult,
    
    // Actions
    triggerSync,
    triggerAutoSync,
    refreshSyncSettings,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

// Export a singleton event emitter for database to trigger sync
// This allows the database module to trigger sync without importing React context
let syncTriggerCallback = null;

export function setSyncTriggerCallback(callback) {
  syncTriggerCallback = callback;
}

export function triggerAutoSyncFromDB() {
  if (syncTriggerCallback) {
    syncTriggerCallback();
  }
}

export default SyncContext;

