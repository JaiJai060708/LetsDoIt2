import { createContext, useContext, useState, useEffect } from 'react';
import { getSetting, setSetting } from '../db/database';

const ThemeContext = createContext();

const AUTO_DAY_START_HOUR = 6;
const AUTO_NIGHT_START_HOUR = 18;

const getAutoTheme = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= AUTO_DAY_START_HOUR && hour < AUTO_NIGHT_START_HOUR ? 'light' : 'dark';
};

const getNextAutoSwitchTime = (date = new Date()) => {
  const nextSwitch = new Date(date);
  const hour = date.getHours();

  if (hour < AUTO_DAY_START_HOUR) {
    nextSwitch.setHours(AUTO_DAY_START_HOUR, 0, 0, 0);
  } else if (hour < AUTO_NIGHT_START_HOUR) {
    nextSwitch.setHours(AUTO_NIGHT_START_HOUR, 0, 0, 0);
  } else {
    nextSwitch.setDate(nextSwitch.getDate() + 1);
    nextSwitch.setHours(AUTO_DAY_START_HOUR, 0, 0, 0);
  }

  return nextSwitch;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('auto');
  const [resolvedTheme, setResolvedTheme] = useState(getAutoTheme());
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getSetting('theme');
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          setTheme('auto');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.body.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    let timeoutId;

    const applyTheme = () => {
      const nextTheme = theme === 'auto' ? getAutoTheme() : theme;
      setResolvedTheme(nextTheme);

      if (theme === 'auto') {
        const now = new Date();
        const nextSwitch = getNextAutoSwitchTime(now);
        const delay = Math.max(nextSwitch - now, 0) + 1000;
        timeoutId = setTimeout(applyTheme, delay);
      }
    };

    applyTheme();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setResolvedTheme(newTheme);
    await setSetting('theme', newTheme);
  };

  const setThemeValue = async (newTheme) => {
    setTheme(newTheme);
    await setSetting('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme: setThemeValue, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
