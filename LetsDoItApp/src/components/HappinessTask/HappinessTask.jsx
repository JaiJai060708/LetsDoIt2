import { useNavigate } from 'react-router-dom';
import styles from './HappinessTask.module.css';

function HappinessTask() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/happiness');
  };

  return (
    <div className={styles.task}>
      <div className={styles.left}>
        <span className={styles.icon}>✨</span>
        <span className={styles.content}>Track your happiness</span>
      </div>
      <div className={styles.right}>
        <button
          className={styles.checkButton}
          onClick={handleClick}
        >
          Check yourself
        </button>
      </div>
    </div>
  );
}

export default HappinessTask;

