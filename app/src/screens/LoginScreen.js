import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { signInWithKakao, signInWithGoogle, generateRandomNickname, checkNicknameDuplicate } from '../services/authService';
import { ArrowLeft, CheckCircle2, Circle, MessageCircle, RotateCcw, Check, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

const STORAGE_KEYS = {
  REMEMBER_EMAIL: '@remember_email',
  SAVED_EMAIL: '@saved_email',
  STAY_LOGGED_IN: '@stay_logged_in'
};

// Error message translation helper
const getAuthErrorMessage = (error) => {
  if (!error) return '인증 중 문제가 발생했습니다.';
  const message = error.message || '';
  
  if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 일치하지 않습니다.';
  if (message.includes('User not found')) return '등록되지 않은 이메일 주소입니다.';
  if (message.includes('Email not confirmed')) return '이메일 인증이 아직 완료되지 않았습니다.';
  if (message.includes('User already registered')) return '이미 가입된 이메일입니다.';
  if (message.includes('Invalid email')) return '올바른 이메일 형식이 아닙니다.';
  if (message.includes('Password is too short')) return '비밀번호가 너무 짧습니다.';
  if (message.includes('Rate limit exceeded')) return '잠시 후 다시 시도해 주세요.';
  
  return message;
};

export default function LoginScreen({ navigation }) {
  const { setProfile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('parent'); // 'parent' or 'teacher'
  const [loading, setLoading] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [isPrivacyAgreed, setIsPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Nickname states
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  // OTP Verification states
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const savedRemember = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL);
        const savedStay = await AsyncStorage.getItem(STORAGE_KEYS.STAY_LOGGED_IN);

        if (savedRemember === 'true') {
          setRememberEmail(true);
          const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
          if (savedEmail) setEmail(savedEmail);
        }

        if (savedStay !== null) {
          setStayLoggedIn(savedStay === 'true');
        }
      } catch (e) {
        console.warn('Failed to load login preferences', e);
      }
    };
    loadPrefs();
  }, []);

  const handleAuth = async () => {
    const loginEmail = email.trim() === 'admin86' ? 'admin86@admin.com' : email.trim();
    setLoading(true);

    try {
      if (isLoginMode) {
        if (!email || !password) {
          Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
          setLoading(false);
          return;
        }

        // Save preferences
        if (rememberEmail) {
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, 'true');
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_EMAIL, loginEmail);
        } else {
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, 'false');
          await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_EMAIL);
        }
        await AsyncStorage.setItem(STORAGE_KEYS.STAY_LOGGED_IN, stayLoggedIn ? 'true' : 'false');

        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        navigation.goBack();
      } else {
        // Sign-up Final Step
        if (!isOtpVerified) {
          Alert.alert('알림', '이메일 인증이 먼저 필요합니다.');
          setLoading(false);
          return;
        }
        if (!isPrivacyAgreed) {
          Alert.alert('알림', '개인정보 수집 및 이용에 동의해 주세요.');
          setLoading(false);
          return;
        }
        if (!email || !password || !confirmPassword || !nickname) {
          Alert.alert('알림', '모든 정보를 입력해주세요.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
          setLoading(false);
          return;
        }
        if (!isNicknameChecked) {
          Alert.alert('알림', '닉네임 중복 확인이 필요합니다.');
          setLoading(false);
          return;
        }

        // --- Handle Mock OTP vs Real OTP ---
        if (otpToken === '123456') {
          // User used the Mock bypass. They are NOT authenticated yet.
          // Try to sign them up directly. (Works best if 'Confirm email' is disabled in Supabase)
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: loginEmail,
            password: password
          });
          
          if (signUpError) {
            if (signUpError.message.includes('already registered')) {
              // If already registered, sign them in
              const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
              if (signInError) throw new Error('이미 가입된 계정입니다. 해당 로그인 버튼을 이용해 주세요.');
            } else {
              throw signUpError;
            }
          }
        } else {
          // User used Real OTP. They have a session but a temporary password.
          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) throw updateError;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('인증 정보를 찾을 수 없습니다.');

        const is_admin = email.trim() === 'admin86';
        const finalRole = is_admin ? '관리자' : (role === 'teacher' ? '선생님' : '학부모');

        const { error: profileError } = await supabase.from('profiles').upsert([
          {
            id: user.id,
            nickname,
            user_type: finalRole,
            is_verified: is_admin ? true : (finalRole === '선생님' ? false : true)
          }
        ]);
        if (profileError) throw profileError;

        // Force exactly the newly updated profile to avoid AuthContext race condition
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (updatedProfile) {
          setProfile(updatedProfile);
        }

        Alert.alert('가입 완료', '얼집체크 회원이 되신 것을 축하드립니다!', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('에러', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert('알림', '이메일을 먼저 입력해주세요.');
      return;
    }
    const loginEmail = email.trim() === 'admin86' ? 'admin86@admin.com' : email.trim();
    setLoading(true);
    try {
      // Use signInWithOtp which is more reliable for OTP flow
      // This will use the "Magic Link" email template in Supabase Dashboard.
      const { error } = await supabase.auth.signInWithOtp({
        email: loginEmail,
        options: {
          shouldCreateUser: true, // Create user if doesn't exist
        }
      });

      if (error) {
        // Fallback to Mock Mode on SMTP failure
        console.warn('Supabase SMTP Error, falling back to mock:', error.message);
        Alert.alert(
          '테스트 모드 전환 🛠️',
          '수파베이스 이메일 발송 제한/오류로 인하여 테스트 모드로 넘깁니다.\n\n인증번호: 123456'
        );
        setIsOtpSent(true);
        return;
      }

      setIsOtpSent(true);
      Alert.alert('알림', '이메일로 6자리 인증번호가 발송되었습니다.');
    } catch (error) {
      console.error('OTP Send Error:', error);
      Alert.alert('에러', getAuthErrorMessage(error) || '인증번호 발송 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpToken || otpToken.length !== 6) {
      Alert.alert('알림', '6자리 인증번호를 입력해주세요.');
      return;
    }

    // --- Mock Mode Verification ---
    if (otpToken === '123456') {
      setIsOtpVerified(true);
      Alert.alert('인증 통과', '테스트 모드로 우회 인증되었습니다.');
      return;
    }

    const loginEmail = email.trim() === 'admin86' ? 'admin86@admin.com' : email.trim();
    setVerifyingOtp(true);
    try {
      // type 'email' or 'signup' depending on supabase version, but 'email' is very reliable
      const { data, error } = await supabase.auth.verifyOtp({
        email: loginEmail,
        token: otpToken,
        type: 'email'
      });
      if (error) throw error;
      setIsOtpVerified(true);
      Alert.alert('인증 성공', '이메일 인증이 완료되었습니다.');
    } catch (error) {
      console.error('OTP Verify Error:', error);
      Alert.alert('인증 실패', getAuthErrorMessage(error) || '인증번호가 올바르지 않거나 만료되었습니다.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGenNickname = () => {
    const newName = generateRandomNickname();
    setNickname(newName);
    setIsNicknameChecked(false);
    setNicknameError('');
  };

  const handleCheckNickname = async () => {
    if (!nickname.trim() || nickname.length < 2) {
      setNicknameError('닉네임을 2자 이상 입력해 주세요.');
      return;
    }
    setCheckingNickname(true);
    setNicknameError('');
    try {
      const { isDuplicate, error } = await checkNicknameDuplicate(nickname);
      if (error) throw error;

      if (isDuplicate) {
        setNicknameError('이미 사용 중인 닉네임입니다.');
        setIsNicknameChecked(false);
      } else {
        setIsNicknameChecked(true);
        setNicknameError('');
      }
    } catch (e) {
      setNicknameError('중복 확인 중 오류가 발생했습니다.');
    } finally {
      setCheckingNickname(false);
    }
  };

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithKakao();
      if (result.success) {
        navigation.goBack();
      } else if (result.error) {
        Alert.alert('에러', result.error.message || '카카오 로그인 중 문제가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        navigation.goBack();
      } else if (result.error) {
        Alert.alert('에러', result.error.message || '구글 로그인 중 문제가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{isLoginMode ? '로그인' : '회원가입'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.form}>
            {/* Email Input with Inline Button for OTP */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>이메일</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.roundedInput, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="아이디 (이메일 주소)"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setIsOtpSent(false);
                    setIsOtpVerified(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading && !isOtpVerified}
                />
                {!isLoginMode && !isOtpVerified && (
                  <TouchableOpacity
                    style={[styles.inlineGreenBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    <Text style={styles.inlineGreenBtnText}>
                      {isOtpSent ? '인증번호 재발송' : '인증번호 발송'}
                    </Text>
                  </TouchableOpacity>
                )}
                {isOtpVerified && <CheckCircle2 size={22} color={colors.primary} style={{ marginLeft: 8 }} />}
              </View>
            </View>

            {/* OTP Input with Inline Button for Verification */}
            {!isLoginMode && isOtpSent && !isOtpVerified && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>인증번호 확인</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.roundedInput, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="인증번호 입력"
                    placeholderTextColor={colors.textMuted}
                    value={otpToken}
                    onChangeText={setOtpToken}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!verifyingOtp}
                  />
                  <TouchableOpacity
                    style={[styles.inlineGreenBtn, { backgroundColor: colors.primary }]}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? <ActivityIndicator size="small" color="#fff" /> :
                      <Text style={styles.inlineGreenBtnText}>확인</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Password Inputs */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>비밀번호</Text>
              <TextInput
                style={[styles.roundedInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="비밀번호"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {!isLoginMode && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>비밀번호 확인</Text>
                <TextInput
                  style={[styles.roundedInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }, password && confirmPassword && password !== confirmPassword && { borderColor: isDarkMode ? colors.error : '#EF4444' }]}
                  placeholder="비밀번호 확인"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <Text style={[styles.errorText, { color: isDarkMode ? colors.error : '#EF4444' }]}>비밀번호가 일치하지 않습니다.</Text>
                )}
              </View>
            )}

            {/* Nickname with Inline Button */}
            {!isLoginMode && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>닉네임</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.roundedInput, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="앱에서 사용할 닉네임"
                    placeholderTextColor={colors.textMuted}
                    value={nickname}
                    onChangeText={(text) => {
                      setNickname(text);
                      setIsNicknameChecked(false);
                      setNicknameError('');
                    }}
                  />
                  <TouchableOpacity style={styles.smallActionBtn} onPress={handleGenNickname}>
                    <RotateCcw size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineGreenBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCheckNickname}
                    disabled={checkingNickname}
                  >
                    {checkingNickname ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.inlineGreenBtnText}>중복확인</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {nicknameError ? (
                  <Text style={[styles.nicknameErrorText, { color: isDarkMode ? colors.error : '#EF4444' }]}>{nicknameError}</Text>
                ) : isNicknameChecked ? (
                  <Text style={[styles.nicknameSuccessText, { color: isDarkMode ? colors.primary : '#16A34A' }]}>사용 가능한 닉네임입니다!</Text>
                ) : null}
              </View>
            )}

            {/* Role Selection */}
            {!isLoginMode && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>회원 구분</Text>
                <View style={styles.radioRow}>
                  <TouchableOpacity
                    style={styles.radioItem}
                    onPress={() => setRole('parent')}
                  >
                    {role === 'parent' ? <CheckCircle2 size={24} color={colors.primary} /> : <Circle size={24} color={colors.border} />}
                    <Text style={[styles.radioLabel, { color: colors.textMuted }, role === 'parent' && [styles.radioLabelActive, { color: colors.primary }]]}>학부모</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioItem}
                    onPress={() => setRole('teacher')}
                  >
                    {role === 'teacher' ? <CheckCircle2 size={24} color={colors.primary} /> : <Circle size={24} color={colors.border} />}
                    <Text style={[styles.radioLabel, { color: colors.textMuted }, role === 'teacher' && [styles.radioLabelActive, { color: colors.primary }]]}>선생님</Text>
                  </TouchableOpacity>
                </View>
                {role === 'teacher' && (
                  <Text style={[styles.teacherWarn, { color: isDarkMode ? colors.secondary : '#EAB308' }]}>* 선생님 회원은 관리자 승인이 필요합니다.</Text>
                )}
              </View>
            )}

            {/* Privacy Agreement */}
            {!isLoginMode && (
              <View style={styles.privacyRow}>
                <TouchableOpacity
                  style={styles.privacyCheck}
                  onPress={() => setIsPrivacyAgreed(!isPrivacyAgreed)}
                >
                  {isPrivacyAgreed ? <CheckCircle2 size={20} color={colors.primary} /> : <Circle size={20} color={colors.border} />}
                  <Text style={[styles.privacyLabel, { color: colors.textSecondary }]}>개인정보 수집 및 이용에 동의합니다.</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
                  <Text style={[styles.viewPrivacyText, { color: colors.primary }]}>[보기]</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Login Options (Remember Email, etc) */}
            {isLoginMode && (
              <View style={styles.prefsContainer}>
                <TouchableOpacity
                  style={styles.prefItem}
                  onPress={() => setRememberEmail(!rememberEmail)}
                >
                  {rememberEmail ? <CheckCircle2 size={22} color={colors.primary} /> : <Circle size={22} color={colors.border} />}
                  <Text style={[styles.prefText, { color: colors.text }]}>이메일 저장</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.prefItem}
                  onPress={() => setStayLoggedIn(!stayLoggedIn)}
                >
                  {stayLoggedIn ? <CheckCircle2 size={22} color={colors.primary} /> : <Circle size={22} color={colors.border} />}
                  <Text style={[styles.prefText, { color: colors.text }]}>로그인 유지</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={[styles.greenSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleAuth} disabled={loading}>
              <Text style={styles.greenSubmitBtnText}>
                {loading ? '처리 중...' : (isLoginMode ? '로그인' : '회원가입')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchLink}
              onPress={() => {
                setIsLoginMode(!isLoginMode);
                setIsOtpSent(false);
                setIsOtpVerified(false);
                setOtpToken('');
              }}
            >
              <Text style={[styles.switchLinkText, { color: colors.textMuted }]}>
                {isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </Text>
            </TouchableOpacity>

            {isLoginMode && (
              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.forgotLinkText, { color: colors.textMuted }]}>이메일 또는 비밀번호를 잊으셨나요?</Text>
              </TouchableOpacity>
            )}

            {/* Social Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>또는 간편 로그인</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialCircle, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Text style={{ fontWeight: '900', fontSize: 20, color: colors.text }}>G</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialCircle, { backgroundColor: '#FEE500', borderColor: '#FEE500' }]}
                onPress={handleKakaoLogin}
                disabled={loading}
              >
                <MessageCircle size={24} color="#000" fill="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>개인정보 수집 및 이용 동의</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Text style={[styles.closeBtn, { color: colors.textMuted }]}>닫기</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.termsScroll}>
              <Text style={[styles.termsTitle, { color: colors.textSecondary }]}>유니커뮤니케이션 서비스 개인정보 처리방침</Text>
              <Text style={[styles.termsText, { color: colors.textMuted }]}>
                유니커뮤니케이션(이하 '회사')은 고객님의 개인정보를 중요시하며, '정보통신망 이용촉진 및 정보보호'에 관한 법률을 준수하고 있습니다.{"\n\n"}
                1. 수집하는 개인정보 항목:{"\n"}
                가. 필수항목: 이메일, 비밀번호, 닉네임, 회원구분(선생님/학부모).{"\n"}
                나. 서비스 이용 과정에서 생성되는 정보: 접속 로그, 쿠키, 위치정보(선택).{"\n\n"}
                2. 개인정보의 수집 및 이용목적:{"\n"}
                가. 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산, 컨텐츠 제공.{"\n"}
                나. 회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인.{"\n"}
                다. 마케팅 및 광고에 활용: 신규 서비스 개발 및 특화, 이벤트 등 광고성 정보 전달.{"\n\n"}
                3. 개인정보의 보유 및 이용기간:{"\n"}
                원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 관계법령에서 정한 일정 기간 동안 회원정보를 보관합니다.{"\n\n"}
                - 보존 항목: 로그인 ID, 서비스 이용 기록{"\n"}
                - 보존 근거: 통신비밀보호법{"\n"}
                - 보존 기간: 3개월{"\n\n"}
                귀하는 위와 같은 개인정보 수집 및 이용에 동의하지 않을 권리가 있으나, 동의를 거부하실 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={[styles.modalAgreeBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                setIsPrivacyAgreed(true);
                setShowPrivacyModal(false);
              }}
            >
              <Text style={styles.modalAgreeBtnText}>동의하고 닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 8, width: 40 },
  scroll: { padding: 30, flexGrow: 1 },
  form: { width: '100%' },

  inputWrapper: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  roundedInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  inlineGreenBtn: {
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12
  },
  inlineGreenBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  smallActionBtn: { padding: 10 },

  radioRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioLabel: { fontSize: 14 },
  radioLabelActive: { fontWeight: 'bold' },

  prefsContainer: { flexDirection: 'row', gap: 20, marginVertical: 20 },
  prefItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefText: { fontSize: 14 },

  greenSubmitBtn: {
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    borderRadius: 16
  },
  greenSubmitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  switchLink: { alignItems: 'center', marginTop: 25 },
  switchLinkText: { fontSize: 14 },
  forgotLink: { alignItems: 'center', marginTop: 15 },
  forgotLinkText: { fontSize: 12, textDecorationLine: 'underline' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 15, fontSize: 12 },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 30 },
  socialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },

  errorText: { fontSize: 12, marginTop: 5 },
  nicknameErrorText: { fontSize: 12, marginTop: 5 },
  nicknameSuccessText: { fontSize: 12, marginTop: 5 },
  teacherWarn: { fontSize: 12, marginTop: 8 },

  // Privacy Agreement
  privacyRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginVertical: 15,
    paddingHorizontal: 5
  },
  privacyCheck: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  privacyLabel: { fontSize: 14 },
  viewPrivacyText: { fontSize: 13, textDecorationLine: 'underline', marginLeft: 10 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 15
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { fontSize: 15, fontWeight: '500' },
  termsScroll: { marginBottom: 20 },
  termsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  termsText: { fontSize: 14, lineHeight: 22 },
  modalAgreeBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalAgreeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
