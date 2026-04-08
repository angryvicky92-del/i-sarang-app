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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>글쓰기</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.submitText, loading && styles.disabledText]}>
              {loading ? '등록중' : '등록'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <TextInput
            style={[styles.inputTitle, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="제목을 입력하세요."
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <TextInput
            style={[styles.inputContent, { color: colors.textSecondary }]}
            placeholder="내용을 자유롭게 남겨주세요."
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  disabledText: { opacity: 0.7 },
  form: { padding: 20 },
  inputTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, borderBottomWidth: 1, paddingBottom: 12 },
  inputContent: { fontSize: 16, minHeight: 200, lineHeight: 24, marginBottom: 20 },
  imageSection: { marginTop: 10, borderTopWidth: 1, paddingTop: 20 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  imageBtnText: { marginLeft: 8, fontWeight: 'bold', fontSize: 14 },
  imageScroll: { paddingRight: 20, gap: 12, paddingVertical: 10 },
  imagePreviewContainer: { position: 'relative', width: 100, height: 100, borderRadius: 12 },
  imagePreview: { width: 100, height: 100, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6, borderRadius: 12, padding: 4, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, zIndex: 10 }
});
