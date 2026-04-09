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
    console.log('Push Token:', token);

    // Save token to Supabase profile
    if (userId) {
      // Attempt to clear this token from any other accounts
      // Note: This may fail silently due to RLS permissions (can't update others' rows)
      try {
        await supabase
          .from('profiles')
          .update({ push_token: null })
          .eq('push_token', token)
          .neq('id', userId);
      } catch (e) {
        console.warn('Attempt to clear old push tokens failed (likely RLS):', e.message);
      }

      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);
        
      if (error) {
        if (error.code === '23505') {
          console.warn('Push token already in use by another account. Multiple users on same device?');
          // We can't do much from the client if RLS is strict, but we shouldn't crash.
        } else {
          console.error('Error saving push token to Supabase:', error.message);
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
    return null;
  }
};

export const unregisterPushToken = async (userId) => {
    if (!userId) return;
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ push_token: null })
            .eq('id', userId);
        if (error) console.error('Error unregistering push token:', error);
    } catch (e) {
        console.error('Unregister push token failed', e);
    }
};
