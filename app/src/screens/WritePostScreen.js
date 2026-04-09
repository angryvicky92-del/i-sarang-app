import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '../contexts/ThemeContext';

export default function WritePostScreen({ route, navigation }) {
  const { session, profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [imageBase64s, setImageBase64s] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isNotice, setIsNotice] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled) {
      setLoading(true);
      try {
        const processedAssets = await Promise.all(result.assets.map(async (asset) => {
          // Only resize if original width > 1200
          const actions = asset.width > 1200 ? [{ resize: { width: 1200 } }] : [];
          return await ImageManipulator.manipulateAsync(
            asset.uri,
            actions,
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
        }));

        const newUris = processedAssets.map(a => a.uri);
        const newBase64s = processedAssets.map(a => a.base64);
        setImageUris(prev => [...prev, ...newUris].slice(0, 5));
        setImageBase64s(prev => [...prev, ...newBase64s].slice(0, 5));
      } catch (e) {
        console.error('Image optimization error', e);
        Alert.alert('알림', '이미지 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('알림', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (!session || !profile) {
      Alert.alert('알림', '로그인이 필요한 서비스입니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    setLoading(true);
    try {
      let imageUrls = [];
      if (imageBase64s.length > 0) {
        for (let i = 0; i < imageBase64s.length; i++) {
          const uri = imageUris[i];
          const b64 = imageBase64s[i];
          const fileExt = uri.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${session.user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('community')
            .upload(filePath, decode(b64), { contentType: `image/${fileExt}` });

          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage.from('community').getPublicUrl(filePath);
          imageUrls.push(publicUrlData.publicUrl);
        }
      }

      const targetBoardType = route.params?.boardType === 'teacher' ? '선생님' : '학부모';

      const { error } = await supabase.from('posts').insert([
        {
          user_id: session.user.id,
          author: profile.nickname || '익명',
          title: title.trim(),
          content: content.trim(),
          type: targetBoardType,
          is_notice: isNotice,
          image_url: imageUrls[0] || null, // First image for legacy/list view
          image_urls: imageUrls
        }
      ]);

      if (error) throw error;

      Alert.alert('성공', '게시글이 등록되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('에러', error.message || '게시글 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>게시글 작성</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.submitText, loading && styles.disabledText]}>
              {loading ? '등록 중' : '등록'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.flex1}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={[styles.inputCard, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC' }]}>
            <Text style={[styles.inputLabel, { color: colors.primary }]}>제목</Text>
            <TextInput
              style={[styles.inputTitle, { color: colors.text, borderBottomColor: colors.border }]}
              placeholder="게시글의 제목을 입력하세요"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />

            {profile?.user_type === '관리자' && (
              <View style={[styles.noticeToggle, { borderBottomColor: colors.border }]}>
                 <Text style={[styles.noticeText, { color: colors.textSecondary }]}>중요 공지사항으로 등록</Text>
                 <TouchableOpacity 
                   onPress={() => setIsNotice(!isNotice)} 
                   style={[styles.switch, { backgroundColor: isNotice ? colors.primary : colors.border }]}
                 >
                   <View style={[styles.switchHandle, { transform: [{ translateX: isNotice ? 20 : 0 }] }]} />
                 </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.primary, marginTop: 12 }]}>내용</Text>
            <TextInput
              style={[styles.inputContent, { color: colors.textSecondary }]}
              placeholder="내용을 자유롭게 작성해 주세요..."
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
          
          <View style={[styles.imageSection, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <TouchableOpacity style={[styles.imageBtn, { backgroundColor: colors.card }]} onPress={pickImage} disabled={imageUris.length >= 5}>
                <ImageIcon size={20} color={imageUris.length >= 5 ? colors.textMuted : colors.primary} />
                <Text style={[styles.imageBtnText, { color: imageUris.length >= 5 ? colors.textMuted : colors.text }]}>사진 첨부 ({imageUris.length}/5)</Text>
              </TouchableOpacity>
              {imageUris.length > 0 && (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>좌우로 밀어서 확인</Text>
              )}
            </View>
            
            {imageUris.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScroll}>
                {imageUris.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity 
                      style={[styles.removeImageBtn, { backgroundColor: isDarkMode ? '#4A5568' : '#1A202C' }]} 
                      onPress={() => {
                        setImageUris(prev => prev.filter((_, i) => i !== index));
                        setImageBase64s(prev => prev.filter((_, i) => i !== index));
                      }}
                    >
                      <X size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
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
    height: 64,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    borderBottomWidth: 1 
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  disabledText: { opacity: 0.7 },
  form: { padding: 20 },
  inputCard: { padding: 20, borderRadius: 20, marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 12 },
  noticeToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 14, 
    borderBottomWidth: 1,
    marginBottom: 16
  },
  noticeText: { fontSize: 15, fontWeight: '600' },
  switch: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  switchHandle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  inputContent: { fontSize: 16, minHeight: 400, lineHeight: 24, textAlignVertical: 'top' },
  imageSection: { marginTop: 8, borderTopWidth: 1, paddingTop: 24 },
  imageBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  imageBtnText: { marginLeft: 8, fontWeight: '700', fontSize: 14 },
  imageScroll: { paddingRight: 20, gap: 14, paddingVertical: 12 },
  imagePreviewContainer: { position: 'relative', width: 110, height: 110 },
  imagePreview: { width: 110, height: 110, borderRadius: 16 },
  removeImageBtn: { position: 'absolute', top: -8, right: -8, borderRadius: 14, padding: 6, elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, zIndex: 10 }
});
