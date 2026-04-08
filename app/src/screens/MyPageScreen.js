import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { ShieldCheck, ChevronRight, BadgeCheck, LogOut, Camera, Bookmark, Edit2, Lock, Save, X, RotateCcw, Check, UserMinus, ChevronLeft, Heart, Settings } from 'lucide-react-native';
import { updateNickname, updatePassword, generateRandomNickname, checkNicknameDuplicate } from '../services/authService';

export default function MyPageScreen({ navigation }) {
  const { profile, session, isLoading } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(profile?.nickname || '');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState('');

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    if (!isNicknameChecked && newNickname.trim() !== profile?.nickname) {
      Alert.alert('알림', '닉네임 중복 확인이 필요합니다.');
      return;
    }
    setUpdating(true);
    try {
      const { error } = await updateNickname(session.user.id, newNickname.trim());
      if (error) throw error;
      setIsEditingNickname(false);
      setIsNicknameChecked(false);
      Alert.alert('완료', '닉네임이 성공적으로 변경되었습니다.');
    } catch (error) {
      Alert.alert('에러', error.message || '닉네임 변경 중 문제가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const handleGenNickname = () => {
    const newName = generateRandomNickname();
    setNewNickname(newName);
    setIsNicknameChecked(false);
    setNicknameError('');
  };

  const handleCheckNickname = async () => {
    if (!newNickname.trim() || newNickname.length < 2) {
      setNicknameError('닉네임을 2자 이상 입력해 주세요.');
      return;
    }
    if (newNickname.trim() === profile?.nickname) {
      setIsNicknameChecked(true);
      setNicknameError('');
      return;
    }
    setCheckingNickname(true);
    setNicknameError('');
    try {
      const { isDuplicate, error } = await checkNicknameDuplicate(newNickname);
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

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('알림', '비밀번호는 6자리 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }
    setUpdating(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('완료', '비밀번호가 성공적으로 변경되었습니다.');
    } catch (error) {
      Alert.alert('에러', error.message || '비밀번호 변경 중 문제가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdrawal = async () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 탈퇴하시겠습니까? 계정과 프로필 정보가 영구적으로 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '탈퇴하기', 
          style: 'destructive', 
          onPress: async () => {
            setUpdating(true);
            try {
              const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', session.user.id);
              if (deleteError) throw deleteError;
              await supabase.auth.signOut();
              Alert.alert('탈퇴 완료', '얼집체크 회원 탈퇴가 완료되었습니다.');
            } catch (error) {
              Alert.alert('에러', '탈퇴 중 문제가 발생했습니다: ' + error.message);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;

  const isTeacher = profile?.user_type === '선생님';
  const isAdmin = profile?.user_type === '관리자';
  const isVerified = profile?.is_verified;
  const verificationStatus = profile?.verification_status || 'none';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>마이페이지</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {session ? (
          <>
            <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
              <View style={styles.profileInfo}>
                <View style={styles.nicknameRow}>
                  {isEditingNickname ? (
                    <View style={styles.editSection}>
                      <View style={styles.editRow}>
                        <TextInput
                          style={[styles.nicknameInput, { color: colors.text, borderBottomColor: colors.primary }]}
                          value={newNickname}
                          onChangeText={(text) => {
                            setNewNickname(text);
                            setIsNicknameChecked(false);
                            setNicknameError('');
                          }}
                          placeholder="새 닉네임"
                          placeholderTextColor={colors.textMuted}
                          autoFocus
                        />
                        <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleGenNickname}>
                          <RotateCcw size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.miniCheckBtn, { backgroundColor: isNicknameChecked ? colors.primary : colors.textMuted }]} 
                          onPress={handleCheckNickname}
                          disabled={checkingNickname}
                        >
                          {checkingNickname ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : isNicknameChecked ? (
                            <Check size={16} color="#fff" />
                          ) : (
                            <Text style={styles.miniCheckText}>중복확인</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleUpdateNickname} disabled={updating || (!isNicknameChecked && newNickname !== profile?.nickname)}>
                          <Save size={20} color={(!isNicknameChecked && newNickname !== profile?.nickname) ? colors.textMuted : colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                          setIsEditingNickname(false);
                          setNicknameError('');
                        }}>
                          <X size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                      {nicknameError ? (
                        <Text style={styles.nicknameErrorText}>{nicknameError}</Text>
                      ) : isNicknameChecked && newNickname !== profile?.nickname ? (
                        <Text style={styles.nicknameSuccessText}>사용 가능한 닉네임입니다!</Text>
                      ) : null}
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.nickname, { color: colors.text }]}>{profile?.nickname || '사용자'}님</Text>
                      <TouchableOpacity onPress={() => {
                        setNewNickname(profile?.nickname || '');
                        setIsEditingNickname(true);
                      }}>
                        <Edit2 size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </>
                  )}
                  {isVerified && <BadgeCheck size={18} color="#4A6CF7" />}
                </View>
                  <View style={[
                    styles.userTypeBadge, 
                    { 
                      backgroundColor: (isTeacher || isAdmin) 
                        ? (isDarkMode ? '#4A6CF720' : '#EEF2FF') 
                        : (isDarkMode ? `${colors.primary}20` : `${colors.primary}10`),
                      borderColor: (isTeacher || isAdmin) ? '#4A6CF740' : `${colors.primary}40`
                    }
                  ]}>
                    <Text style={[styles.userTypeBadgeText, { color: (isTeacher || isAdmin) ? '#4A6CF7' : colors.primary }]}>
                      {isAdmin ? '시스템 관리자' : isTeacher ? '전문 보육교사' : '학부모 회원'}
                    </Text>
                  </View>
              </View>
            </View>

            {isTeacher && !isVerified && (
              <View style={[styles.verificationCard, { backgroundColor: colors.card, shadowColor: isDarkMode ? '#000' : '#000' }]}>
                <View style={styles.cardHeaderSmall}>
                  <ShieldCheck size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>선생님 자격 인증</Text>
                </View>
                {verificationStatus === 'pending' ? (
                  <View style={[styles.pendingBadge, { backgroundColor: isDarkMode ? '#1E293B' : '#FEFCE8', borderColor: isDarkMode ? colors.primary : '#FEF08A' }]}>
                    <Text style={[styles.pendingText, { color: isDarkMode ? colors.primary : '#854D0E' }]}>인증 심사 중입니다. 잠시만 기다려주세요! ⏳</Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                      자격증 사진을 업로드하시면 확인 후 {'\n'}
                      <Text style={{fontWeight: '900', color: colors.text}}>'인증 선생님' 배지</Text>를 부여해 드립니다.
                    </Text>
                    <TouchableOpacity 
                      style={[styles.uploadBtn, { backgroundColor: colors.primary }]} 
                      onPress={() => navigation.navigate('TeacherCertification')}
                    >
                      <Camera size={18} color="#fff" />
                      <Text style={styles.uploadBtnText}>자격증 인증 신청하기</Text>
                    </TouchableOpacity>
                    {verificationStatus === 'rejected' && (
                      <View style={[styles.rejectBadge, { backgroundColor: isDarkMode ? `${colors.primary}20` : '#FEF2F2', borderColor: isDarkMode ? colors.primary : '#FEE2E2' }]}>
                        <Text style={[styles.rejectText, { color: isDarkMode ? colors.primary : '#EF4444' }]}>❌ 지난 인증이 거절되었습니다. 다시 신청해주세요.</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {isAdmin && (
              <View style={styles.menuSection}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>관리자 메뉴</Text>
                <TouchableOpacity 
                  style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]} 
                  onPress={() => navigation.navigate('AdminApproval')}
                >
                  <View style={styles.menuItemLeft}>
                    <ShieldCheck size={20} color={colors.primary} />
                    <Text style={[styles.menuText, { color: colors.text }]}>선생님 자격 승인 관리</Text>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.menuSection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>나의 활동</Text>
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('Main', { screen: 'MainTabs', params: { screen: 'ListTab', params: { tab: 'fav' } } })}
              >
                <View style={styles.menuItemLeft}>
                  <Heart size={20} color={colors.primary} />
                  <Text style={[styles.menuText, { color: colors.text }]}>즐겨찾는 어린이집</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('FavoriteJobs')}
              >
                <View style={styles.menuItemLeft}>
                  <Bookmark size={20} color={colors.primary} />
                  <Text style={[styles.menuText, { color: colors.text }]}>스크랩한 구인공고</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.menuSection}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>설정 및 계정</Text>
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                onPress={() => setIsChangingPassword(!isChangingPassword)}
              >
                <View style={styles.menuItemLeft}>
                  <Lock size={20} color={colors.primary} />
                  <Text style={[styles.menuText, { color: colors.text }]}>비밀번호 변경</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
              
              {isChangingPassword && (
                <View style={[styles.passwordChangeArea, { backgroundColor: colors.card }]}>
                  <TextInput
                    style={[styles.settingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="새 비밀번호 (6자 이상)"
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <TextInput
                    style={[styles.settingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="비밀번호 확인"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity 
                    style={[styles.changeBtn, { backgroundColor: colors.primary }]} 
                    onPress={handleChangePassword}
                    disabled={updating}
                  >
                    <Text style={styles.changeBtnText}>{updating ? '변경 중...' : '비밀번호 저장'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <View style={styles.menuItemLeft}>
                  <Settings size={20} color={colors.primary} />
                  <Text style={[styles.menuText, { color: colors.text }]}>설정</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>


            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={16} color={colors.textMuted} />
              <Text style={[styles.logoutText, { color: colors.textMuted }]}>로그아웃</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdrawal} disabled={updating}>
              <UserMinus size={14} color={colors.textMuted} />
              <Text style={[styles.withdrawText, { color: colors.textMuted }]}>회원 탈퇴하기</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={[styles.loginTitle, { color: colors.text }]}>어린이집 찾기를{'\n'}더 편리하게</Text>
            <Text style={[styles.loginDesc, { color: colors.textSecondary }]}>로그인 후 리뷰를 작성하거나{'\n'}관심 목록을 저장할 수 있습니다.</Text>
            <TouchableOpacity style={[styles.loginBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginBtnText}>이메일로 로그인 / 가입</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    height: 60,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottomWidth: 1, 
    paddingHorizontal: 10
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 10 },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20 },
  profileInfo: { flex: 1 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nickname: { fontSize: 20, fontWeight: '900' },
  userTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  userTypeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  verificationCard: { margin: 20, padding: 24, borderRadius: 24, elevation: 4, shadowOpacity: 0.1, shadowRadius: 10 },
  cardHeaderSmall: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  cardDesc: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  uploadBtn: { height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  pendingBadge: { padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  pendingText: { fontSize: 13, fontWeight: 'bold' },
  rejectBadge: { marginTop: 16, padding: 12, borderRadius: 10, borderWidth: 1 },
  rejectText: { fontSize: 12, textAlign: 'center' },
  menuSection: { marginTop: 8 },
  sectionLabel: { paddingHorizontal: 24, paddingVertical: 12, fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' },
  menuItem: { paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 15 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, padding: 20 },
  logoutText: { fontSize: 14, textDecorationLine: 'underline' },
  loginContainer: { padding: 40, alignItems: 'center', marginTop: 60 },
  loginTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 16, lineHeight: 32 },
  loginDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  loginBtn: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editSection: { flex: 1 },
  nicknameInput: { fontSize: 18, fontWeight: '700', borderBottomWidth: 1, flex: 1, padding: 4 },
  miniActionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  miniCheckBtn: { paddingHorizontal: 10, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  miniCheckText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  nicknameErrorText: { fontSize: 11, marginTop: 4 },
  nicknameSuccessText: { fontSize: 11, marginTop: 4 },
  passwordChangeArea: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  settingInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  changeBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  changeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: 10 },
  withdrawText: { fontSize: 12, textDecorationLine: 'underline' }
});

