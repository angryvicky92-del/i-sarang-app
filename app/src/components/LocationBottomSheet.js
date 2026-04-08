import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated, Dimensions } from 'react-native';
import { useSearch } from '../contexts/SearchContext';
import { SIDO_LIST, SIGUNGU_LIST, getKakaoAddressCenter } from '../services/dataService';
import { X } from 'lucide-react-native';

const { height } = Dimensions.get('window');

export default function LocationBottomSheet({ isVisible, onClose }) {
  const { region, updateRegion } = useSearch();
  const [selectedSido, setSelectedSido] = useState(region.sido || '서울특별시');
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

  const handleSidoSelect = (sidoName) => setSelectedSido(sidoName);

  const handleSigunguSelect = async (sigunguName, arcode) => {
    // Pass true for the animateTick parameter so the map flies to the new district
    const selectedSidoObj = SIDO_LIST.find(s => s.name === selectedSido) || SIDO_LIST[0];
    const addr = `${selectedSidoObj.name} ${sigunguName}`;
    const coords = await getKakaoAddressCenter(addr);
    updateRegion(selectedSidoObj.name, sigunguName, arcode, coords, true);
    handleClose();
  };

  const handleClose = () => {
    Animated.timing(translateY, { toValue: height, duration: 250, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  const selectedSidoObj = SIDO_LIST.find(s => s.name === selectedSido) || SIDO_LIST[0];
  const sidoCode = selectedSidoObj.code;
  const districts = SIGUNGU_LIST[sidoCode] || [];

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>지역 선택</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={24} color="#1E293B" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.sidoCol}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {SIDO_LIST.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.sidoItem, selectedSido === item.name && styles.sidoItemActive]}
                    onPress={() => handleSidoSelect(item.name)}
                  >
                    <Text style={[styles.sidoText, selectedSido === item.name && styles.sidoTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.sigunguCol}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {districts.map((d) => (
                  <TouchableOpacity
                    key={d.code}
                    style={[styles.sigunguItem, region.arcode === d.code && styles.sigunguItemActive]}
                    onPress={() => handleSigunguSelect(d.name, d.code)}
                  >
                    <Text style={[styles.sigunguText, region.arcode === d.code && styles.sigunguTextActive]}>
                      {d.name || '전체'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheetContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%', overflow: 'hidden' },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginTop: 10, marginBottom: 5 },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  closeBtn: { position: 'absolute', right: 20 },
  body: { flex: 1, flexDirection: 'row' },
  sidoCol: { flex: 1, backgroundColor: '#F8F9FA', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  sidoItem: { paddingVertical: 16, paddingHorizontal: 20 },
  sidoItemActive: { backgroundColor: '#fff' },
  sidoText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  sidoTextActive: { color: '#75BA57', fontWeight: 'bold' },
  sigunguCol: { flex: 1.5, backgroundColor: '#fff' },
  sigunguItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  sigunguItemActive: { backgroundColor: '#F0FDF4' },
  sigunguText: { fontSize: 15, color: '#334155' },
  sigunguTextActive: { color: '#16A34A', fontWeight: 'bold' },
});
