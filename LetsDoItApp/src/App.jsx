import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, SyncProvider, useSync } from './context';
import HomePage from './pages/HomePage';
import HappinessPage from './pages/HappinessPage';
import OptionsPage from './pages/OptionsPage';
import AddTaskPage from './pages/AddTaskPage';
import { setAutoSyncCallback } from './db/database';
import './App.css';

// Component that wires up the database auto-sync callback
function SyncCallbackSetup() {
  const { triggerAutoSync } = useSync();
  
  useEffect(() => {
    // Set the callback so database can trigger sync after modifications
    setAutoSyncCallback(triggerAutoSync);
    
    // Clean up on unmount
    return () => {
      setAutoSyncCallback(null);
    };
  }, [triggerAutoSync]);
  
  return null;
}

function AppContent() {
  return (
    <>
      <SyncCallbackSetup />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/happiness" element={<HappinessPage />} />
        <Route path="/options" element={<OptionsPage />} />
        <Route path="/add-task" element={<AddTaskPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SyncProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </SyncProvider>
    </ThemeProvider>
  );
}

export default App;
