import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function AdBanner({ style }) {
  const { colors, isDarkMode } = useTheme();
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
        borderColor: colors.border
      },
      style
    ]}>
      <Text style={[styles.text, { color: colors.textMuted }]}>광고</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginVertical: 10
  },
  text: { fontSize: 10 }
});
