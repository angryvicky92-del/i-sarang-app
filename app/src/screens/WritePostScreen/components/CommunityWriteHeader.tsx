import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { HorizontalBox } from '@/design/layout/Box';

interface CommunityWriteHeaderProps {
  title: string;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  colors: any;
  headerHeight?: number;
}

export const CommunityWriteHeader: React.FC<CommunityWriteHeaderProps> = ({ 
  title, 
  onBack, 
  onSubmit, 
  submitting, 
  canSubmit,
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
      >
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        {title}
      </Text>
      
      <TouchableOpacity 
        onPress={onSubmit} 
        disabled={submitting || !canSubmit} 
        style={[
          styles.submitBtn, 
          { backgroundColor: canSubmit ? colors.primary : colors.border }
        ]}
        accessibilityLabel="등록"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>
            {title.includes('수정') ? '수정' : '등록'}
          </Text>
        )}
      </TouchableOpacity>
    </HorizontalBox>
  );
};

const styles = StyleSheet.create({
  header: { borderBottomWidth: 0.5 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.5 },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
