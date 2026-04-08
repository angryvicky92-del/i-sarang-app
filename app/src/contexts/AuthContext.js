import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Handle 'Stay Logged In' preference
    const initializeAuth = async () => {
      try {
        const stay = await AsyncStorage.getItem('@stay_logged_in');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (stay === 'false' && currentSession) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setSession(currentSession);
        if (currentSession) fetchProfile(currentSession.user.id);
        else setIsLoading(false);
      } catch (e) {
        console.error('Auth initialization error', e);
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {
      console.warn('Profile fetch err', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, profile, isLoading, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
