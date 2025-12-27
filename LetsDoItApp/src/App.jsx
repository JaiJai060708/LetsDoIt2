import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context';
import HomePage from './pages/HomePage';
import HappinessPage from './pages/HappinessPage';
import OptionsPage from './pages/OptionsPage';
import { getGoogleDriveSyncSettings, syncFromGoogleDrive, setGoogleDriveSyncSettings } from './db/database';
import './App.css';

function AppContent() {
  // Auto-sync from Google Drive on app load if enabled
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        const settings = await getGoogleDriveSyncSettings();
        if (settings.enabled && settings.autoSync && settings.shareLink) {
          console.log('Auto-syncing from Google Drive...');
          await syncFromGoogleDrive();
          await setGoogleDriveSyncSettings({ lastSyncAt: new Date().toISOString() });
          console.log('Auto-sync completed');
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };
    
    performAutoSync();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/happiness" element={<HappinessPage />} />
      <Route path="/options" element={<OptionsPage />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
