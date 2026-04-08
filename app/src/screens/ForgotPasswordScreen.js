import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { resetPasswordForEmail } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPasswordForEmail(email.trim());
      if (error) throw error;
      Alert.alert('전송 완료', '비밀번호 재설정 링크가 이메일로 전송되었습니다. 메일함을 확인해 주세요.');
    } catch (error) {
      Alert.alert('에러', error.message || '요청 중 문제가 발생했습니다.');
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>비밀번호 찾기</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? `${colors.primary}20` : '#F0FDF4' }]}>
              <Mail size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>비밀번호 재설정</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>가입하신 이메일 주소를 입력하시면 비밀번호를 재설정할 수 있는 링크를 보내드립니다.</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: colors.primary }]} 
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? '처리 중...' : '인증 메일 보내기'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { padding: 8 },
  content: { padding: 24, alignItems: 'center', marginTop: 40 },
  section: { width: '100%', alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  desc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  input: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20 },
  submitBtn: { width: '100%', padding: 18, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
