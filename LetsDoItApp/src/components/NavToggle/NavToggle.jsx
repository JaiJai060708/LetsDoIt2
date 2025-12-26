import { useNavigate, useLocation } from 'react-router-dom';
import styles from './NavToggle.module.css';

function NavToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isHappiness = location.pathname === '/happiness';

  return (
    <div className={styles.container}>
      <button
        className={`${styles.option} ${!isHappiness ? styles.active : ''}`}
        onClick={() => navigate('/')}
      >
        Todo
      </button>
      <button
        className={`${styles.option} ${isHappiness ? styles.active : ''}`}
        onClick={() => navigate('/happiness')}
      >
        Happiness
      </button>
    </div>
  );
}

export default NavToggle;

