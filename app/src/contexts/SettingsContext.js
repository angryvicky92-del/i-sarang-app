import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const SettingsContext = createContext();

const SETTINGS_KEY = '@user_notification_settings';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    push: true,
    community: true,
    jobs: true,
    chats: true,
    marketing: false,
    interestedRegions: [],
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      let localSettings = {};
      if (savedSettings !== null) {
        localSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...localSettings }));
      }

      // Sync from Supabase if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('interested_regions, chat_notifications')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          const remoteRegions = profile.interested_regions || [];
          const remoteChatNotif = profile.chat_notifications !== undefined ? profile.chat_notifications : true;
          
          setSettings(prev => {
            const merged = { 
              ...prev, 
              interestedRegions: remoteRegions,
              chats: remoteChatNotif
            };
            AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      
      // Sync specific fields to Supabase
      if (key === 'interestedRegions' || key === 'chats') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const updateData = {};
          if (key === 'interestedRegions') updateData.interested_regions = value;
          if (key === 'chats') updateData.chat_notifications = value;
          
          await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', session.user.id);
        }
      }
    } catch (e) {
      console.error('Failed to update setting', e);
    }
  };

  const toggleSetting = (key) => {
    updateSetting(key, !settings[key]);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, toggleSetting, isSettingsLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
