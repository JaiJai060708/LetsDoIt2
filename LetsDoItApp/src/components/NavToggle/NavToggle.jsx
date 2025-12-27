import { useNavigate, useLocation } from 'react-router-dom';
import styles from './NavToggle.module.css';

function NavToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentPath = location.pathname;

  return (
    <div className={styles.container}>
      <button
        className={`${styles.option} ${currentPath === '/' ? styles.active : ''}`}
        onClick={() => navigate('/')}
      >
        Todo
      </button>
      <button
        className={`${styles.option} ${currentPath === '/happiness' ? styles.active : ''}`}
        onClick={() => navigate('/happiness')}
      >
        Happiness
      </button>
    </div>
  );
}

function SettingsButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/options';

  return (
    <button
      className={`${styles.settingsBtn} ${isActive ? styles.active : ''}`}
      onClick={() => navigate('/options')}
      aria-label="Options"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </button>
  );
}

export default NavToggle;
export { SettingsButton };

