import React, { useState, useRef } from 'react';
import { TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { VerticalBox } from '@/design/layout/Box';

// Sub-components
import { CommunityWriteHeader } from './components/CommunityWriteHeader';
import { ImageUploadSection } from './components/ImageUploadSection';

// Queries
import { useCreatePost, useUpdatePost } from './queries/useWritePost';

const HEADER_HEIGHT = 60;

export const WritePostScreen: React.FC<any> = ({ route, navigation }) => {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const editPost = route?.params?.post;
  
  // Local Form State
  const [title, setTitle] = useState(editPost?.title || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [images, setImages] = useState(editPost?.image_urls || (editPost?.image_url ? [editPost?.image_url] : []));
  const [isNotice, setIsNotice] = useState(editPost?.is_notice || false);

  // Mutations
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const processed = await Promise.all(result.assets.map(async (asset) => {
        const actions = asset.width > 1200 ? [{ resize: { width: 1200 } }] : [];
        return await ImageManipulator.manipulateAsync(asset.uri, actions, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      }));
      setImages(prev => [...prev, ...processed.map(p => ({ uri: p.uri, base64: p.base64 }))].slice(0, 10));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return Alert.alert('알림', '제목과 내용을 입력해주세요.');
    
    const postData = {
      title: title.trim(),
      content: content.trim(),
      author: profile.nickname || '익명',
      user_id: profile.id,
      image_urls: [], // In a real app, you'd upload images first and get URLs
      type: editPost?.type || (profile.user_type === '선생님' ? '선생님' : '학부모'),
      is_notice: isNotice,
    };

    if (editPost) {
      updateMutation.mutate({ postId: editPost.id, postData }, {
        onSuccess: () => {
          Alert.alert('성공', '수정되었습니다.');
          navigation.goBack();
        }
      });
    } else {
      createMutation.mutate(postData, {
        onSuccess: () => {
          Alert.alert('성공', '등록되었습니다.');
          navigation.goBack();
        }
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CommunityWriteHeader 
        title={editPost ? '글 수정' : '새 글 작성'}
        onBack={() => navigation.goBack()}
        onSubmit={handleSubmit}
        submitting={createMutation.isPending || updateMutation.isPending}
        canSubmit={!!title.trim() && !!content.trim()}
        colors={colors}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + HEADER_HEIGHT : 0}
      >
        <ScrollView ref={scrollViewRef} style={styles.flex1} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.border }]}
            placeholder="제목을 입력하세요"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.contentInput, { color: colors.textSecondary }]}
            placeholder="어떤 이야기를 나누고 싶으신가요?"
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          <ImageUploadSection 
            images={images}
            onPick={handlePickImage}
            onRemove={(idx) => setImages(prev => prev.filter((_, i) => i !== idx))}
            colors={colors}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  titleInput: { fontSize: 26, fontWeight: '800', paddingVertical: 16, borderBottomWidth: 1.5, marginBottom: 24, letterSpacing: -1 },
  contentInput: { fontSize: 18, lineHeight: 28, minHeight: 300, letterSpacing: -0.2 }
});
