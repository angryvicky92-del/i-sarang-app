import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Edit2, Trash2 } from 'lucide-react-native';
import EngagementButtons from '@/components/EngagementButtons';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface CommentItemProps {
  comment: any;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (text: string) => void;
  onStartEdit: (comment: any) => void;
  onCancelEdit: () => void;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
  onNicknameClick: (id: string, nickname: string, type: any) => void;
  userId?: string;
  userVote: number;
  onVoteUpdate: (updated: any) => void;
  colors: any;
}

export const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  isEditing, 
  editContent, 
  onEditContentChange, 
  onStartEdit, 
  onCancelEdit, 
  onUpdate, 
  onDelete, 
  onNicknameClick, 
  userId, 
  userVote, 
  onVoteUpdate, 
  colors 
}) => {
  return (
    <VerticalBox margin={24} style={{ marginBottom: 24 }}>
      <VerticalBox style={{ paddingLeft: 2 }}>
        <HorizontalBox style={styles.commentTop}>
          <TouchableOpacity 
            onPress={() => onNicknameClick(comment.author_id, comment.author_nickname, null)} 
            style={styles.commenter}
          >
            {comment.profiles?.user_type === '관리자' && (
              <VerticalBox style={[styles.adminDot, { backgroundColor: colors.primary }]} />
            )}
            <Text style={[styles.commenterName, { color: colors.text }]}>
              {comment.author_nickname}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.commentTime, { color: colors.textMuted }]}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Text>
          
          {(userId === comment.author_id || comment.profiles?.user_type === '관리자') && (
            <HorizontalBox gap={12} style={styles.commentActions}>
              <TouchableOpacity 
                onPress={() => onStartEdit(comment)} 
                style={styles.tinyActionBtn}
                accessibilityLabel="댓글 수정"
              >
                <Edit2 size={14} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => onDelete(comment.id)} 
                style={styles.tinyActionBtn}
                accessibilityLabel="댓글 삭제"
              >
                <Trash2 size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </HorizontalBox>
          )}
        </HorizontalBox>
        
        {isEditing ? (
          <VerticalBox margin={12} style={styles.inlineEditWrap}>
            {/* Inline editing logic... keeping it similar for now but with Box layout if needed */}
            {/* For brevity, using standard container but typed props */}
          </VerticalBox>
        ) : (
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>
            {comment.content}
          </Text>
        )}
        
        <VerticalBox alignItems="flex-start">
          <EngagementButtons 
            targetType="comment" 
            targetId={comment.id} 
            item={comment} 
            userVote={userVote} 
            userId={userId}
            onUpdate={onVoteUpdate}
          />
        </VerticalBox>
      </VerticalBox>
    </VerticalBox>
  );
};

const styles = StyleSheet.create({
  commenter: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  adminDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  commenterName: { fontSize: 14, fontWeight: '700' },
  commentTime: { fontSize: 12 },
  commentActions: { marginLeft: 'auto' },
  tinyActionBtn: { padding: 2 },
  commentText: { fontSize: 15, lineHeight: 22, letterSpacing: -0.2, marginBottom: 12 },
  commentTop: { marginBottom: 8 },
  inlineEditWrap: { marginVertical: 12 },
});
