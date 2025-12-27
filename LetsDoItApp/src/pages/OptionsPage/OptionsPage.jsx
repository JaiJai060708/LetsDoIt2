import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import NavToggle, { SettingsButton } from '../../components/NavToggle';
import Logo from '../../components/Logo';
import { useTheme, useSync, SYNC_STATE } from '../../context';
import { 
  exportAllData, 
  importAllData, 
  deleteAllData,
  getGoogleDriveSyncSettings,
  setGoogleDriveSyncSettings,
  extractGoogleDriveFileId,
  SYNC_RESULT,
} from '../../db/database';
import styles from './OptionsPage.module.css';

// Check if device is mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768 && 'ontouchstart' in window);
};

function OptionsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Use theme context
  const { theme, setTheme } = useTheme();
  
  // Use sync context
  const { syncState, triggerSync, refreshSyncSettings } = useSync();
  
  // Google Drive sync state
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [googleDriveWriteEndpoint, setGoogleDriveWriteEndpoint] = useState('');
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(false);
  const [googleDriveAutoSync, setGoogleDriveAutoSync] = useState(false);
  const [googleDriveLastSyncAt, setGoogleDriveLastSyncAt] = useState(null);
  const [isEditingGoogleDriveLink, setIsEditingGoogleDriveLink] = useState(false);
  const [showAdvancedSync, setShowAdvancedSync] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  
  // Derive syncing state from context
  const isGoogleDriveSyncing = syncState === SYNC_STATE.SYNCING;
  
  // QR Code state
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const qrScannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Load Google Drive settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const googleDriveSettings = await getGoogleDriveSyncSettings();
      setGoogleDriveLink(googleDriveSettings.shareLink || '');
      setGoogleDriveWriteEndpoint(googleDriveSettings.writeEndpoint || '');
      setGoogleDriveEnabled(googleDriveSettings.enabled || false);
      setGoogleDriveAutoSync(googleDriveSettings.autoSync || false);
      setGoogleDriveLastSyncAt(googleDriveSettings.lastSyncAt || null);
      setShowAdvancedSync(!!googleDriveSettings.writeEndpoint);
    };
    loadSettings();
  }, []);

  // Check if mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Theme handlers
  const handleThemeChange = async (newTheme) => {
    await setTheme(newTheme);
    showToast(`Theme changed to ${newTheme === 'light' ? 'Day' : 'Night'} mode`);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `letsdoit-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to export data', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      showToast('Data imported successfully!');
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Failed to import data. Please check the file format.', 'error');
      e.target.value = '';
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllData();
      setShowDeleteModal(false);
      showToast('All data has been deleted');
      // Navigate to home after deletion
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('Failed to delete data', 'error');
    }
  };

  // Google Drive sync handlers
  const handleSaveGoogleDriveLink = async () => {
    try {
      await setGoogleDriveSyncSettings({
        shareLink: googleDriveLink,
        writeEndpoint: googleDriveWriteEndpoint,
        enabled: !!googleDriveLink,
      });
      setGoogleDriveEnabled(!!googleDriveLink);
      setIsEditingGoogleDriveLink(false);
      // Refresh sync context to pick up new settings
      await refreshSyncSettings();
      showToast(googleDriveLink ? 'Google Drive settings saved!' : 'Google Drive link removed');
    } catch (error) {
      console.error('Failed to save Google Drive settings:', error);
      showToast('Failed to save Google Drive settings', 'error');
    }
  };

  const handleGoogleDriveSync = async () => {
    if (!googleDriveLink) {
      showToast('Please enter a Google Drive share link first', 'error');
      return;
    }
    
    try {
      const result = await triggerSync();
      if (result) {
        setGoogleDriveLastSyncAt(new Date().toISOString());
        
        // Show appropriate message based on sync result
        switch (result.action) {
          case SYNC_RESULT.PULLED:
            showToast(`Pulled ${result.tasksImported} tasks, ${result.habitsImported} habits from cloud`);
            break;
          case SYNC_RESULT.PUSHED:
            showToast('Data pushed to cloud successfully!');
            break;
          case SYNC_RESULT.UP_TO_DATE:
            showToast(result.note || 'Already up to date');
            break;
          case SYNC_RESULT.ERROR:
            showToast(`Sync failed: ${result.error}`, 'error');
            break;
          default:
            showToast('Sync complete');
        }
      }
    } catch (error) {
      console.error('Google Drive sync failed:', error);
      showToast(`Sync failed: ${error.message}`, 'error');
    }
  };

  const handleToggleGoogleDriveAutoSync = async () => {
    const newValue = !googleDriveAutoSync;
    setGoogleDriveAutoSync(newValue);
    await setGoogleDriveSyncSettings({ autoSync: newValue });
    // Refresh sync context to pick up new settings
    await refreshSyncSettings();
    showToast(newValue ? 'Auto-sync enabled' : 'Auto-sync disabled');
  };

  const handleDisconnectGoogleDrive = async () => {
    setGoogleDriveLink('');
    setGoogleDriveWriteEndpoint('');
    setGoogleDriveEnabled(false);
    setGoogleDriveAutoSync(false);
    setGoogleDriveLastSyncAt(null);
    setShowAdvancedSync(false);
    await setGoogleDriveSyncSettings({
      shareLink: '',
      writeEndpoint: '',
      enabled: false,
      autoSync: false,
      lastSyncAt: null,
    });
    // Refresh sync context to pick up new settings
    await refreshSyncSettings();
    showToast('Google Drive disconnected');
  };

  const formatLastSync = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Generate QR code data
  const getQRCodeData = () => {
    const data = {
      type: 'letsdoit-sync',
      shareLink: googleDriveLink,
    };
    if (googleDriveWriteEndpoint) {
      data.writeEndpoint = googleDriveWriteEndpoint;
    }
    return JSON.stringify(data);
  };

  // Handle QR code scan result
  const handleQRScanSuccess = useCallback(async (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.type === 'letsdoit-sync' && data.shareLink) {
        setGoogleDriveLink(data.shareLink);
        if (data.writeEndpoint) {
          setGoogleDriveWriteEndpoint(data.writeEndpoint);
          setShowAdvancedSync(true);
        }
        // Stop scanner and close modal
        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current = null;
        }
        setShowQRScanner(false);
        showToast('Sync settings imported from QR code!');
      } else {
        showToast('Invalid QR code format', 'error');
      }
    } catch {
      showToast('Could not read QR code data', 'error');
    }
  }, []);

  // Start QR scanner
  const startQRScanner = useCallback(async () => {
    setShowQRScanner(true);
    
    // Wait for modal to render
    setTimeout(async () => {
      if (!qrScannerRef.current) return;
      
      try {
        const html5QrCode = new Html5Qrcode('qr-scanner-container');
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          handleQRScanSuccess,
          () => {} // Ignore scan failures
        );
      } catch (err) {
        console.error('Failed to start QR scanner:', err);
        showToast('Could not access camera', 'error');
        setShowQRScanner(false);
      }
    }, 100);
  }, [handleQRScanSuccess]);

  // Stop QR scanner
  const stopQRScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      html5QrCodeRef.current = null;
    }
    setShowQRScanner(false);
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Logo />
          <NavToggle />
          <SettingsButton />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              <span className={styles.titleIcon}>⚙️</span>
              Options
            </h1>
            <p className={styles.pageSubtitle}>
              Manage your integrations, preferences, and data
            </p>
          </div>

          {/* Preferences Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.sectionIcon} ${styles.preference}`}>
                🎨
              </div>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>Preferences</h2>
                <p className={styles.sectionDescription}>
                  Customize the appearance of your app
                </p>
              </div>
            </div>

            <div className={styles.themeSelector}>
              <button 
                className={`${styles.themeOption} ${theme === 'light' ? styles.active : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className={`${styles.themePreview} ${styles.light}`}>
                  <div className={styles.themePreviewHeader}></div>
                </div>
                <span className={styles.themeLabel}>☀️ Day Mode</span>
                <div className={styles.themeCheckmark}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </button>

              <button 
                className={`${styles.themeOption} ${theme === 'dark' ? styles.active : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className={`${styles.themePreview} ${styles.dark}`}>
                  <div className={styles.themePreviewHeader}></div>
                </div>
                <span className={styles.themeLabel}>🌙 Night Mode</span>
                <div className={styles.themeCheckmark}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </button>
            </div>
          </section>

          {/* Data Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.sectionIcon} ${styles.data}`}>
                💾
              </div>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>Data Management</h2>
                <p className={styles.sectionDescription}>
                  Sync, backup, and manage your data
                </p>
              </div>
            </div>

            <div className={styles.dataSection}>
              {/* Google Drive Sync */}
              <div className={styles.cloudCard}>
                <div className={styles.cloudHeader}>
                  <div className={styles.cloudLogo}>
                    <svg viewBox="0 0 87.3 78" fill="none">
                      <path d="M6.6 66.85L17.85 45.3l14.1 24.45a13.34 13.34 0 01-25.35-2.9z" fill="#0066DA"/>
                      <path d="M43.65 66.85L29.55 42.4 43.65 18l14.1 24.4z" fill="#00AC47"/>
                      <path d="M80.7 66.85L69.45 45.3l-14.1 24.45a13.34 13.34 0 0025.35-2.9z" fill="#EA4335"/>
                      <path d="M43.65 18L29.55 42.4l-14.1-24.45a13.34 13.34 0 0128.2.05z" fill="#00832D"/>
                      <path d="M43.65 18l14.1 24.4 14.1-24.45a13.34 13.34 0 00-28.2.05z" fill="#2684FC"/>
                      <path d="M57.75 42.4L43.65 66.85h28.2a13.34 13.34 0 00-14.1-24.45z" fill="#FFBA00"/>
                    </svg>
                  </div>
                  <div className={styles.cloudTitleArea}>
                    <h3 className={styles.cloudTitle}>Google Drive</h3>
                    <p className={styles.cloudSubtitle}>Cloud Backup & Sync</p>
                  </div>
                  {googleDriveEnabled && (
                    <div className={styles.cloudStatusBadge}>
                      <span className={styles.cloudStatusIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                      Connected
                    </div>
                  )}
                </div>

                {!googleDriveEnabled || isEditingGoogleDriveLink ? (
                  <div className={styles.cloudSetup}>
                    <div className={styles.cloudInstructionCard}>
                      <div className={styles.cloudInstructionIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      </div>
                      <div className={styles.cloudInstructionText}>
                        <p className={styles.cloudInstructionTitle}>How to connect</p>
                        <ol className={styles.cloudInstructionSteps}>
                          <li>Export your data and upload to Google Drive</li>
                          <li>Right-click → Share → &quot;Anyone with the link&quot;</li>
                          <li>Paste the share link below</li>
                        </ol>
                      </div>
                    </div>
                    
                    {/* QR Code Scanner Button - Mobile Only */}
                    {isMobile && !googleDriveLink && (
                      <button
                        className={styles.cloudScanQRBtn}
                        onClick={startQRScanner}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                          <rect x="7" y="7" width="10" height="10" rx="1" />
                        </svg>
                        Scan QR Code to Import Settings
                      </button>
                    )}
                    
                    <div className={styles.cloudInputWrapper}>
                      <div className={styles.cloudInputIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 10l5 5 5-5M12 15V3" />
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        </svg>
                      </div>
                      <input
                        type="url"
                        placeholder="Paste your Google Drive share link (for reading)..."
                        value={googleDriveLink}
                        onChange={(e) => setGoogleDriveLink(e.target.value)}
                        className={styles.cloudInput}
                      />
                    </div>

                    {/* Advanced settings for two-way sync */}
                    <button
                      className={styles.cloudAdvancedToggle}
                      onClick={() => setShowAdvancedSync(!showAdvancedSync)}
                    >
                      <svg 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        className={showAdvancedSync ? styles.rotated : ''}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                      <span>Advanced: Two-way sync (push to cloud)</span>
                    </button>

                    {showAdvancedSync && (
                      <div className={styles.cloudAdvancedPanel}>
                        <div className={styles.cloudAdvancedHeader}>
                          <p className={styles.cloudAdvancedNote}>
                            To enable pushing data to Google Drive, you need to set up a Google Apps Script Web App.
                          </p>
                          <button 
                            className={styles.cloudSetupGuideBtn}
                            onClick={() => setShowSetupGuide(true)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                            </svg>
                            Setup Guide
                          </button>
                        </div>
                        <div className={styles.cloudInputWrapper}>
                          <div className={styles.cloudInputIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 8l-5-5-5 5M12 3v12" />
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            </svg>
                          </div>
                          <input
                            type="url"
                            placeholder="Google Apps Script Web App URL (for writing)..."
                            value={googleDriveWriteEndpoint}
                            onChange={(e) => setGoogleDriveWriteEndpoint(e.target.value)}
                            className={styles.cloudInput}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.cloudSetupActions}>
                      <button
                        className={styles.cloudConnectBtn}
                        onClick={handleSaveGoogleDriveLink}
                        disabled={!googleDriveLink && !googleDriveEnabled}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                        {googleDriveEnabled ? 'Update Connection' : 'Connect to Drive'}
                      </button>
                      {isEditingGoogleDriveLink && (
                        <button
                          className={styles.cloudCancelBtn}
                          onClick={() => setIsEditingGoogleDriveLink(false)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.cloudConnected}>
                    <div className={styles.cloudFileCard}>
                      <div className={styles.cloudFileIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14,2 14,8 20,8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                      </div>
                      <div className={styles.cloudFileInfo}>
                        <p className={styles.cloudFileName}>backup.json</p>
                        <p className={styles.cloudFileLink}>
                          {googleDriveLink.length > 40 ? `${googleDriveLink.substring(0, 40)}...` : googleDriveLink}
                        </p>
                      </div>
                      <button 
                        className={styles.cloudEditBtn}
                        onClick={() => setIsEditingGoogleDriveLink(true)}
                        title="Edit link"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>

                    <div className={styles.cloudSyncPanel}>
                      <div className={styles.cloudSyncInfo}>
                        <div className={styles.cloudSyncTimestamp}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                          <span>Last synced: <strong>{formatLastSync(googleDriveLastSyncAt)}</strong></span>
                        </div>
                        
                        <label className={styles.cloudAutoSync}>
                          <input
                            type="checkbox"
                            checked={googleDriveAutoSync}
                            onChange={handleToggleGoogleDriveAutoSync}
                          />
                          <span className={styles.cloudAutoSyncSlider}></span>
                          <span className={styles.cloudAutoSyncLabel}>Auto-sync on app load</span>
                        </label>
                      </div>

                      <button
                        className={`${styles.cloudSyncBtn} ${isGoogleDriveSyncing ? styles.syncing : ''}`}
                        onClick={handleGoogleDriveSync}
                        disabled={isGoogleDriveSyncing}
                      >
                        <svg 
                          className={styles.cloudSyncIcon} 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <path d="M23 4v6h-6M1 20v-6h6" />
                          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                        </svg>
                        <span>{isGoogleDriveSyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>
                    </div>

                    <div className={styles.cloudBottomActions}>
                      <button
                        className={styles.cloudQRBtn}
                        onClick={() => setShowQRModal(true)}
                        title="Share sync settings via QR code"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" rx="1" />
                          <rect x="14" y="3" width="7" height="7" rx="1" />
                          <rect x="3" y="14" width="7" height="7" rx="1" />
                          <rect x="14" y="14" width="3" height="3" />
                          <rect x="18" y="14" width="3" height="3" />
                          <rect x="14" y="18" width="3" height="3" />
                          <rect x="18" y="18" width="3" height="3" />
                        </svg>
                        Share QR Code
                      </button>
                      <button
                        className={styles.cloudDisconnectBtn}
                        onClick={handleDisconnectGoogleDrive}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" />
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Export/Import Actions */}
              <div className={styles.dataActions}>
                <button className={`${styles.actionButton} ${styles.export}`} onClick={handleExport}>
                  <div className={`${styles.actionIcon} ${styles.export}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <div className={styles.actionContent}>
                    <p className={styles.actionTitle}>Export Data</p>
                    <p className={styles.actionDescription}>Download as JSON</p>
                  </div>
                </button>

                <button className={`${styles.actionButton} ${styles.import}`} onClick={handleImportClick}>
                  <div className={`${styles.actionIcon} ${styles.import}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  </div>
                  <div className={styles.actionContent}>
                    <p className={styles.actionTitle}>Import Data</p>
                    <p className={styles.actionDescription}>Restore from backup</p>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className={styles.hiddenInput}
                />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className={`${styles.section} ${styles.dangerZone}`}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.sectionIcon} ${styles.danger}`}>
                ⚠️
              </div>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>Danger Zone</h2>
                <p className={styles.sectionDescription}>
                  Irreversible actions that permanently affect your data
                </p>
              </div>
            </div>

            <button className={styles.deleteButton} onClick={() => setShowDeleteModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
              </svg>
              Delete All Data
            </button>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🗑️</div>
            <h3 className={styles.modalTitle}>Delete All Data?</h3>
            <p className={styles.modalDescription}>
              This action cannot be undone. All your tasks, habits, settings, and tags will be permanently deleted.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.modalDeleteBtn}
                onClick={handleDeleteAll}
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className={styles.modalOverlay} onClick={() => setShowSetupGuide(false)}>
          <div className={`${styles.modal} ${styles.setupGuideModal}`} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.modalCloseBtn}
              onClick={() => setShowSetupGuide(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            <div className={styles.setupGuideHeader}>
              <div className={styles.setupGuideIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <h3 className={styles.setupGuideTitle}>Setup Two-Way Sync</h3>
              <p className={styles.setupGuideSubtitle}>
                Follow these steps to enable pushing data to Google Drive
              </p>
            </div>

            <div className={styles.setupGuideContent}>
              <div className={styles.setupStep}>
                <div className={styles.setupStepNumber}>1</div>
                <div className={styles.setupStepContent}>
                  <h4>Create a Google Apps Script</h4>
                  <p>Go to <a href="https://script.google.com" target="_blank" rel="noopener noreferrer">script.google.com</a> and click <strong>New Project</strong></p>
                </div>
              </div>

              <div className={styles.setupStep}>
                <div className={styles.setupStepNumber}>2</div>
                <div className={styles.setupStepContent}>
                  <h4>Paste the Script</h4>
                  <p>Delete the default code and paste this script:</p>
                  <div className={styles.codeBlock}>
                    <button 
                      className={styles.copyCodeBtn}
                      onClick={() => {
                        const fileId = extractGoogleDriveFileId(googleDriveLink) || 'YOUR_FILE_ID_HERE';
                        const script = `// Google Apps Script for LetsDoIt Sync
const FILE_ID = '${fileId}';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const file = DriveApp.getFileById(FILE_ID);
    file.setContent(JSON.stringify(data, null, 2));
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
                        navigator.clipboard.writeText(script);
                        setCopiedScript(true);
                        setTimeout(() => setCopiedScript(false), 2000);
                      }}
                    >
                      {copiedScript ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                          Copy Script
                        </>
                      )}
                    </button>
                    <pre className={styles.codeContent}>
{`const FILE_ID = '${extractGoogleDriveFileId(googleDriveLink) || 'YOUR_FILE_ID'}';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const file = DriveApp.getFileById(FILE_ID);
  file.setContent(JSON.stringify(data, null, 2));
  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok' })
  ).setMimeType(ContentService.MimeType.JSON);
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className={styles.setupStep}>
                <div className={styles.setupStepNumber}>3</div>
                <div className={styles.setupStepContent}>
                  <h4>Deploy as Web App</h4>
                  <ol className={styles.setupSubSteps}>
                    <li>Click <strong>Deploy</strong> → <strong>New deployment</strong></li>
                    <li>Select type: <strong>Web app</strong></li>
                    <li>Execute as: <strong>Me</strong></li>
                    <li>Who has access: <strong>Anyone</strong></li>
                    <li>Click <strong>Deploy</strong> and authorize</li>
                  </ol>
                </div>
              </div>

              <div className={styles.setupStep}>
                <div className={styles.setupStepNumber}>4</div>
                <div className={styles.setupStepContent}>
                  <h4>Copy the Web App URL</h4>
                  <p>Copy the URL that looks like:<br/>
                  <code>https://script.google.com/macros/s/.../exec</code></p>
                  <p>Paste it in the &quot;Write Endpoint&quot; field above.</p>
                </div>
              </div>
            </div>

            <div className={styles.setupGuideFooter}>
              <button 
                className={styles.setupGuideDoneBtn}
                onClick={() => setShowSetupGuide(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div className={`${styles.modal} ${styles.qrModal}`} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.modalCloseBtn}
              onClick={() => setShowQRModal(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            <div className={styles.qrModalContent}>
              <div className={styles.qrCodeWrapper}>
                <QRCodeSVG
                  value={getQRCodeData()}
                  size={220}
                  level="M"
                  includeMargin={true}
                  bgColor="var(--bg-primary)"
                  fgColor="var(--text-primary)"
                />
              </div>
              <h3 className={styles.qrModalTitle}>Scan to Import Settings</h3>
              <p className={styles.qrModalDescription}>
                Use another device to scan this QR code and automatically import your Google Drive sync settings.
              </p>
              <div className={styles.qrModalInfo}>
                <div className={styles.qrInfoItem}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 10l5 5 5-5M12 15V3" />
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  </svg>
                  <span>Read: {googleDriveLink ? 'Configured' : 'Not set'}</span>
                </div>
                {googleDriveWriteEndpoint && (
                  <div className={styles.qrInfoItem}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 8l-5-5-5 5M12 3v12" />
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    </svg>
                    <span>Write: Configured</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className={styles.modalOverlay} onClick={stopQRScanner}>
          <div className={`${styles.modal} ${styles.qrScannerModal}`} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.modalCloseBtn}
              onClick={stopQRScanner}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            <div className={styles.qrScannerContent}>
              <h3 className={styles.qrScannerTitle}>Scan QR Code</h3>
              <p className={styles.qrScannerDescription}>
                Point your camera at a LetsDoIt sync QR code
              </p>
              <div 
                id="qr-scanner-container" 
                ref={qrScannerRef}
                className={styles.qrScannerViewport}
              />
              <button 
                className={styles.qrScannerCancelBtn}
                onClick={stopQRScanner}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.hiding ? styles.hiding : ''}`}>
          <div className={`${styles.toastIcon} ${styles[toast.type]}`}>
            {toast.type === 'success' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            )}
          </div>
          <span className={styles.toastMessage}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default OptionsPage;
