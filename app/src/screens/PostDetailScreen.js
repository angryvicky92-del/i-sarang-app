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
            // Check if the comment was actually deleted by using .select()
            const { data, error } = await supabase.from('post_comments').delete().eq('id', commentId).select();
            
            if (error) {
              throw error;
            }
            
            if (!data || data.length === 0) {
              // Silently failed in DB (maybe RLS) - Rollback UI
              Alert.alert('알림', '사용자 권한이 없거나 이미 삭제된 댓글입니다.');
              fetchComments();
              return;
            }
            
            // Success - Optimistic update
            setComments(prev => prev.filter(c => c.id !== commentId));
          } catch (e) {
            console.error('Comment delete error:', e);
            Alert.alert('에러', '댓글 삭제 중 문제가 발생했습니다. 관리자 권한이나 본인 댓글 여부를 확인해주세요.');
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
      // Use .select() to verify the update actually occurred in the DB (RLS check)
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
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditingPost ? '게시글 수정' : isEditingCommentId ? '댓글 수정' : '게시글 상세'}
        </Text>
        <View style={styles.headerRight}>
          {(profile?.id === post?.user_id || profile?.user_type === '관리자') && (
            <View style={{ flexDirection: 'row' }}>
              {!isEditingPost ? (
                <>
                  <TouchableOpacity onPress={startEditingPost} style={styles.headerActionBtn}>
                    <Edit2 size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeletePost} style={styles.headerActionBtn}>
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={handleUpdatePost} disabled={submitting} style={[styles.headerActionBtn, { marginRight: 8 }]}>
                    <Check size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditingPost(false)} style={styles.headerActionBtn}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.metaRow}>
          {post.profiles?.user_type === '관리자' ? (
            <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: '#fff' }]}>관리자</Text>
            </View>
          ) : post.type && (
            <View style={[styles.badge, { 
              backgroundColor: post.type === '선생님' 
                ? (isDarkMode ? '#4A6CF720' : '#EEF2FF') 
                : (isDarkMode ? `${colors.primary}20` : `${colors.primary}10`),
              borderColor: post.type === '선생님' ? '#4A6CF740' : `${colors.primary}40`,
              borderWidth: 1
            }]}>
              <Text style={[styles.badgeText, { 
                color: post.type === '선생님' ? '#4A6CF7' : colors.primary 
              }]}>
                {post.type}
              </Text>
            </View>
          )}
          <View style={styles.authorBadge}>
            <User size={12} color={colors.textSecondary} />
            <TouchableOpacity onPress={() => handleNicknameClick(post.user_id, post.author, post.type)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.authorText, { color: colors.textSecondary }]}>{post.author}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateBadge}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{new Date(post.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={styles.viewBadge}>
            <Eye size={12} color={colors.textSecondary} />
            <Text style={[styles.viewText, { color: colors.textSecondary }]}>{post.views || 0}</Text>
          </View>
        </View>

        {isEditingPost ? (
          <View style={[styles.editPostContainer, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC', borderColor: colors.primary, borderWidth: 1 }]}>
            <Text style={[styles.editLabel, { color: colors.primary }]}>게시글 제목 수정</Text>
            <TextInput
              style={[styles.editTitleInput, { color: colors.text, borderBottomColor: colors.border }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="제목"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.editLabel, { color: colors.primary, marginTop: 16 }]}>게시글 내용 수정</Text>
            <TextInput
              style={[styles.editContentInput, { color: colors.textSecondary, borderBottomColor: colors.border }]}
              value={editContent}
              onChangeText={setEditContent}
              placeholder="본문 내용을 입력하세요"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleUpdatePost} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>수정 완료</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.text }]}>{post.title}</Text>
            
            {post.image_urls && post.image_urls.length > 0 ? (
              post.image_urls.map((url, idx) => (
                <Image 
                  key={idx}
                  source={{ uri: url }} 
                  style={[styles.image, { aspectRatio: imageAspectRatios[url] || 1, height: undefined, backgroundColor: colors.card, marginBottom: 12 }]} 
                  resizeMode="cover" 
                />
              ))
            ) : post.image_url ? (
              <Image 
                source={{ uri: post.image_url }} 
                style={[styles.image, { aspectRatio: imageAspectRatios[post.image_url] || 1, height: undefined, backgroundColor: colors.card }]} 
                resizeMode="cover" 
              />
            ) : null}

            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{post.content}</Text>
          </>
        )}
        
        <View style={styles.postEngagement}>
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
        
        <View style={styles.commentSection}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.sectionHeaderRow}>
            <MessageSquare size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>댓글 ({comments.length})</Text>
          </View>

          <AdBanner />

          {comments.map((comment) => (
            <View key={comment.id} style={[
              styles.commentItem, 
              { backgroundColor: colors.card },
              isEditingCommentId === comment.id && { borderColor: colors.primary, borderWidth: 2, backgroundColor: isDarkMode ? '#1A202C' : '#F0F7FF' }
            ]}>
              <View style={styles.commentMeta}>
                <View style={styles.commentMetaLeft}>
                  <TouchableOpacity onPress={() => handleNicknameClick(comment.author_id, comment.author_nickname, null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {comment.profiles?.user_type === '관리자' && (
                      <View style={[styles.adminBadgeSmall, { backgroundColor: colors.primary }]}>
                        <Text style={styles.adminBadgeTextSmall}>관리자</Text>
                      </View>
                    )}
                    <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.author_nickname}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.commentDate, { color: colors.textMuted }]}>{new Date(comment.created_at).toLocaleDateString()}</Text>
                </View>
                {(profile?.id === comment.author_id || profile?.user_type === '관리자') && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {!isEditingCommentId || isEditingCommentId !== comment.id ? (
                      <>
                        <TouchableOpacity onPress={() => startEditingComment(comment)}>
                          <Edit2 size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                          <Trash2 size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() => setIsEditingCommentId(null)}>
                        <X size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              
              {isEditingCommentId === comment.id ? (
                <View style={styles.editCommentContainer}>
                  <Text style={[styles.editLabelSmall, { color: colors.primary }]}>댓글 내용 수정</Text>
                  <TextInput
                    style={[styles.editCommentInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={editCommentContent}
                    onChangeText={setEditCommentContent}
                    multiline
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity 
                      style={[styles.commentCancelBtn, { backgroundColor: colors.border }]} 
                      onPress={() => setIsEditingCommentId(null)}
                    >
                      <Text style={[styles.commentCancelText, { color: colors.text }]}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.commentSaveBtn, { backgroundColor: colors.primary }]} 
                      onPress={() => handleUpdateComment(comment.id)}
                    >
                      <Text style={styles.commentSaveText}>수정 완료</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={[styles.commentContent, { color: colors.textSecondary }]}>{comment.content}</Text>
              )}
              <View style={styles.commentEngagement}>
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
          ))}

          {comments.length === 0 && (
            <Text style={[styles.emptyComments, { color: colors.textMuted }]}>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</Text>
          )}
        </View>
        </ScrollView>

        {!isEditingPost && (
          <View style={[styles.inputContainer, { 
            borderTopColor: colors.border, 
            backgroundColor: colors.card, 
            paddingBottom: Math.max(insets.bottom, 12)
          }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: colors.primary }, !newComment.trim() && { opacity: 0.5 }]} 
              onPress={handleAddComment}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
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
  header: { 
    height: 64, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    borderBottomWidth: 1 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerRight: { width: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  headerActionBtn: { padding: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  
  // Edit Mode Styles
  editPostContainer: { 
    marginBottom: 32, 
    padding: 20, 
    borderRadius: 20, 
    borderStyle: 'dashed'
  },
  editLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  editLabelSmall: { fontSize: 11, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase' },
  editTitleInput: { fontSize: 22, fontWeight: 'bold', borderBottomWidth: 1, paddingVertical: 12, marginBottom: 12 },
  editContentInput: { fontSize: 17, paddingVertical: 12, marginBottom: 20, minHeight: 250, textAlignVertical: 'top', lineHeight: 26 },
  saveBtn: { 
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  editCommentContainer: { marginTop: 16 },
  editCommentInput: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 14, 
    fontSize: 16, 
    minHeight: 120, 
    textAlignVertical: 'top', 
    lineHeight: 24 
  },
  commentSaveBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
  commentCancelBtn: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
  commentSaveText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  commentCancelText: { fontSize: 14, fontWeight: '600' },

  // Viewing Mode Styles
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 28, 
    paddingBottom: 20,
    borderBottomWidth: 1 
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItemText: { fontSize: 13, fontWeight: '500' },
  authorGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
  authorText: { fontSize: 14, fontWeight: '700' },
  title: { 
    fontSize: 26, 
    fontWeight: '800', 
    marginBottom: 28, 
    lineHeight: 36, 
    letterSpacing: -0.6 
  },
  image: { width: '100%', borderRadius: 20, marginBottom: 28 },
  bodyText: { fontSize: 18, lineHeight: 30, letterSpacing: 0.3 },
  
  // Comment Section
  commentSection: { marginTop: 48, paddingBottom: 120 },
  divider: { height: 1.5, marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  commentItem: { 
    marginBottom: 16, 
    padding: 20, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  commentMetaLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  commentAuthor: { fontWeight: '700', fontSize: 15 },
  commentDate: { fontSize: 12 },
  commentContent: { fontSize: 16, lineHeight: 24 },
  emptyComments: { textAlign: 'center', marginTop: 48, fontSize: 16 },
  postEngagement: { marginTop: 48, marginBottom: 16, flexDirection: 'row', justifyContent: 'center' },
  commentEngagement: { marginTop: 18, alignItems: 'flex-end' },
  
  // Sticky Footer
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    padding: 16, 
    borderTopWidth: 1, 
    gap: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -5 }
  },
  input: { 
    flex: 1, 
    borderRadius: 26, 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    maxHeight: 120, 
    fontSize: 16,
    fontWeight: '500'
  },
  sendBtn: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  adminBadgeSmall: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  adminBadgeTextSmall: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
