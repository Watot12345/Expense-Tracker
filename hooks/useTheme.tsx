import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeWindStyleSheet } from 'nativewind';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    bg: string;
    card: string;
    surface: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
    accent: string;
    emerald: string;
    rose: string;
    amber: string;
  };
}

const THEME_STORAGE_KEY = '@pennyflow_theme';

const darkColors = {
  bg: '#090D16',
  card: '#111827',
  surface: '#1E293B',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  primary: '#6366F1',
  accent: '#8B5CF6',
  emerald: '#10B981',
  rose: '#F43F5E',
  amber: '#F59E0B',
};

const lightColors = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#F1F5F9',
  border: 'rgba(226, 232, 240, 0.8)',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#6366F1',
  accent: '#8B5CF6',
  emerald: '#10B981',
  rose: '#F43F5E',
  amber: '#F59E0B',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setTheme(saved);
          NativeWindStyleSheet.setColorScheme(saved);
        } else if (deviceScheme === 'light') {
          setTheme('light');
          NativeWindStyleSheet.setColorScheme('light');
        } else {
          NativeWindStyleSheet.setColorScheme('dark');
        }
      } catch {
        NativeWindStyleSheet.setColorScheme('dark');
      }
    })();
  }, [deviceScheme]);

  const toggleTheme = async () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    NativeWindStyleSheet.setColorScheme(nextTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
