import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Image, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { requestVerification } from '../services/authService';
import { ChevronLeft, Camera, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react-native';

export default function TeacherCertificationScreen({ navigation }) {
  const { session, profile, setProfile } = useAuth();
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const handleSubmit = async () => {
    if (!imageBase64 || !imageUri) {
      Alert.alert('알림', '인증할 자격증 사진을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${session.user.id}_${Date.now()}.${fileExt}`;
      const filePath = `certs/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, decode(imageBase64), { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase.storage.from('certificates').getPublicUrl(filePath);
      const imageUrl = publicUrlData.publicUrl;

      // 3. Update Profile status via authService
      const { data: updatedProfile, error: updateError } = await requestVerification(session.user.id, imageUrl);
      
      if (updateError) throw updateError;

      // 4. Update local context profile
      if (updatedProfile && updatedProfile[0]) {
        setProfile(updatedProfile[0]);
      }

      Alert.alert('신청 완료', '자격증 인증 신청이 완료되었습니다. 관리자 확인 후 승인 처리됩니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('에러', error.message || '인증 신청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (profile?.verification_status) {
      case 'pending': return '승인 대기 중';
      case 'approved': return '인증 완료';
      case 'rejected': return '인증 반려됨';
      default: return '인증 전';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>선생님 자격 인증</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBanner}>
          <ShieldCheck size={24} color="#75BA57" />
          <Text style={styles.statusTitle}>현재 상태: {getStatusText()}</Text>
        </View>

        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>인증 안내</Text>
          <Text style={styles.guideText}>• 보육교사 자격증 또는 재직증명서를 촬영하여 올려주세요.</Text>
          <Text style={styles.guideText}>• 이름과 자격증 번호가 명확히 보여야 합니다.</Text>
          <Text style={styles.guideText}>• 허위 서류 제출 시 이용이 제한될 수 있습니다.</Text>
        </View>

        <TouchableOpacity style={styles.uploadArea} onPress={pickImage} activeOpacity={0.7}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <View style={styles.changeBadge}>
                <Camera size={14} color="#fff" />
                <Text style={styles.changeBadgeText}>변경하기</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Camera size={40} color="#94A3B8" />
              <Text style={styles.placeholderText}>자격증 사진을 선택해주세요</Text>
            </View>
          )}
        </TouchableOpacity>

        {profile?.verification_status === 'rejected' && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#EF4444" />
            <Text style={styles.errorText}>이전 신청이 거절되었습니다. 다시 제출해주세요.</Text>
          </View>
        )}

        {profile?.verification_status === 'approved' && (
          <View style={styles.successBox}>
            <CheckCircle size={18} color="#75BA57" />
            <Text style={styles.successText}>이미 인증이 완료된 회원입니다.</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.submitBtn, (loading || profile?.verification_status === 'pending') && styles.disabledBtn]} 
          onPress={handleSubmit} 
          disabled={loading || profile?.verification_status === 'pending' || profile?.verification_status === 'approved'}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>
              {profile?.verification_status === 'pending' ? '승인 대기 중입니다' : '인증 신청하기'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginLeft: 12 },
  content: { padding: 24 },
  statusBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F0FDF4', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 24,
    gap: 8
  },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#16A34A' },
  guideBox: { 
    backgroundColor: '#F8F9FA', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  guideTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 12 },
  guideText: { fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 4 },
  uploadArea: { 
    width: '100%', 
    aspectRatio: 1.6, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  placeholder: { alignItems: 'center', gap: 12 },
  placeholderText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  imagePreviewContainer: { width: '100%', height: '100%', position: 'relative' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeBadge: { 
    position: 'absolute', 
    bottom: 12, 
    right: 12, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  changeBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, paddingHorizontal: 4 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '500' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, paddingHorizontal: 4 },
  successText: { color: '#75BA57', fontSize: 13, fontWeight: '500' },
  submitBtn: { 
    backgroundColor: '#75BA57', 
    height: 56, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 40
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { backgroundColor: '#CBD5E1' }
});
