import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, View, Text, Switch, BackHandler, TouchableOpacity, Keyboard, ActionSheetIOS, LayoutAnimation } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { VerticalBox } from '@/design/layout/Box';
import { ChevronDown } from 'lucide-react-native';

// Sub-components
import { CommunityWriteHeader } from './components/CommunityWriteHeader';
import { ImageUploadSection } from './components/ImageUploadSection';

// Queries
import { useCreatePost, useUpdatePost } from './queries/useWritePost';
import { uploadPostImages } from '@/services/image-service';
import { actions, RichEditor, RichToolbar } from 'react-native-pell-rich-editor';

const HEADER_HEIGHT = 56;
const BG_DARK = '#1a1f2e';
const BORDER_DARK = '#2d3343';
const SUBMIT_GREEN = '#67c23a';

export const WritePostScreen: React.FC<any> = ({ route, navigation }) => {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const richText = useRef<RichEditor>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const editPost = route?.params?.post;
  
  // Local Form State
  const [title, setTitle] = useState(editPost?.title || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [images, setImages] = useState(editPost?.image_urls || (editPost?.image_url ? [editPost?.image_url] : []));
  const [isNotice, setIsNotice] = useState(editPost?.is_notice || false);
  const [postType, setPostType] = useState(editPost?.type || (profile?.user_type === '선생님' ? '선생님' : '자유'));
  const [isFocused, setIsFocused] = useState(false);

  // Layout Transition
  const toggleFocus = (focused: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsFocused(focused);
    
    // Ensure the editor regains focus if we re-mount
    if (focused) {
      setTimeout(() => {
        richText.current?.focusContentEditor?.();
      }, 100);
    }
  };

  // Character count stripping HTML tags
  const charCount = content.replace(/<[^>]*>?/gm, '').length;

  // Exit Safety Logic
  const hasUnsavedChanges = title.trim() !== (editPost?.title || '') || 
                           (content !== (editPost?.content || '') && content !== '<p><br></p>');

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        '작성 중단',
        '작성 중인 내용이 사라집니다. 정말 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '나가기', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
      return true;
    }
    navigation.goBack();
    return true;
  }, [hasUnsavedChanges, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => subscription.remove();
    }, [handleBack])
  );

  // Image Processing Utility
  const processImage = async (uri: string, width?: number) => {
    const resizeActions = width && width > 1200 ? [{ resize: { width: 1200 } }] : [];
    return await ImageManipulator.manipulateAsync(uri, resizeActions, { 
      compress: 0.7, 
      format: ImageManipulator.SaveFormat.JPEG, 
      base64: true 
    });
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.');
    
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const p = await processImage(result.assets[0].uri, result.assets[0].width);
      setImages(prev => [...prev, { uri: p.uri, base64: p.base64 }].slice(0, 10));
    }
  };

  const handlePickMultiple = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const processed = await Promise.all(result.assets.map(async (asset) => {
        const p = await processImage(asset.uri, asset.width);
        return { uri: p.uri, base64: p.base64 };
      }));
      setImages(prev => [...prev, ...processed].slice(0, 10));
    }
  };

  const handlePickImage = () => {
    const options = ['사진 찍기', '사진 앨범', '취소'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, title: '사진 첨부' },
        (buttonIndex) => {
          if (buttonIndex === 0) handleTakePhoto();
          else if (buttonIndex === 1) handlePickMultiple();
        }
      );
    } else {
      Alert.alert('사진 첨부', '방법을 선택해주세요', [
        { text: '사진 찍기', onPress: handleTakePhoto },
        { text: '사진 앨범', onPress: handlePickMultiple },
        { text: '취소', style: 'cancel' }
      ]);
    }
  };

  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();
  const [submittingImage, setSubmittingImage] = useState(false);

  const handleSubmit = async () => {
    if (!profile) return Alert.alert('알림', '로그인이 필요합니다.');
    const htmlContent = await richText.current?.getContentHtml();
    if (!title.trim() || !htmlContent || htmlContent === '<p><br></p>') {
      return Alert.alert('알림', '제목과 내용을 입력해주세요.');
    }
    
    setSubmittingImage(true);
    try {
      let uploadedUrls = images;
      if (images.length > 0 && images.some(img => typeof img !== 'string')) {
        uploadedUrls = await uploadPostImages(profile.id, images);
      }
      
      const postData = {
        title: title.trim(),
        content: htmlContent,
        author: profile.nickname || '익명',
        user_id: profile.id,
        image_urls: uploadedUrls,
        type: postType,
        is_notice: isNotice,
      };

      if (editPost) {
        updateMutation.mutate({ postId: editPost.id, postData }, {
          onSuccess: () => { Alert.alert('성공', '수정되었습니다.'); navigation.goBack(); },
          onError: (err) => { console.error('Update post error:', err); Alert.alert('에러', '수정에 실패했습니다.'); }
        });
      } else {
        createMutation.mutate(postData, {
          onSuccess: () => { Alert.alert('성공', '등록되었습니다.'); navigation.goBack(); },
          onError: (err) => { console.error('Create post error:', err); Alert.alert('에러', '등록에 실패했습니다.'); }
        });
      }
    } catch (err) {
      console.error('Post submission error:', err);
      Alert.alert('에러', '저장 중 오류가 발생했습니다.');
    } finally {
      setSubmittingImage(false);
    }
  };

  const dismissKeyboard = () => {
    if (richText.current) {
      richText.current.blurContentEditor?.();
      richText.current.dismissKeyboard?.();
    }
    toggleFocus(false);
    Keyboard.dismiss();
  };

  // Common Editor Config
  const renderEditor = (isFixed: boolean) => (
    <RichEditor
      ref={richText}
      initialContentHTML={content}
      placeholder="어떤 이야기를 나누고 싶으신가요?"
      onChange={setContent}
      onFocus={() => toggleFocus(true)}
      onBlur={() => toggleFocus(false)}
      editorStyle={{
        backgroundColor: BG_DARK,
        color: '#ececec',
        placeholderColor: '#4b5563',
        contentCSSText: `font-size: 17px; line-height: 28px; padding: 16px 16px ${isFixed ? '40px' : '20px'} 16px;`, 
      }}
      style={[
        styles.richEditor, 
        isFixed ? { flex: 1 } : { minHeight: 400 }
      ]}
      scrollEnabled={true}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: BG_DARK }]}>
      <View style={{ height: insets.top, backgroundColor: BG_DARK }} />
      <SafeAreaView style={styles.flex1} edges={['right', 'left', 'bottom']}>
        <CommunityWriteHeader 
          title={editPost ? '글 수정' : (isFocused ? '글 작성' : '글쓰기')}
          onBack={handleBack}
          onSubmit={handleSubmit}
          submitting={createMutation.isPending || updateMutation.isPending || submittingImage}
          canSubmit={!!title.trim()}
          colors={colors}
          headerHeight={HEADER_HEIGHT}
        />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.flex1}
          keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT + insets.top : 0}
        >
          {/* CRITICAL CHANGE: Structural Isolation when focused */}
          <View style={styles.flex1}>
            {isFocused ? (
              // FIXED MODE: No ScrollView parent to ensure the WebView strictly respects its visible height
              <View style={styles.fixedEditorContainer}>
                {renderEditor(true)}
              </View>
            ) : (
              // FORM MODE: ScrollView parent for title/content/images flow
              <ScrollView 
                ref={scrollViewRef} 
                style={styles.flex1} 
                contentContainerStyle={styles.scrollContent} 
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.metaSection}>
                  {(profile?.user_type === '선생님' || profile?.user_type === '관리자') && (
                    <View style={styles.tabContainer}>
                      {['자유', '선생님'].map((t) => (
                        <TouchableOpacity 
                          key={t}
                          style={[styles.tabButton, postType === t && styles.tabButtonActive]}
                          onPress={() => setPostType(t)}
                        >
                          <Text style={[styles.tabText, postType === t && styles.tabTextActive]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TextInput
                    style={[styles.titleInput, { color: '#fff' }]}
                    placeholder="제목을 입력하세요"
                    placeholderTextColor="#4b5563"
                    value={title}
                    onChangeText={setTitle}
                  />
                  <View style={[styles.separator, { backgroundColor: BORDER_DARK }]} />
                  {profile?.user_type === '관리자' && (
                    <View style={[styles.noticeContainer, { borderBottomColor: BORDER_DARK }]}>
                      <Text style={[styles.noticeText, { color: '#fff' }]}>공지사항으로 등록</Text>
                      <Switch
                        value={isNotice}
                        onValueChange={setIsNotice}
                        trackColor={{ false: BORDER_DARK, true: SUBMIT_GREEN }}
                        thumbColor="#fff"
                      />
                    </View>
                  )}
                </View>

                {renderEditor(false)}

                <ImageUploadSection 
                  images={images}
                  onPick={handlePickImage}
                  onRemove={(idx) => setImages(prev => prev.filter((_, i) => i !== idx))}
                  colors={{ ...colors, cardSecondary: '#21283b', border: BORDER_DARK, textSecondary: '#9ca3af' }}
                />
              </ScrollView>
            )}

            {/* STATUS BAR (DOCKABLE) */}
            <View style={[styles.toolbarContainer, { backgroundColor: BG_DARK }]}>
              <View style={[
                styles.statusBar, 
                { borderTopColor: BORDER_DARK, borderTopWidth: 1 },
                // Increase padding during focus for cleaner attached look
                isFocused && { paddingVertical: 8 }
              ]}>
                <Text style={styles.charCountText}>{charCount}/5000</Text>
                {isFocused && (
                  <TouchableOpacity onPress={dismissKeyboard} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <ChevronDown size={22} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  fixedEditorContainer: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  metaSection: { padding: 16 },
  titleInput: { 
    fontSize: 22, 
    fontWeight: '700', 
    paddingVertical: 12, 
    marginBottom: 4 
  },
  separator: {
    height: 1,
    marginBottom: 16,
    opacity: 0.3,
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#21283b',
    borderRadius: 8,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: SUBMIT_GREEN,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#fff',
  },
  toolbarContainer: {
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 0 : 10,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderTopWidth: 0.5,
  },
  charCountText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6b7280',
  },
  richEditor: {
    flex: 1,
  },
});

export default WritePostScreen;
