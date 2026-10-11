import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye } from 'lucide-react-native';
import EngagementButtons from '@/components/EngagementButtons';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface PostMainContentProps {
  post: any;
  imageAspectRatios: Record<string, number>;
  onNicknameClick: (id: string, nickname: string, type: any) => void;
  userPostVote: number;
  onVoteUpdate: (updated: any) => void;
  userId?: string;
  colors: any;
}

const toPlainText = (html: unknown) => String(html || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/p>/gi, '\n\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .trim();

export const PostMainContent: React.FC<PostMainContentProps> = ({ 
  post, 
  imageAspectRatios, 
  onNicknameClick, 
  userPostVote, 
  onVoteUpdate, 
  userId, 
  colors 
}) => {
  return (
    <VerticalBox paddingHorizontal={20} style={{ paddingTop: 20 }}>
      <VerticalBox>
        <HorizontalBox style={styles.metaInfo} gap={8} flexWrap="wrap">
          {post.profiles?.user_type === '관리자' ? (
            <VerticalBox style={[styles.adminChip, { backgroundColor: colors.primary }]}>
              <Text style={styles.chipText}>관리자</Text>
            </VerticalBox>
          ) : post.type && (
            <VerticalBox style={[styles.typeChip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.typeChipText, { color: colors.primary }]}>{post.type}</Text>
            </VerticalBox>
          )}
          <TouchableOpacity 
            onPress={() => onNicknameClick(post.user_id, post.author, post.type)} 
            style={styles.authorInfo}
          >
            <Text style={[styles.authorName, { color: colors.text }]}>{post.author}</Text>
          </TouchableOpacity>
          <Text style={[styles.metaTime, { color: colors.textMuted }]}>
            • {new Date(post.created_at).toLocaleDateString()}
          </Text>
          <HorizontalBox style={styles.viewCount} gap={2}>
            <Eye size={12} color={colors.textMuted} />
            <Text style={{ fontSize: 12, color: colors.textMuted }}>
              {post.views || 0}
            </Text>
          </HorizontalBox>
        </HorizontalBox>

        <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
        
        {(post.image_urls || (post.image_url ? [post.image_url] : [])).map((url: string, idx: number) => (
          <Image 
            key={idx}
            source={{ uri: url }} 
            style={[
              styles.postImage, 
              { 
                aspectRatio: imageAspectRatios[url] || 1.5, 
                backgroundColor: colors.cardSecondary 
              }
            ]} 
            resizeMode="cover" 
          />
        ))}

        <Text style={[styles.postBody, { color: colors.textSecondary }]}>
          {toPlainText(post.content)}
        </Text>
      </VerticalBox>
      
      <HorizontalBox 
        style={[styles.interactionArea, { borderTopColor: colors.border }]}
        paddingVertical={20}
      >
        <EngagementButtons 
          targetType="post" 
          targetId={post.id} 
          item={post} 
          userVote={userPostVote} 
          userId={userId}
          onUpdate={onVoteUpdate}
        />
      </HorizontalBox>
    </VerticalBox>
  );
};

const styles = StyleSheet.create({
  postBody: { fontSize: 16, lineHeight: 26, marginBottom: 40 },
  metaInfo: { marginBottom: 20 },
  adminChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  chipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  typeChipText: { fontSize: 11, fontWeight: '800' },
  authorInfo: { marginRight: 6 },
  authorName: { fontSize: 14, fontWeight: '700' },
  metaTime: { fontSize: 12 },
  viewCount: { alignItems: 'center' },
  postTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24, lineHeight: 32, letterSpacing: -0.8 },
  postImage: { width: '100%', borderRadius: 16, marginBottom: 12 },
  interactionArea: { borderTopWidth: 0.5, marginBottom: 40 }
});
