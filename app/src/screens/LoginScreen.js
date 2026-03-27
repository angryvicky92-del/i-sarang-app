import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react-native';

export default function LoginScreen({ navigation }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('parent'); // 'parent' or 'teacher'
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const loginEmail = email.trim() === 'admin86' ? 'admin86@admin.com' : email.trim();

    setLoading(true);
    
    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) throw error;
        navigation.goBack();
      } else {
        if (!nickname) {
          Alert.alert('알림', '닉네임을 입력해주세요.');
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase.auth.signUp({
          email: loginEmail,
          password,
        });
        
        if (error) throw error;

        // Create profile
        if (data?.user) {
          const is_admin = email.trim() === 'admin86';
          const { error: profileError } = await supabase.from('profiles').insert([
            {
              id: data.user.id,
              nickname,
              user_type: is_admin ? '관리자' : (role === 'teacher' ? '선생님' : '학부모'),
              is_verified: is_admin ? true : (role === 'teacher' ? false : true)
            }
          ]);
          if (profileError) throw profileError;
        }
        
        Alert.alert('가입 완료', '회원가입이 완료되었습니다. 자동으로 로그인됩니다.', [
          { text: '확인', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('에러', error.message || '인증 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{isLoginMode ? '로그인' : '회원가입'}</Text>
          <Text style={styles.subtitle}>
            {isLoginMode ? '아이사랑 서비스에 오신 것을 환영합니다.' : '간단한 정보로 가입하고 커뮤니티를 이용해보세요.'}
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력해주세요"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isLoginMode && (
              <>
                <Text style={styles.label}>닉네임</Text>
                <TextInput
                  style={styles.input}
                  placeholder="앱에서 사용할 닉네임"
                  value={nickname}
                  onChangeText={setNickname}
                />

                <Text style={styles.label}>회원 구분</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === 'parent' && styles.roleBtnActive]}
                    onPress={() => setRole('parent')}
                  >
                    <Text style={[styles.roleText, role === 'parent' && styles.roleTextActive]}>학부모</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, role === 'teacher' && styles.roleBtnActive]}
                    onPress={() => setRole('teacher')}
                  >
                    <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>어린이집 선생님</Text>
                  </TouchableOpacity>
                </View>
                {role === 'teacher' && (
                  <Text style={styles.teacherWarn}>* 선생님 회원은 가입 후 관리자 승인이 필요합니다.</Text>
                )}
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading}>
              <Text style={styles.submitBtnText}>{loading ? '처리 중...' : (isLoginMode ? '로그인' : '가입하기')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchBtn} onPress={() => setIsLoginMode(!isLoginMode)}>
              <Text style={styles.switchBtnText}>
                {isLoginMode ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex1: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { padding: 8, alignSelf: 'flex-start', marginLeft: -8 },
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', marginBottom: 32 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20 },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  roleBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  roleBtnActive: { borderColor: '#75BA57', backgroundColor: '#F0FDF4' },
  roleText: { color: '#64748B', fontWeight: 'bold' },
  roleTextActive: { color: '#16A34A' },
  teacherWarn: { color: '#EAB308', fontSize: 12, marginBottom: 20 },
  submitBtn: { backgroundColor: '#75BA57', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchBtn: { alignItems: 'center', marginTop: 20, padding: 10 },
  switchBtnText: { color: '#64748B', fontSize: 14, fontWeight: '600' }
});
