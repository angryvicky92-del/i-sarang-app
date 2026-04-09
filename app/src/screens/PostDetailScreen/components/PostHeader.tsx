import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronLeft, Edit2, Trash2, Check } from 'lucide-react-native';
import { HorizontalBox } from '@/design/layout/Box';

interface PostHeaderProps {
  onBack: () => void;
  title: string;
  isEditingPost: boolean;
  isOwner: boolean;
  onStartEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  submitting: boolean;
  colors: any;
  headerHeight?: number;
}

export const PostHeader: React.FC<PostHeaderProps> = ({ 
  onBack, 
  title, 
  isEditingPost, 
  isOwner, 
  onStartEdit, 
  onDelete, 
  onSave, 
  onCancel, 
  submitting, 
  colors,
  headerHeight = 60
}) => {
  return (
    <HorizontalBox 
      style={[styles.header, { height: headerHeight, backgroundColor: colors.background, borderBottomColor: colors.border }]}
      justifyContent="space-between"
      paddingHorizontal={16}
    >
      <TouchableOpacity 
        onPress={onBack} 
        style={styles.backBtn}
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
      >
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {title}
      </Text>
      
      <HorizontalBox gap={4} style={styles.headerRight}>
        {isOwner && (
          <HorizontalBox gap={8}>
            {!isEditingPost ? (
              <>
                <TouchableOpacity 
                  onPress={onStartEdit} 
                  style={styles.headerActionBtn}
                  accessibilityLabel="게시글 수정"
                >
                  <Edit2 size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={onDelete} 
                  style={styles.headerActionBtn}
                  accessibilityLabel="게시글 삭제"
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </>
            ) : (
              <HorizontalBox gap={12}>
                <TouchableOpacity onPress={onCancel} style={styles.cancelLink}>
                  <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={onSave} 
                  disabled={submitting} 
                  style={[styles.saveBtnSmall, { backgroundColor: colors.primary }]}
                  accessibilityLabel="수정 완료"
                >
                  <Check size={18} color="#fff" />
                </TouchableOpacity>
              </HorizontalBox>
            )}
          </HorizontalBox>
        )}
      </HorizontalBox>
    </HorizontalBox>
  );
};

const styles = StyleSheet.create({
  header: { 
    borderBottomWidth: 0.5 
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { alignItems: 'center' },
  headerActionBtn: { padding: 8 },
  cancelLink: { marginRight: 8 },
  saveBtnSmall: { 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});
