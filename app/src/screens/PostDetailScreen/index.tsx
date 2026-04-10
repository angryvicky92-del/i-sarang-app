import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StyleSheet, Text, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AdBanner from '@/components/AdBanner';
import UserActionModal from '@/components/UserActionModal';
import { getOrCreateChat } from '@/services/chatService';
import { VerticalBox } from '@/design/layout/Box';

// Sub-components
import { PostHeader } from './components/PostHeader';
import { PostMainContent } from './components/PostMainContent';
import { CommentItem } from './components/CommentItem';
import { StickyCommentInput } from './components/StickyCommentInput';

// Queries
import { usePostDetail, usePostComments, useDeletePost, useUpdatePost, useCreateComment } from './queries/usePostDetail';
import { communityApi } from '@/api/community-api';
import { uploadPostImages } from '@/services/image-service';

const HEADER_HEIGHT = 60;

export const PostDetailScreen: React.FC<any> = ({ route, navigation }) => {
  const { postId } = route.params;
  const { profile } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Server State
  const { data: post, isLoading: postLoading } = usePostDetail(postId);
  const { data: comments = [], isLoading: commentsLoading } = usePostComments(postId);
  
  // Mutations
  const deletePostMutation = useDeletePost();
  const createCommentMutation = useCreateComment();

  // Local UI State
  const [newComment, setNewComment] = useState('');
  const [isEditingCommentId, setIsEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});

  // Increment View Count on Mount
  useEffect(() => {
    if (postId) {
      communityApi.incrementViewCount(postId).catch(err => console.warn('View count increment failed:', err));
    }
  }, [postId]);

  // Calculate Aspect Ratios for Images
  useEffect(() => {
    if (post) {
      const urls = post.image_urls || (post.image_url ? [post.image_url] : []);
      urls.forEach((url: string) => {
        if (!imageAspectRatios[url]) {
          Image.getSize(url, (width, height) => {
            setImageAspectRatios(prev => ({ ...prev, [url]: width / height }));
          }, (err) => console.warn('Failed to get image size:', err));
        }
      });
    }
  }, [post]);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleNicknameClick = (id: string, nickname: string, type: any) => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (id === profile.id) return;
    setSelectedUser({ id, nickname, userType: type });
    setIsModalVisible(true);
  };

  const handleAddComment = () => {
    if (!profile) return navigation.navigate('Login');
    if (!newComment.trim()) return;
    
    createCommentMutation.mutate({
      post_id: postId,
      author_id: profile.id,
      author_nickname: profile.nickname || '익명',
      content: newComment.trim()
    }, {
      onSuccess: () => setNewComment('')
    });
  };

  const handleDeletePost = () => {
    Alert.alert(
      '삭제 확인',
      '정말로 이 게시글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive', 
          onPress: () => {
            deletePostMutation.mutate(postId, {
              onSuccess: () => navigation.goBack()
            });
          }
        }
      ]
    );
  };

  if (postLoading || !post) {
    return (
      <VerticalBox flex={1} justifyContent="center" alignItems="center" backgroundColor={colors.background}>
        <ActivityIndicator color={colors.primary} />
      </VerticalBox>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <PostHeader 
        onBack={() => navigation.goBack()}
        title={isEditingCommentId ? '댓글 수정' : '상세보기'}
        isEditingPost={false}
        isOwner={profile?.id === post?.user_id || profile?.user_type === '관리자'}
        onStartEdit={() => navigation.navigate('WritePost', { post })}
        onDelete={handleDeletePost}
        onSave={() => {}}
        onCancel={() => {}}
        submitting={deletePostMutation.isPending}
        colors={colors}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + HEADER_HEIGHT : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.flex1} 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <PostMainContent 
            post={post}
            imageAspectRatios={imageAspectRatios}
            onNicknameClick={handleNicknameClick}
            userPostVote={0}
            onVoteUpdate={() => {}}
            userId={profile?.id}
            colors={colors}
          />

          <AdBanner />
          
          <VerticalBox paddingHorizontal={20} style={{ marginTop: 20 }}>
            <Text style={[styles.commentsTitle, { color: colors.text }]}>댓글 {comments.length}</Text>
            {comments.map((comment: any) => (
              <CommentItem 
                key={comment.id}
                comment={comment}
                isEditing={isEditingCommentId === comment.id}
                editContent={editCommentContent}
                onEditContentChange={setEditCommentContent}
                onStartEdit={(c) => { setEditCommentContent(c.content); setIsEditingCommentId(c.id); }}
                onCancelEdit={() => setIsEditingCommentId(null)}
                onUpdate={() => {}}
                onDelete={() => {}}
                onNicknameClick={handleNicknameClick}
                userId={profile?.id}
                userVote={0}
                onVoteUpdate={() => {}}
                colors={colors}
              />
            ))}

            {comments.length === 0 && (
              <VerticalBox alignItems="center" style={{ paddingVertical: 60, gap: 12 }}>
                <MessageSquare size={40} color={colors.border} />
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '500' }}>첫 댓글의 주인공이 되어보세요</Text>
              </VerticalBox>
            )}
          </VerticalBox>
        </ScrollView>

        <StickyCommentInput 
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleAddComment}
          submitting={createCommentMutation.isPending}
          colors={colors}
          insets={insets}
        />
      </KeyboardAvoidingView>

      <UserActionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onChat={async () => {
          const chatId = await getOrCreateChat(profile.id, selectedUser.id);
          navigation.navigate('ChatRoom', { chatId, otherUser: selectedUser });
        }}
        nickname={selectedUser?.nickname}
        userType={selectedUser?.userType}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  commentsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 24 }
});
