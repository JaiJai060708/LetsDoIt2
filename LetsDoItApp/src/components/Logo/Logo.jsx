import styles from './Logo.module.css';

function Logo() {
  return (
    <div className={styles.logoContainer}>
      <svg
        className={styles.logoIcon}
        viewBox="0 0 140 55"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer paint splash - light blue wash */}
        <path
          d="M5 30C3 22 8 14 20 10C28 7 42 5 60 6C78 7 95 10 110 15C122 19 132 25 130 33C128 41 118 47 100 48C82 49 55 48 35 45C15 42 7 38 5 30Z"
          fill="#a8d4eb"
          opacity="0.6"
          className={styles.brushStroke}
        />
        
        {/* Main brush stroke - dynamic sweep */}
        <path
          d="M12 32C8 24 15 16 32 12C45 9 62 8 80 10C98 12 115 17 125 24C132 29 130 36 122 40C110 46 88 47 65 46C42 45 22 42 14 37C6 32 16 40 12 32Z"
          fill="#7ab8e0"
          className={styles.brushStroke}
        />
        
        {/* Mid layer - texture */}
        <path
          d="M18 30C14 23 25 17 45 14C60 12 78 12 95 16C108 19 118 25 115 32C112 39 95 43 72 43C49 43 28 40 20 35C12 30 22 37 18 30Z"
          fill="#5ba3d4"
          className={styles.brushStroke}
        />
        
        {/* Inner stroke - core */}
        <path
          d="M25 29C22 24 35 19 55 17C70 16 88 17 102 21C112 24 115 29 110 34C105 39 88 41 68 40C48 39 30 36 24 32C18 28 28 34 25 29Z"
          fill="#6bb1dc"
          className={styles.brushStroke}
        />
        
        {/* Paint drips and splatters */}
        <ellipse cx="8" cy="35" rx="3" ry="4" fill="#7ab8e0" opacity="0.7" />
        <circle cx="15" cy="42" r="2.5" fill="#5ba3d4" opacity="0.5" />
        <circle cx="125" cy="28" r="3" fill="#7ab8e0" opacity="0.6" />
        <ellipse cx="130" cy="35" rx="2.5" ry="3" fill="#a8d4eb" opacity="0.5" />
        <circle cx="22" cy="10" r="2" fill="#a8d4eb" opacity="0.4" />
        <circle cx="118" cy="14" r="2.5" fill="#7ab8e0" opacity="0.5" />
        
        {/* Small accent dots */}
        <circle cx="6" cy="25" r="1.5" fill="#5ba3d4" opacity="0.4" />
        <circle cx="133" cy="30" r="1.5" fill="#6bb1dc" opacity="0.4" />
        <circle cx="28" cy="46" r="1.8" fill="#7ab8e0" opacity="0.3" />
        <circle cx="108" cy="46" r="1.5" fill="#5ba3d4" opacity="0.35" />
        
        {/* "letsdoit" text */}
        <text
          x="70"
          y="32"
          textAnchor="middle"
          className={styles.logoText}
          fill="#1a1a1a"
        >
          letsdoit
        </text>
      </svg>
    </div>
  );
}

export default Logo;

