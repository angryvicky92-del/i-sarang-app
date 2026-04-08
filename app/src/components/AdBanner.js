import React from 'react';
import { NativeModules, Platform, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

// Real Ad Unit IDs provided by user
const AD_UNIT_ID = Platform.select({
  android: 'ca-app-pub-2170284484198182/3886362627',
  ios: 'ca-app-pub-2170284484198182/7950016129',
  default: 'ca-app-pub-3940256099942544/6300978111', // Test ID fallback
});

const AdBanner = ({ type = 'BANNER', style }) => {
  const { colors, isDarkMode } = useTheme();

  // Load AdMob component ONLY if the native module is actually present in the binary
  // This prevents crashes in Expo Go or when running a build without the module.
  let BannerAd = null;
  let BannerAdSize = null;
  
  // Check for the native module before requiring
  const hasNativeModule = !!NativeModules.RNGoogleMobileAdsModule;

  if (hasNativeModule) {
    try {
      const AdMob = require('react-native-google-mobile-ads');
      BannerAd = AdMob.BannerAd;
      BannerAdSize = AdMob.BannerAdSize;
    } catch (e) {
      console.log('AdMob require failed despite module presence');
    }
  }

  // Safety check for native module (prevents crash in Expo Go or if not built)
  if (!BannerAd || !BannerAdSize) {
    return (
      <View style={[styles.container, { 
        backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', 
        borderStyle: 'dashed', 
        borderWidth: 1, 
        borderColor: colors.border,
        borderRadius: 8
      }, style]}>
        <Text style={{ fontSize: 10, color: colors.textMuted }}>[광고] 실기기 빌드 전용 (Native Module Missing)</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
      }, 
      style
    ]}>
      <BannerAd 
        unitId={AD_UNIT_ID} 
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={(error) => console.log('Ad failed to load: ', error)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  }
});

export default AdBanner;
