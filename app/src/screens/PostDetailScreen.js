import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ChevronLeft, User, Calendar, MessageSquare, Send } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getMyVotes } from '../services/engagementService';
import EngagementButtons from '../components/EngagementButtons';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { profile } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userPostVote, setUserPostVote] = useState(0);
  const [userCommentVotes, setUserCommentVotes] = useState({});

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
      
      // Fetch user's votes for these comments
      if (profile && data && data.length > 0) {
        const votes = await getMyVotes('comment', data.map(c => c.id), profile.id);
        setUserCommentVotes(votes);
      }
    } catch (error) {
      console.error('Error fetching comments:', error.message);
    }
  };

  const fetchUserPostVote = async () => {
    if (!profile) return;
    const votes = await getMyVotes('post', [postId], profile.id);
    setUserPostVote(votes[postId] || 0);
  };

  useEffect(() => {
    if (!loading && post) {
      fetchUserPostVote();
    }
  }, [loading, post, profile]);

  const handleAddComment = async () => {
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
    } catch (error) {
      Alert.alert('에러', '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#75BA57" /></View>;
  if (!post) return <View style={styles.center}><Text>게시글을 찾을 수 없습니다.</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시글 상세</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: post.type === '선생님' ? '#FEF2F2' : '#EFF6FF' }]}>
            <Text style={[styles.badgeText, { color: post.type === '선생님' ? '#DC2626' : '#2563EB' }]}>
              {post.type}
            </Text>
          </View>
          <View style={styles.authorBadge}>
            <User size={12} color="#64748B" />
            <Text style={styles.authorText}>{post.author}</Text>
          </View>
          <View style={styles.dateBadge}>
            <Calendar size={12} color="#64748B" />
            <Text style={styles.dateText}>{new Date(post.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        <Text style={styles.title}>{post.title}</Text>
        
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.image} resizeMode="contain" />
        )}

        <Text style={styles.bodyText}>{post.content}</Text>
        
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
        
        <View style={styles.commentSection}>
          <View style={styles.divider} />
          <View style={styles.sectionHeaderRow}>
            <MessageSquare size={18} color="#1E293B" />
            <Text style={styles.sectionTitle}>댓글 ({comments.length})</Text>
          </View>

          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentAuthor}>{comment.author_nickname}</Text>
                <Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
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
            <Text style={styles.emptyComments}>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</Text>
          )}
        </View>
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="댓글을 입력하세요..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]} 
            onPress={handleAddComment}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  authorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorText: { fontSize: 13, color: '#64748B' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: '#64748B' },
  title: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 20, lineHeight: 30 },
  image: { width: '100%', height: 300, borderRadius: 12, marginBottom: 20, backgroundColor: '#F8F9FA' },
  bodyText: { fontSize: 16, color: '#334155', lineHeight: 26 },
  commentSection: { marginTop: 40, paddingBottom: 60 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  commentItem: { marginBottom: 20, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12 },
  commentMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  commentAuthor: { fontWeight: 'bold', fontSize: 14, color: '#1E293B' },
  commentDate: { fontSize: 12, color: '#94A3B8' },
  commentContent: { fontSize: 14, color: '#475569', lineHeight: 20 },
  emptyComments: { textAlign: 'center', color: '#94A3B8', marginTop: 20, fontSize: 14 },
  postEngagement: { marginTop: 32, marginBottom: 8, flexDirection: 'row', justifyContent: 'center' },
  commentEngagement: { marginTop: 12, alignItems: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff', gap: 10 },
  input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#75BA57', justifyContent: 'center', alignItems: 'center' }
});
