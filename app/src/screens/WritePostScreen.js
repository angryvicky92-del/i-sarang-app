import React, { useState, useRef } from 'react';
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
  const scrollViewRef = useRef(null);
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
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>새 게시글</Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={loading} 
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.submitText}>
              {loading ? '등록 중' : '발행'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.flex1}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.flex1}
            contentContainerStyle={[styles.form, { paddingBottom: 150 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.editorContainer}>
              <TextInput
                style={[styles.inputTitle, { color: colors.text }]}
                placeholder="제목을 입력하세요"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={50}
                returnKeyType="next"
              />

              {profile?.user_type === '관리자' && (
                <View style={[styles.noticeToggle, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC' }]}>
                   <View>
                     <Text style={[styles.noticeText, { color: colors.text }]}>공지사항</Text>
                     <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>리스트 상단에 고정됩니다</Text>
                   </View>
                   <TouchableOpacity 
                     onPress={() => setIsNotice(!isNotice)} 
                     style={[styles.switch, { backgroundColor: isNotice ? colors.primary : colors.border }]}
                   >
                     <View style={[styles.switchHandle, { transform: [{ translateX: isNotice ? 20 : 0 }] }]} />
                   </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={[styles.inputContent, { color: colors.textSecondary }]}
                placeholder="어떤 이야기를 들려주고 싶으신가요?"
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                onContentSizeChange={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
              />
            </View>
            
            <View style={styles.attachmentSection}>
              <View style={styles.attachmentHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>사진 첨부</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>{imageUris.length} / 5</Text>
              </View>

              <View style={styles.imageActionRow}>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC', borderColor: colors.border }]} 
                  onPress={pickImage} 
                  disabled={imageUris.length >= 5}
                >
                  <ImageIcon size={22} color={imageUris.length >= 5 ? colors.textMuted : colors.primary} />
                  <Text style={[styles.addButtonText, { color: colors.textSecondary }]}>사진 추가</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageGallery}>
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.deleteBadge} 
                        onPress={() => {
                          setImageUris(prev => prev.filter((_, i) => i !== index));
                          setImageBase64s(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <X size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
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
    height: 60,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    borderBottomWidth: 0.5 
  },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.5 },
  submitBtn: { 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  form: { paddingHorizontal: 20, paddingTop: 30 },
  editorContainer: { minHeight: 450 },
  inputTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 24, 
    letterSpacing: -0.8,
    paddingVertical: 8
  },
  inputContent: { 
    fontSize: 17, 
    lineHeight: 28, 
    textAlignVertical: 'top',
    minHeight: 300,
    letterSpacing: -0.2
  },

  noticeToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderRadius: 16,
    marginBottom: 32
  },
  noticeText: { fontSize: 15, fontWeight: '700' },
  switch: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  switchHandle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },

  attachmentSection: { marginTop: 40 },
  attachmentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'baseline',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  
  imageActionRow: { flexDirection: 'row', alignItems: 'center' },
  addButton: { 
    width: 90, 
    height: 90, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderStyle: 'dashed',
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  addButtonText: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  
  imageGallery: { paddingRight: 40 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  imagePreview: { width: 90, height: 90, borderRadius: 20 },
  deleteBadge: { 
    position: 'absolute', 
    top: -6, 
    right: -6, 
    backgroundColor: '#FF4B4B', 
    borderRadius: 12, 
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3
  }
});
