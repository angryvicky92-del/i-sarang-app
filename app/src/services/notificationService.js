import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabaseClient';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotificationsAsync = async (userId) => {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // Get the Expo Push Token
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    if (!projectId) {
      console.warn('EAS projectId is missing! Push notifications registration skipped.');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    // Save one registration per device without logging the sensitive token.
    if (userId) {
      const { error } = await supabase
        .from('push_devices')
        .upsert({
          user_id: userId,
          expo_push_token: token,
          platform: Platform.OS || 'unknown',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'expo_push_token' });
        
      if (error) {
        if (error.code !== '23505') {
          console.error('Error saving push token to Supabase:', error.message);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
        }
      }
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (e) {
    console.error('Error in push notification registration:', e);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    return null;
  }
};

export const unregisterPushToken = async (userId) => {
    if (!userId) return;
    try {
        const { error } = await supabase
            .from('push_devices')
            .delete()
            .eq('user_id', userId);
        if (error) {
          console.error('Error unregistering push token:', error);
          Toast.show({ type: 'error', text1: '오류 안내', text2: '알림 기기 등록 해제에 실패했습니다.' });
        }
    } catch (e) {
        console.error('Unregister push token failed', e);
      Toast.show({ type: 'error', text1: '오류 안내', text2: '알림 기기 등록 해제에 실패했습니다.' });
    }
};
