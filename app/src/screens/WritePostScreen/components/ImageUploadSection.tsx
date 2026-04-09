import React from 'react';
import { TouchableOpacity, Image, Text, StyleSheet } from 'react-native';
import { Camera, X } from 'lucide-react-native';
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
    <VerticalBox style={styles.imageSection} margin={40}>
      <HorizontalBox style={styles.imageGrid} gap={12} flexWrap="wrap">
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
        {images.length < 10 && (
          <TouchableOpacity 
            style={[
              styles.addBtn, 
              { backgroundColor: colors.cardSecondary, borderColor: colors.border }
            ]} 
            onPress={onPick}
            accessibilityLabel="사진 추가"
          >
            <Camera size={24} color={colors.textMuted} />
            <Text style={[styles.addBtnText, { color: colors.textMuted }]}>
              {images.length}/10
            </Text>
          </TouchableOpacity>
        )}
      </HorizontalBox>
    </VerticalBox>
  );
};

const styles = StyleSheet.create({
  imageSection: { marginTop: 40 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  imageWrapper: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  imageItem: { width: '100%', height: '100%' },
  removeImageBtn: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addBtn: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    borderStyle: 'dashed', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5 
  },
  addBtnText: { fontSize: 10, fontWeight: '600', marginTop: 2 }
});
