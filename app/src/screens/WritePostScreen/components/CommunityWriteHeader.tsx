import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
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
  headerHeight = 56 // Slightly slimmer header
}) => {
  const isDark = true; // Forcing dark style to match screenshot
  const headerBg = '#1a1f2e'; // Exact dark navy from screenshot
  const submitGreen = '#67c23a'; // Exact green from screenshot

  return (
    <HorizontalBox 
      style={[styles.header, { height: headerHeight, backgroundColor: headerBg, borderBottomColor: '#2d3343' }]}
      justifyContent="space-between"
      paddingHorizontal={12}
    >
      <TouchableOpacity 
        onPress={onBack} 
        style={styles.backBtn}
        accessibilityLabel="닫기"
      >
        <X size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
      
      <Text style={[styles.headerTitle, { color: '#fff' }]}>
        {title === '글 수정' ? '수정' : '글쓰기'}
      </Text>
      
      <TouchableOpacity 
        onPress={onSubmit} 
        disabled={submitting || !canSubmit} 
        style={[
          styles.submitBtn, 
          { backgroundColor: canSubmit ? submitGreen : '#2d3343' }
        ]}
        accessibilityLabel={title.includes('수정') ? '수정' : '등록'}
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
  header: { borderBottomWidth: 0.2 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  submitBtn: { 
    paddingHorizontal: 14, 
    paddingVertical: 5, 
    borderRadius: 100, // Perfectly round for capsule look
    minWidth: 54,
    alignItems: 'center'
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
