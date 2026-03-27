import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Camera, ShieldCheck, ChevronRight, BadgeCheck, LogOut } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { requestVerification } from '../services/authService';

export default function MyPageScreen({ navigation }) {
  const { profile, session, isLoading } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      uploadVerification(result.assets[0]);
    }
  };

  const uploadVerification = async (asset) => {
    setUploading(true);
    try {
      const fileName = `${session.user.id}_${Date.now()}.jpg`;
      const filePath = `verifications/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('community') // Reuse community bucket or use specialized one if exists
        .upload(filePath, decode(asset.base64), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('community').getPublicUrl(filePath);
      const imageUrl = publicUrlData.publicUrl;

      const { error: reqError } = await requestVerification(session.user.id, imageUrl);
      if (reqError) throw reqError;

      Alert.alert('완료', '인증 신청이 접수되었습니다. 관리자 승인을 기다려주세요.');
    } catch (error) {
      Alert.alert('에러', error.message || '인증 신청에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#75BA57" /></View>;

  const isTeacher = profile?.user_type === '선생님';
  const isAdmin = profile?.user_type === '관리자';
  const isVerified = profile?.is_verified;
  const verificationStatus = profile?.verification_status || 'none';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {session ? (
          <>
            <View style={styles.profileSection}>
              <View style={styles.avatarWrapper}>
                <Text style={styles.avatarEmoji}>{isTeacher ? '👩‍🏫' : (profile?.child_gender === '남' ? '👦' : '👧')}</Text>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.nicknameRow}>
                  <Text style={styles.nickname}>{profile?.nickname || '사용자'}님</Text>
                  {isVerified && <BadgeCheck size={18} color="#4A6CF7" />}
                </View>
                <Text style={styles.userTypeText}>
                  {isAdmin ? '🛡️ 시스템 관리자' : isTeacher ? '전문 보육교사 회원' : '아이사랑 학부모 회원'}
                </Text>
              </View>
            </View>

            {/* Teacher Verification Section */}
            {isTeacher && !isVerified && (
              <View style={styles.verificationCard}>
                <Text style={styles.cardTitle}>선생님 자격 인증</Text>
                {verificationStatus === 'pending' ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>인증 심사 중입니다. 잠시만 기다려주세요! ⏳</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.cardDesc}>
                      자격증 사진을 업로드하시면 확인 후 {'\n'}
                      <Text style={{fontWeight: 'bold'}}>'인증 선생님' 배지</Text>를 부여해 드립니다.
                    </Text>
                    <TouchableOpacity 
                      style={styles.uploadBtn} 
                      onPress={handlePickImage} 
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Camera size={18} color="#fff" />
                          <Text style={styles.uploadBtnText}>자격증 사진 올리기</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    {verificationStatus === 'rejected' && (
                      <Text style={styles.rejectText}>❌ 인증이 거절되었습니다. 다시 시도해 주세요.</Text>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Admin Menu */}
            {isAdmin && (
              <View style={styles.menuSection}>
                <Text style={styles.sectionLabel}>관리자 메뉴</Text>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => navigation.navigate('AdminApproval')}
                >
                  <View style={styles.menuItemLeft}>
                    <ShieldCheck size={20} color="#75BA57" />
                    <Text style={styles.menuText}>선생님 자격 승인 관리</Text>
                  </View>
                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.menuSection}>
              <Text style={styles.sectionLabel}>설정</Text>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>알림 설정</Text>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>고객 센터</Text>
                <ChevronRight size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={16} color="#94A3B8" />
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>어린이집 찾기를{'\n'}더 편리하게</Text>
            <Text style={styles.loginDesc}>로그인 후 리뷰를 작성하거나{'\n'}관심 목록을 저장할 수 있습니다.</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginBtnText}>이메일로 로그인 / 가입</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { padding: 24, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatarWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 2 },
  avatarEmoji: { fontSize: 32 },
  profileInfo: { flex: 1 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nickname: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  userTypeText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  verificationCard: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#1E293B' },
  cardDesc: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  uploadBtn: { backgroundColor: '#4A6CF7', height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  pendingBadge: { padding: 16, backgroundColor: '#FEFCE8', borderRadius: 14, alignItems: 'center' },
  pendingText: { color: '#854D0E', fontSize: 13, fontWeight: 'bold' },
  rejectText: { color: '#EF4444', fontSize: 12, textAlign: 'center', marginTop: 12 },
  menuSection: { marginTop: 8 },
  sectionLabel: { paddingHorizontal: 24, paddingVertical: 12, fontSize: 13, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase' },
  menuItem: { paddingHorizontal: 24, paddingVertical: 18, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 15, color: '#334155' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, padding: 20 },
  logoutText: { color: '#94A3B8', fontSize: 14, textDecorationLine: 'underline' },
  loginContainer: { padding: 40, alignItems: 'center', marginTop: 60 },
  loginTitle: { fontSize: 26, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 16 },
  loginDesc: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  loginBtn: { backgroundColor: '#75BA57', width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

