/* global require */
import { NativeModules } from 'react-native';

export const initializeMobileAds = () => {
  const hasNativeModule = !!(
    NativeModules.RNGoogleMobileAdsModule
    || NativeModules.RNGoogleMobileAdsInternalModule
  );
  if (!hasNativeModule) return Promise.resolve();

  try {
    const mobileAdsModule = require('react-native-google-mobile-ads');
    const mobileAds = mobileAdsModule.default || mobileAdsModule;
    return typeof mobileAds === 'function' ? mobileAds().initialize() : Promise.resolve();
  } catch (error) {
    console.warn('AdMob initialization skipped:', error.message);
    return Promise.resolve();
  }
};
