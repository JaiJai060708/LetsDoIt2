import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting, getDeviceTimezone } from '../db/database';

const ThemeContext = createContext();

const AUTO_DAY_START_HOUR = 6;
const AUTO_NIGHT_START_HOUR = 18;

// Get the current hour in a specific timezone
const getHourInTimezone = (timezone) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hourStr = formatter.format(new Date());
    return parseInt(hourStr, 10);
  } catch {
    // Fallback to local time if timezone is invalid
    return new Date().getHours();
  }
};

const getAutoTheme = (timezone) => {
  const hour = getHourInTimezone(timezone);
  return hour >= AUTO_DAY_START_HOUR && hour < AUTO_NIGHT_START_HOUR ? 'light' : 'dark';
};

// Calculate milliseconds until next theme switch in the given timezone
const getMsUntilNextSwitch = (timezone) => {
  const hour = getHourInTimezone(timezone);
  const now = new Date();
  
  // Get current time components in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const currentSecond = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
  
  let hoursUntilSwitch;
  if (hour < AUTO_DAY_START_HOUR) {
    hoursUntilSwitch = AUTO_DAY_START_HOUR - hour;
  } else if (hour < AUTO_NIGHT_START_HOUR) {
    hoursUntilSwitch = AUTO_NIGHT_START_HOUR - hour;
  } else {
    // Hours until 6am next day
    hoursUntilSwitch = (24 - hour) + AUTO_DAY_START_HOUR;
  }
  
  // Convert to milliseconds, subtracting current minutes and seconds
  const msUntilSwitch = (hoursUntilSwitch * 60 * 60 * 1000) 
    - (currentMinute * 60 * 1000) 
    - (currentSecond * 1000);
  
  return Math.max(msUntilSwitch, 1000); // At least 1 second
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('auto');
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme and timezone from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTheme, savedTimezone] = await Promise.all([
          getSetting('theme'),
          getDeviceTimezone(),
        ]);
        
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          setTheme('auto');
        }
        
        setTimezone(savedTimezone);
        // Set initial resolved theme
        const initialTheme = savedTheme === 'auto' || !savedTheme 
          ? getAutoTheme(savedTimezone) 
          : savedTheme;
        setResolvedTheme(initialTheme);
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);
  
  // Refresh timezone when it might have changed (e.g., from OptionsPage)
  const refreshTimezone = useCallback(async () => {
    const tz = await getDeviceTimezone();
    setTimezone(tz);
  }, []);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.body.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    let timeoutId;

    const applyTheme = () => {
      const nextTheme = theme === 'auto' ? getAutoTheme(timezone) : theme;
      setResolvedTheme(nextTheme);

      if (theme === 'auto') {
        const delay = getMsUntilNextSwitch(timezone);
        timeoutId = setTimeout(applyTheme, delay);
      }
    };

    applyTheme();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [theme, timezone]);

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
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme: setThemeValue, isLoading, refreshTimezone }}>
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
