import React from 'react';
import { TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface StickyCommentInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  colors: any;
  insets: any;
}

export const StickyCommentInput: React.FC<StickyCommentInputProps> = ({ 
  value, 
  onChange, 
  onSubmit, 
  submitting, 
  colors, 
  insets 
}) => {
  return (
    <HorizontalBox 
      style={[
        styles.stickyBar, 
        { 
          borderTopColor: colors.border, 
          backgroundColor: colors.card, 
          paddingBottom: insets.bottom + 10 
        }
      ]}
      paddingHorizontal={16}
      style={{ paddingTop: 12 }}
    >
      <TextInput
        style={[styles.stickyInput, { backgroundColor: colors.cardSecondary, color: colors.text }]}
        placeholder="댓글을 남겨주세요..."
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
        multiline
        maxHeight={100}
        accessibilityLabel="댓글 입력창"
      />
      <TouchableOpacity 
        onPress={onSubmit}
        disabled={submitting || !value.trim()}
        style={[
          styles.sendCircle, 
          { backgroundColor: value.trim() ? colors.primary : colors.border }
        ]}
        accessibilityLabel="댓글 전송"
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Send size={18} color="#fff" />
        )}
      </TouchableOpacity>
    </HorizontalBox>
  );
};

const styles = StyleSheet.create({
  stickyBar: {
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
