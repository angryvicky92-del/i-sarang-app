import { supabase } from './supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Required for web browser redirect back to app
WebBrowser.maybeCompleteAuthSession();

export const signInWithKakao = async () => {
  try {
    // 1. generate the redirect URI
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'app',
      preferLocalhost: false, // Ensure we don't accidentally use localhost on mobile
    });

    console.log('Redirecting to Supabase with callback:', redirectUrl);

    // 2. start the OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    const authResponse = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );

    if (authResponse.type === 'success') {
      const { url } = authResponse;
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        return { success: true };
      }
    }
    return { success: false };
  } catch (error) {
    console.error('Kakao login error:', error);
    return { success: false, error };
  }
};

export const signInWithGoogle = async () => {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'app',
      preferLocalhost: false,
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    const authResponse = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUrl
    );

    if (authResponse.type === 'success') {
      const { url } = authResponse;
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        return { success: true };
      }
    }
    return { success: false };
  } catch (error) {
    console.error('Google login error:', error);
    return { success: false, error };
  }
};

export const resetPasswordForEmail = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AuthSession.makeRedirectUri({ scheme: 'app', path: 'reset-password' }),
  });
  return { data, error };
};

export const findEmailByNickname = async (nickname) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .single();
  return { data, error };
};

export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

export const updateNickname = async (userId, newNickname) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ nickname: newNickname })
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const getPendingVerifications = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('verification_status', 'pending')
    .eq('user_type', '선생님');
  return { data, error };
};

export const processVerification = async (userId, status) => {
  // status: 'approved' or 'rejected'
  const isVerified = status === 'approved';
  const { data, error } = await supabase
    .from('profiles')
    .update({
      verification_status: status,
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();

  return { data, error };
};

export const requestVerification = async (userId, imageUrl) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      verification_image: imageUrl,
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();

  return { data, error };
};

export const checkNicknameDuplicate = async (nickname) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname.trim());
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
    console.error('Check duplicate error:', error);
    return { data: null, error };
  }
  
  return { isDuplicate: data && data.length > 0, error: null };
};

export const generateRandomNickname = () => {
  const adj = ['즐거운', '밝은', '용감한', '빛나는', '씩씩한', '귀여운', '따뜻한', '슬기로운', '튼튼한', '행복한', '꿈꾸는', '푸른'];
  const noun = ['태양', '바다', '구름', '아이', '나무', '별님', '달님', '사자', '토끼', '강아지', '새싹', '열매'];
  
  const r1 = adj[Math.floor(Math.random() * adj.length)];
  const r2 = noun[Math.floor(Math.random() * noun.length)];
  const r3 = Math.floor(1000 + Math.random() * 9000);
  
  return `${r1} ${r2} ${r3}`;
};
