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
    surfaceElevated: string;
    glassBg: string;
    glassBorder: string;
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
  bg: '#070B14',
  card: '#101726',
  surface: '#162033',
  surfaceElevated: '#1C2840',
  glassBg: 'rgba(16, 23, 38, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.09)',
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
  bg: '#F4F6FA',
  card: '#FFFFFF',
  surface: '#EEF2F8',
  surfaceElevated: '#FFFFFF',
  glassBg: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(15, 23, 42, 0.07)',
  border: 'rgba(226, 232, 240, 0.85)',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#6366F1',
  accent: '#8B5CF6',
  emerald: '#059669',
  rose: '#E11D48',
  amber: '#D97706',
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
