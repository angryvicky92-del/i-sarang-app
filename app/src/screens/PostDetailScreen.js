import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User, Calendar, MessageSquare, Send, Trash2, Edit2, X, Eye, Check } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getMyVotes } from '../services/engagementService';
import EngagementButtons from '../components/EngagementButtons';
import AdBanner from '../components/AdBanner';
import UserActionModal from '../components/UserActionModal';
import { getOrCreateChat } from '../services/chatService';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userPostVote, setUserPostVote] = useState(0);
  const [userCommentVotes, setUserCommentVotes] = useState({});

  // Edit State
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditingCommentId, setIsEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [imageAspectRatios, setImageAspectRatios] = useState({}); 

  // Chat Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchComments();
    incrementViewCount();
  }, [fetchPost, fetchComments, incrementViewCount]);

  const incrementViewCount = useCallback(async () => {
    try {
      await supabase.rpc('increment_views', { table_name: 'posts', row_id: postId });
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  }, [postId]);

  const fetchPost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      
      // Fetch author profile separately to avoid join relationship issues
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', data.user_id)
        .single();
        
      setPost({ ...data, profiles: profileData });
      
      const urls = data.image_urls || (data.image_url ? [data.image_url] : []);
      urls.forEach(url => {
        Image.getSize(url, (width, height) => {
          setImageAspectRatios(prev => ({ ...prev, [url]: width / height }));
        }, (err) => console.warn('Image size fetch error', err));
      });
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      
      // Fetch profiles for all commenters
      const commenterIds = [...new Set(data.map(c => c.author_id))];
      const { data: commenterProfiles } = await supabase
        .from('profiles')
        .select('id, user_type')
        .in('id', commenterIds);
        
      const profilesMap = (commenterProfiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      const commentsWithProfiles = data.map(c => ({ ...c, profiles: profilesMap[c.author_id] }));
      
      setComments(commentsWithProfiles || []);
      
      // Fetch user's votes for these comments
      if (profile && data && data.length > 0) {
        const votes = await getMyVotes('comment', data.map(c => c.id), profile.id);
        setUserCommentVotes(votes);
      }
    } catch (error) {
      console.error('Error fetching comments:', error.message);
    }
  }, [postId, profile]);

  const fetchUserPostVote = useCallback(async () => {
    if (!profile) return;
    const votes = await getMyVotes('post', [postId], profile.id);
    setUserPostVote(votes[postId] || 0);
  }, [postId, profile]);

  useEffect(() => {
    if (!loading && post) {
      fetchUserPostVote();
    }
  }, [loading, post, fetchUserPostVote]);

  const handleAddComment = useCallback(async () => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert([{
          post_id: postId,
          author_id: profile.id,
          author_nickname: profile.nickname || '익명',
          content: newComment.trim()
        }]);
      
      if (error) throw error;
      setNewComment('');
      fetchComments();
    } catch {
      Alert.alert('에러', '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [profile, newComment, postId, navigation, fetchComments]);

  const handleDeletePost = useCallback(() => {
    Alert.alert('게시글 삭제', '정말 이 게시글을 삭제하시겠습니까? 삭제된 게시글은 복원할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { 
        text: '삭제', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
            Alert.alert('완료', '게시글이 삭제되었습니다.');
            navigation.goBack();
          } catch {
            Alert.alert('에러', '게시글 삭제 중 문제가 발생했습니다.');
          }
        }
      }
    ]);
  }, [postId, navigation]);

  const handleDeleteComment = useCallback((commentId) => {
    Alert.alert('댓글 삭제', '댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '삭제', 
        style: 'destructive', 
        onPress: async () => {
          try {
            const { data, error } = await supabase.from('post_comments').delete().eq('id', commentId).select();
            
            if (error) {
              throw error;
            }
            
            if (!data || data.length === 0) {
              Alert.alert('알림', '사용자 권한이 없거나 이미 삭제된 댓글입니다.');
              fetchComments();
              return;
            }
            
            setComments(prev => prev.filter(c => c.id !== commentId));
          } catch (e) {
            console.error('Comment delete error:', e);
            Alert.alert('에러', '댓글 삭제 중 문제가 발생했습니다.');
            fetchComments();
          }
        }
      }
    ]);
  }, [fetchComments]);

  const handleUpdatePost = useCallback(async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      Alert.alert('알림', '제목과 내용을 모두 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ title: editTitle.trim(), content: editContent.trim() })
        .eq('id', postId);
      
      if (error) throw error;
      Alert.alert('성공', '게시글이 수정되었습니다.');
      setIsEditingPost(false);
      fetchPost();
    } catch {
      Alert.alert('에러', '게시글 수정 중 문제가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [editTitle, editContent, postId, fetchPost]);

  const handleUpdateComment = useCallback(async (commentId) => {
    if (!editCommentContent.trim()) return;
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .update({ content: editCommentContent.trim() })
        .eq('id', commentId)
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        Alert.alert('알림', '사용자 권한이 없거나 이미 삭제된 댓글입니다.');
        setIsEditingCommentId(null);
        fetchComments();
        return;
      }

      setIsEditingCommentId(null);
      fetchComments();
      Alert.alert('성공', '댓글이 수정되었습니다.');
    } catch (e) {
      console.error('Comment update error:', e);
      Alert.alert('에러', '댓글 수정 중 문제가 발생했습니다.');
    }
  }, [editCommentContent, fetchComments]);

  const startEditingPost = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setIsEditingPost(true);
  };

  const startEditingComment = (comment) => {
    setEditCommentContent(comment.content);
    setIsEditingCommentId(comment.id);
  };

  const handleNicknameClick = (id, nickname, type) => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (id === profile.id) return; // Don't chat with self

    setSelectedUser({ id, nickname, userType: type });
    setIsModalVisible(true);
  };

  const scrollViewRef = React.useRef(null);

  const onInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const startChat = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const chatId = await getOrCreateChat(profile.id, selectedUser.id);
      if (chatId) {
        navigation.navigate('ChatRoom', { chatId, otherUser: selectedUser });
      }
    } catch {
      Alert.alert('오류', '채팅방을 여는 중 문제가 발생했습니다.');
    }
  }, [selectedUser, profile, navigation]);

  const insets = useSafeAreaInsets();

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (!post) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>게시글을 찾을 수 없습니다.</Text></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditingPost ? '글 수정' : '상세보기'}
        </Text>
        <View style={styles.headerRight}>
          {(profile?.id === post?.user_id || profile?.user_type === '관리자') && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {!isEditingPost ? (
                <>
                  <TouchableOpacity onPress={startEditingPost} style={styles.headerActionBtn}>
                    <Edit2 size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeletePost} style={styles.headerActionBtn}>
                    <Trash2 size={18} color="#FF4B4B" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => setIsEditingPost(false)} style={styles.cancelLink}>
                    <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleUpdatePost} disabled={submitting} style={[styles.saveBtnSmall, { backgroundColor: colors.primary }]}>
                    <Check size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.flex1} 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContent}>
            {isEditingPost ? (
              <View style={styles.editForm}>
                <TextInput
                  style={[styles.editTitleInput, { color: colors.text }]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="제목"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[styles.editContentInput, { color: colors.textSecondary }]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="내용을 입력하세요"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  onContentSizeChange={() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }}
                />
              </View>
            ) : (
              <>
                <View style={styles.metaInfo}>
                  {post.profiles?.user_type === '관리자' ? (
                    <View style={[styles.adminChip, { backgroundColor: colors.primary }]}>
                      <Text style={styles.chipText}>관리자</Text>
                    </View>
                  ) : post.type && (
                    <View style={[styles.typeChip, { backgroundColor: post.type === '선생님' ? '#EEF2FF' : '#F0FDF4' }]}>
                      <Text style={[styles.typeChipText, { color: post.type === '선생님' ? '#4A6CF7' : '#16A34A' }]}>{post.type}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleNicknameClick(post.user_id, post.author, post.type)} style={styles.authorInfo}>
                    <Text style={[styles.authorName, { color: colors.text }]}>{post.author}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.metaTime, { color: colors.textMuted }]}>• {new Date(post.created_at).toLocaleDateString()}</Text>
                  <View style={styles.viewCount}>
                    <Eye size={12} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginLeft: 2 }}>{post.views || 0}</Text>
                  </View>
                </View>

                <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
                
                {post.image_urls && post.image_urls.length > 0 ? (
                  post.image_urls.map((url, idx) => (
                    <Image 
                      key={idx}
                      source={{ uri: url }} 
                      style={[styles.postImage, { aspectRatio: imageAspectRatios[url] || 1.5 }]} 
                      resizeMode="cover" 
                    />
                  ))
                ) : post.image_url ? (
                  <Image 
                    source={{ uri: post.image_url }} 
                    style={[styles.postImage, { aspectRatio: imageAspectRatios[post.image_url] || 1.5 }]} 
                    resizeMode="cover" 
                  />
                ) : null}

                <Text style={[styles.postBody, { color: colors.textSecondary }]}>{post.content}</Text>
              </>
            )}
            
            <View style={styles.interactionArea}>
              <EngagementButtons 
                targetType="post" 
                targetId={post.id} 
                item={post} 
                userVote={userPostVote} 
                userId={profile?.id}
                onUpdate={(updatedData) => {
                  setPost(prev => ({ ...prev, ...updatedData }));
                  setUserPostVote(updatedData.userVote);
                }}
              />
            </View>

            <AdBanner />
            
            <View style={styles.commentsWrap}>
              <View style={styles.commentsHeader}>
                <Text style={[styles.commentsTitle, { color: colors.text }]}>댓글 {comments.length}</Text>
              </View>

              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <View style={styles.commentContainer}>
                    <View style={styles.commentTop}>
                      <TouchableOpacity onPress={() => handleNicknameClick(comment.author_id, comment.author_nickname, null)} style={styles.commenter}>
                        {comment.profiles?.user_type === '관리자' && <View style={[styles.adminDot, { backgroundColor: colors.primary }]} />}
                        <Text style={[styles.commenterName, { color: colors.text }]}>{comment.author_nickname}</Text>
                      </TouchableOpacity>
                      <Text style={[styles.commentTime, { color: colors.textMuted }]}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                      
                      {(profile?.id === comment.author_id || profile?.user_type === '관리자') && (
                        <View style={styles.commentActions}>
                          <TouchableOpacity onPress={() => startEditingComment(comment)} style={styles.tinyActionBtn}>
                            <Edit2 size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={styles.tinyActionBtn}>
                            <Trash2 size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    
                    {isEditingCommentId === comment.id ? (
                      <View style={styles.inlineEditWrap}>
                        <TextInput
                          style={[styles.inlineEditInput, { color: colors.text, borderLeftColor: colors.primary }]}
                          value={editCommentContent}
                          onChangeText={setEditCommentContent}
                          multiline
                          autoFocus
                        />
                        <View style={styles.inlineEditActions}>
                          <TouchableOpacity onPress={() => setIsEditingCommentId(null)}>
                            <Text style={{ color: colors.textMuted, fontSize: 13 }}>취소</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleUpdateComment(comment.id)} style={[styles.smallActionBtn, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>수정</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.commentText, { color: colors.textSecondary }]}>{comment.content}</Text>
                    )}
                    
                    <View style={styles.commentBottom}>
                      <EngagementButtons 
                        targetType="comment" 
                        targetId={comment.id} 
                        item={comment} 
                        userVote={userCommentVotes[comment.id] || 0} 
                        userId={profile?.id}
                        onUpdate={(updatedData) => {
                          setComments(prev => prev.map(c => c.id === comment.id ? { ...c, ...updatedData } : c));
                          setUserCommentVotes(prev => ({ ...prev, [comment.id]: updatedData.userVote }));
                        }}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {comments.length === 0 && (
                <View style={styles.emptyWrap}>
                  <MessageSquare size={40} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>첫 댓글의 주인공이 되어보세요</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Sticky Bottom Bar */}
        {!isEditingPost && (
          <View style={[styles.stickyBar, { borderTopColor: colors.border, backgroundColor: isDarkMode ? '#1A202C' : '#FFFFFF', paddingBottom: insets.bottom + 10 }]}>
            <TextInput
              style={[styles.stickyInput, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC', color: colors.text }]}
              placeholder="댓글을 남겨주세요..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxHeight={100}
            />
            <TouchableOpacity 
              onPress={handleAddComment}
              disabled={submitting || !newComment.trim()}
              style={[styles.sendCircle, { backgroundColor: newComment.trim() ? colors.primary : colors.border }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <UserActionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onChat={startChat}
        nickname={selectedUser?.nickname}
        userType={selectedUser?.userType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    borderBottomWidth: 0.5 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActionBtn: { padding: 8 },
  cancelLink: { marginRight: 8 },
  saveBtnSmall: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },

  mainContent: { paddingHorizontal: 20, paddingTop: 20 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  adminChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  typeChipText: { fontSize: 11, fontWeight: '800' },
  authorInfo: { marginRight: 6 },
  authorName: { fontSize: 14, fontWeight: '700' },
  metaTime: { fontSize: 12, marginRight: 8 },
  viewCount: { flexDirection: 'row', alignItems: 'center' },

  postTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24, lineHeight: 32, letterSpacing: -0.8 },
  postImage: { width: '100%', borderRadius: 16, marginBottom: 24 },
  postBody: { fontSize: 17, lineHeight: 28, letterSpacing: -0.2, marginBottom: 40 },

  interactionArea: { borderTopWidth: 0.5, borderTopColor: '#EEE', paddingTop: 20, marginBottom: 40, flexDirection: 'row' },
  
  commentsWrap: { marginTop: 20 },
  commentsHeader: { marginBottom: 24 },
  commentsTitle: { fontSize: 18, fontWeight: '800' },
  
  commentRow: { marginBottom: 24 },
  commentContainer: { paddingLeft: 2 },
  commentTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  commenter: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  adminDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  commenterName: { fontSize: 14, fontWeight: '700' },
  commentTime: { fontSize: 12 },
  commentActions: { marginLeft: 'auto', flexDirection: 'row', gap: 12 },
  tinyActionBtn: { padding: 2 },
  
  commentText: { fontSize: 15, lineHeight: 22, letterSpacing: -0.2, marginBottom: 12 },
  commentBottom: { alignItems: 'flex-start' },

  inlineEditWrap: { marginVertical: 12 },
  inlineEditInput: { fontSize: 15, lineHeight: 22, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  inlineEditActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12 },
  smallActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '500' },

  editForm: { marginTop: 10 },
  editTitleInput: { fontSize: 22, fontWeight: '800', borderBottomWidth: 1.5, borderBottomColor: '#EEE', paddingVertical: 12, marginBottom: 20 },
  editContentInput: { fontSize: 17, lineHeight: 28, minHeight: 300, textAlignVertical: 'top' },

  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -3 }
  },
  stickyInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 10,
    minHeight: 40
  },
  sendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center', 
    alignItems: 'center'
  }
});
