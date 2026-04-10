import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { Camera, X, Image as ImageIcon } from 'lucide-react-native';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

interface ImageUploadSectionProps {
  images: any[];
  onPick: () => void;
  onRemove: (index: number) => void;
  colors: any;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({ 
  images, 
  onPick, 
  onRemove, 
  colors 
}) => {
  return (
    <VerticalBox 
      style={[
        styles.imageSection, 
        { backgroundColor: colors.cardSecondary, borderColor: colors.border }
      ]}
    >
      <HorizontalBox style={styles.sectionHeader} gap={8} alignItems="center">
        <ImageIcon size={18} color={colors.textSecondary} />
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          사진·동영상 {images.length}/10
        </Text>
      </HorizontalBox>

      <HorizontalBox style={styles.imageGrid} gap={12} flexWrap="wrap">
        <TouchableOpacity 
          style={[
            styles.addBtn, 
            { backgroundColor: colors.background, borderColor: colors.border }
          ]} 
          onPress={onPick}
          accessibilityLabel="사진 추가"
        >
          <X size={24} color={colors.textMuted} style={{ transform: [{ rotate: '45deg' }] }} />
        </TouchableOpacity>

        {images.map((img, index) => (
          <VerticalBox key={index} style={styles.imageWrapper}>
            <Image 
              source={{ uri: typeof img === 'string' ? img : img.uri }} 
              style={styles.imageItem} 
            />
            <TouchableOpacity 
              onPress={() => onRemove(index)} 
              style={styles.removeImageBtn}
              accessibilityLabel="이미지 삭제"
            >
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </VerticalBox>
        ))}
      </HorizontalBox>
    </VerticalBox>
  );
};

const styles = StyleSheet.create({
  imageSection: { 
    marginHorizontal: 16, 
    marginVertical: 24, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 0.5,
  },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  imageWrapper: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden' },
  imageItem: { width: '100%', height: '100%' },
  removeImageBtn: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addBtn: { 
    width: 70, 
    height: 70, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
