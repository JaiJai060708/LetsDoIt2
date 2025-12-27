import { useState, useEffect } from 'react';
import { useSync, SYNC_STATE } from '../../context';
import styles from './SyncButton.module.css';

function SyncButton({ onSyncComplete }) {
  const { 
    syncState, 
    isEnabled, 
    statusMessage, 
    triggerSync,
    lastSyncResult,
  } = useSync();
  
  const [showTooltip, setShowTooltip] = useState(false);

  // Call onSyncComplete when data was pulled
  useEffect(() => {
    if (lastSyncResult?.action === 'pulled' && onSyncComplete) {
      onSyncComplete(lastSyncResult);
    }
  }, [lastSyncResult, onSyncComplete]);

  // Don't render if sync is not configured
  if (!isEnabled && syncState === SYNC_STATE.DISABLED) {
    return null;
  }

  const handleClick = () => {
    triggerSync();
  };

  const getIcon = () => {
    switch (syncState) {
      case SYNC_STATE.SYNCING:
        return (
          <svg 
            className={styles.syncIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        );
      case SYNC_STATE.PULLED:
        return (
          <svg 
            className={styles.downloadIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        );
      case SYNC_STATE.PUSHED:
        return (
          <svg 
            className={styles.uploadIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        );
      case SYNC_STATE.UP_TO_DATE:
        return (
          <svg 
            className={styles.checkIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        );
      case SYNC_STATE.ERROR:
        return (
          <svg 
            className={styles.errorIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      default:
        return (
          <svg 
            className={styles.cloudIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
          </svg>
        );
    }
  };

  const getLabel = () => {
    switch (syncState) {
      case SYNC_STATE.SYNCING:
        return 'Syncing...';
      case SYNC_STATE.PULLED:
        return 'Pulled';
      case SYNC_STATE.PUSHED:
        return 'Pushed';
      case SYNC_STATE.UP_TO_DATE:
        return 'Up to date';
      case SYNC_STATE.ERROR:
        return 'Failed';
      default:
        return 'Sync';
    }
  };

  const getTooltipStyle = () => {
    if (syncState === SYNC_STATE.ERROR) return styles.error;
    if (syncState === SYNC_STATE.PULLED) return styles.success;
    if (syncState === SYNC_STATE.PUSHED) return styles.success;
    if (syncState === SYNC_STATE.UP_TO_DATE) return styles.info;
    return '';
  };

  const showStatusTooltip = showTooltip && statusMessage && 
    [SYNC_STATE.ERROR, SYNC_STATE.PULLED, SYNC_STATE.PUSHED, SYNC_STATE.UP_TO_DATE].includes(syncState);

  return (
    <div className={styles.container}>
      <button
        className={`${styles.syncButton} ${styles[syncState]}`}
        onClick={handleClick}
        disabled={syncState === SYNC_STATE.SYNCING}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={statusMessage || 'Sync with Google Drive'}
      >
        {getIcon()}
        <span className={styles.label}>{getLabel()}</span>
      </button>
      
      {showStatusTooltip && (
        <div className={`${styles.tooltip} ${getTooltipStyle()}`}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default SyncButton;
