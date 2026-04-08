import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { X, Plus } from 'lucide-react-native';
import { SIDO_LIST, SIGUNGU_LIST } from '../services/dataService';

/**
 * Modal to allow users to select multiple Sido/Sigungu regions for job notifications.
 */
export default function RegionSelectionModal({ visible, onClose, selectedRegions, onUpdate }) {
  const [selectedSido, setSelectedSido] = useState('서울특별시');

  const handleAddRegion = (sigunguName) => {
    const regionStr = `${selectedSido} ${sigunguName}`;
    if (selectedRegions.includes(regionStr)) {
      Alert.alert('알림', '이미 선택된 지역입니다.');
      return;
    }
    if (selectedRegions.length >= 5) {
      Alert.alert('알림', '관심 지역은 최대 5개까지 설정 가능합니다.');
      return;
    }
    onUpdate([...selectedRegions, regionStr]);
  };

  const handleRemoveRegion = (regionStr) => {
    onUpdate(selectedRegions.filter(r => r !== regionStr));
  };

  const selectedSidoObj = SIDO_LIST.find(s => s.name === selectedSido) || SIDO_LIST[0];
  const districts = SIGUNGU_LIST[selectedSidoObj.code] || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <X size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>관심 지역 설정</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.selectedContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>선택된 지역 ({selectedRegions.length}/5)</Text>
          </View>
          <View style={styles.chipsRow}>
            {selectedRegions.map((region, idx) => (
              <View key={idx} style={styles.chip}>
                <Text style={styles.chipText}>{region}</Text>
                <TouchableOpacity onPress={() => handleRemoveRegion(region)} style={styles.chipDelete}>
                  <X size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedRegions.length === 0 && (
              <Text style={styles.emptyText}>알림을 받을 지역을 리스트에서 추가해주세요.</Text>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.sidoCol}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SIDO_LIST.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.sidoItem, selectedSido === item.name && styles.sidoItemActive]}
                  onPress={() => setSelectedSido(item.name)}
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
              {districts.map((d) => {
                const isSelected = selectedRegions.includes(`${selectedSido} ${d.name}`);
                return (
                  <TouchableOpacity
                    key={d.code}
                    style={[styles.sigunguItem, isSelected && styles.sigunguItemActive]}
                    onPress={() => handleAddRegion(d.name)}
                    disabled={isSelected}
                  >
                    <Text style={[styles.sigunguText, isSelected && styles.sigunguTextActive]}>{d.name}</Text>
                    {!isSelected && <Plus size={18} color="#CBD5E1" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  backBtn: { padding: 4 },
  
  selectedContainer: { padding: 20, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    paddingLeft: 12, 
    paddingRight: 8, 
    paddingVertical: 6, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1
  },
  chipText: { fontSize: 13, color: '#334155', fontWeight: '700' },
  chipDelete: { marginLeft: 4, padding: 4 },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  
  body: { flex: 1, flexDirection: 'row' },
  sidoCol: { flex: 1, backgroundColor: '#F8FAFC', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  sidoItem: { paddingVertical: 16, paddingHorizontal: 20 },
  sidoItemActive: { backgroundColor: '#fff' },
  sidoText: { fontSize: 14, color: '#64748B', fontWeight: '700' },
  sidoTextActive: { color: '#75BA57' },
  
  sigunguCol: { flex: 1.5, backgroundColor: '#fff' },
  sigunguItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC' 
  },
  sigunguItemActive: { backgroundColor: '#F0FDF4' },
  sigunguText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  sigunguTextActive: { color: '#16A34A', fontWeight: '700' },
});
