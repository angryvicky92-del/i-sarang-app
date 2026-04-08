import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Dimensions, Image } from 'react-native';
import { X, Building2, MapPin, Image as ImageIcon } from 'lucide-react-native';
import { TYPE_COLORS, PLACE_TYPE_COLORS } from '../services/dataService';

const { height } = Dimensions.get('window');

export default function ClusterListBottomSheet({ isVisible, daycareList, onSelect, onClose, mode }) {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(translateY, {
         toValue: 0,
         useNativeDriver: true,
         bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
         toValue: height,
         duration: 250,
         useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handleClose = () => {
    Animated.timing(translateY, { 
      toValue: height, 
      duration: 200, 
      useNativeDriver: true 
    }).start(() => {
      onClose();
    });
  };

  const handleSelect = (dc) => {
    onSelect(dc);
    handleClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'RECOMMENDED' ? '주변 추천 장소 목록' : '주변 어린이집 목록'} ({daycareList?.length || 0})
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {daycareList && daycareList.map((dc) => (
              <TouchableOpacity
                key={dc.id}
                style={styles.item}
                onPress={() => handleSelect(dc)}
              >
                <View style={styles.itemContent}>
                  {mode === 'RECOMMENDED' ? (
                    dc.image ? (
                        <Image 
                          source={{ uri: dc.image }} 
                          style={styles.itemThumb} 
                        />
                    ) : null
                  ) : (
                    <View style={[styles.itemThumb, styles.daycareThumb, { backgroundColor: dc.color + '20' }]}>
                      <Building2 size={24} color={dc.color} />
                    </View>
                  )}
                  <View style={styles.itemTextContainer}>
                    <View style={styles.itemHeader}>
                        <View style={[styles.typeBadge, { backgroundColor: (dc.type in PLACE_TYPE_COLORS ? PLACE_TYPE_COLORS[dc.type] : dc.color) || '#3B82F6' }]}>
                            <Text style={styles.typeText}>{dc.type}</Text>
                        </View>
                        <Text style={styles.itemName} numberOfLines={1}>{dc.name || dc.title}</Text>
                    </View>
                    <View style={styles.addrRow}>
                        <MapPin size={12} color="#64748B" />
                        <Text style={styles.addrText} numberOfLines={1}>{dc.addr}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '60%', overflow: 'hidden' },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 10, marginBottom: 5 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  closeBtn: { position: 'absolute', right: 20 },
  body: { flex: 1, paddingHorizontal: 20 },
  item: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  typeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1 },
  itemContent: { flexDirection: 'row', gap: 12 },
  itemThumb: { width: 64, height: 64, borderRadius: 12 },
  daycareThumb: { justifyContent: 'center', alignItems: 'center' },
  itemTextContainer: { flex: 1 },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addrText: { fontSize: 13, color: '#64748B', flex: 1 },
});
