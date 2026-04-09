import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { Eye, MessageCircle, Heart } from 'lucide-react-native';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface PostCardProps {
  post: any;
  onPress: () => void;
  colors: any;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onPress, colors }) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.postCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
    >
      <VerticalBox gap={12}>
        <HorizontalBox justifyContent="space-between">
          <HorizontalBox gap={8}>
            {post.is_notice && (
              <VerticalBox style={[styles.noticeChip, { backgroundColor: colors.primary }]}>
                <Text style={styles.noticeText}>공지</Text>
              </VerticalBox>
            )}
            <Text style={[styles.author, { color: colors.textMuted }]}>{post.author}</Text>
          </HorizontalBox>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </HorizontalBox>

        <HorizontalBox gap={16} alignItems="flex-start">
          <VerticalBox flex={1} gap={4}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{post.title}</Text>
            <Text style={[styles.contentPreview, { color: colors.textSecondary }]} numberOfLines={2}>
              {post.content}
            </Text>
          </VerticalBox>
          {post.image_url && (
            <Image 
              source={{ uri: post.image_url }} 
              style={[styles.thumbnail, { backgroundColor: colors.border }]} 
            />
          )}
        </HorizontalBox>

        <HorizontalBox gap={16}>
          <HorizontalBox gap={4}>
            <Eye size={14} color={colors.textMuted} />
            <Text style={[styles.counts, { color: colors.textMuted }]}>{post.views || 0}</Text>
          </HorizontalBox>
          {/* Add likes/comments count if available */}
        </HorizontalBox>
      </VerticalBox>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: { padding: 20, borderBottomWidth: 1 },
  noticeChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  noticeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  author: { fontSize: 13, fontWeight: '600' },
  date: { fontSize: 12 },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  contentPreview: { fontSize: 14, lineHeight: 20 },
  thumbnail: { width: 60, height: 60, borderRadius: 8 },
  counts: { fontSize: 12, fontWeight: '600' }
});
