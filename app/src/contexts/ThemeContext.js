import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const THEME_KEY = '@user_theme_preference';

export const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#75BA57',
    background: '#F8F9FA',
    card: '#FFFFFF',
    cardSecondary: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#F1F5F9',
    notification: '#FF3B30',
    error: '#EF4444',
    success: '#10B981',
    successLight: '#F0FDF4',
    errorLight: '#FEF2F2',
    primaryLight: '#EEF2FF',
    inputBackground: '#F8F9FA',
    inputText: '#1E293B',
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#75BA57',
    tabBarInactive: '#94A3B8',
  }
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#75BA57',
    background: '#0F172A',
    card: '#1E293B',
    cardSecondary: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    notification: '#FF453A',
    error: '#F87171',
    success: '#34D399',
    successLight: 'rgba(52, 211, 153, 0.1)',
    errorLight: 'rgba(248, 113, 113, 0.1)',
    primaryLight: 'rgba(117, 186, 87, 0.1)',
    inputBackground: '#334155',
    inputText: '#F8FAFC',
    tabBarBackground: '#1E293B',
    tabBarActive: '#75BA57',
    tabBarInactive: '#64748B',
  }
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      } else {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme, colors: theme.colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
