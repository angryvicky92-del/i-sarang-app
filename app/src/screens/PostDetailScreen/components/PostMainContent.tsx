import React from 'react';
import { Text, Image, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye } from 'lucide-react-native';
import EngagementButtons from '@/components/EngagementButtons';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface PostMainContentProps {
  post: any;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (text: string) => void;
  editContent: string;
  onEditContentChange: (text: string) => void;
  imageAspectRatios: Record<string, number>;
  onNicknameClick: (id: string, nickname: string, type: any) => void;
  userPostVote: number;
  onVoteUpdate: (updated: any) => void;
  userId?: string;
  colors: any;
}

export const PostMainContent: React.FC<PostMainContentProps> = ({ 
  post, 
  isEditing, 
  editTitle, 
  onEditTitleChange, 
  editContent, 
  onEditContentChange, 
  imageAspectRatios, 
  onNicknameClick, 
  userPostVote, 
  onVoteUpdate, 
  userId, 
  colors 
}) => {
  return (
    <VerticalBox paddingHorizontal={20} style={{ paddingTop: 20 }}>
      {isEditing ? (
        <VerticalBox style={styles.editForm}>
          <TextInput
            style={[styles.editTitleInput, { color: colors.text, borderBottomColor: colors.border }]}
            value={editTitle}
            onChangeText={onEditTitleChange}
            placeholder="제목"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.editContentInput, { color: colors.textSecondary }]}
            value={editContent}
            onChangeText={onEditContentChange}
            placeholder="내용을 입력하세요"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </VerticalBox>
      ) : (
        <>
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
            {post.content}
          </Text>
        </>
      )}
      
      {!isEditing && (
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
      )}
    </VerticalBox>
  );
};

const styles = StyleSheet.create({
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
  postImage: { width: '100%', borderRadius: 16, marginBottom: 24 },
  postBody: { fontSize: 17, lineHeight: 28, letterSpacing: -0.2, marginBottom: 40 },
  interactionArea: { borderTopWidth: 0.5, marginBottom: 40 },
  editForm: { marginTop: 10 },
  editTitleInput: { fontSize: 22, fontWeight: '800', borderBottomWidth: 1.5, paddingVertical: 12, marginBottom: 20 },
  editContentInput: { fontSize: 17, lineHeight: 28, minHeight: 400, textAlignVertical: 'top' },
});
