import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView, Switch } from 'react-native';
import { X, RotateCcw, Star, Check, Sparkles, Filter, Bus, Briefcase } from 'lucide-react-native';
import { useSearch } from '../contexts/SearchContext';
import { TYPE_GOK, TYPE_GAJUNG, TYPE_MIN, TYPE_JIK, TYPE_ETC } from '../services/dataService';

const ALL_TYPES = [TYPE_GOK, TYPE_GAJUNG, TYPE_MIN, TYPE_JIK, TYPE_ETC];
const ALL_SERVICES = ['영아전담', '장애아전담', '방과후', '시간연장', '휴일보육', '24시간'];

export default function FilterModal({ visible, onClose }) {
  const { filters, setFilters, resetFilters } = useSearch();
  const [localFilters, setLocalFilters] = useState(filters);

  const toggleType = (type) => {
    setLocalFilters(prev => ({
      ...prev,
      types: prev.types.includes(type) 
        ? prev.types.filter(t => t !== type) 
        : [...prev.types, type]
    }));
  };

  const toggleService = (svc) => {
    setLocalFilters(prev => ({
      ...prev,
      services: prev.services.includes(svc) 
        ? prev.services.filter(s => s !== svc) 
        : [...prev.services, svc]
    }));
  };

  const apply = () => {
    setFilters(localFilters);
    onClose();
  };

  const reset = () => {
    const defaultFilters = {
      minRating: 0,
      minTeacherRating: 0,
      types: [],
      busOnly: false,
      hiringOnly: false,
      services: []
    };
    setLocalFilters(defaultFilters);
    resetFilters();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.title}>상세 필터</Text>
          <TouchableOpacity onPress={reset} style={styles.resetBtn}>
            <RotateCcw size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* 1. Parent Rating */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.sectionTitle}>학부모 평점</Text>
            </View>
            <View style={styles.optionsRow}>
              {[0, 3.5, 4.0, 4.5].map(val => (
                <TouchableOpacity 
                  key={val} 
                  style={[styles.optionBtn, localFilters.minRating === val && styles.optionBtnActive]}
                  onPress={() => setLocalFilters(prev => ({...prev, minRating: val}))}
                >
                  <Text style={[styles.optionText, localFilters.minRating === val && styles.optionTextActive]}>
                    {val === 0 ? '전체' : `${val}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. Teacher Rating (New) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles size={18} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>선생님 평점</Text>
            </View>
            <View style={styles.optionsRow}>
              {[0, 3.5, 4.0, 4.5].map(val => (
                <TouchableOpacity 
                  key={val} 
                  style={[styles.optionBtn, localFilters.minTeacherRating === val && styles.optionBtnActiveTeacher]}
                  onPress={() => setLocalFilters(prev => ({...prev, minTeacherRating: val}))}
                >
                  <Text style={[styles.optionText, localFilters.minTeacherRating === val && styles.optionTextActive]}>
                    {val === 0 ? '전체' : `${val}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 3. Hiring & Bus */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Filter size={18} color="#64748B" />
              <Text style={styles.sectionTitle}>부가 옵션</Text>
            </View>
            <View style={styles.cardSection}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Briefcase size={16} color="#475569" style={{ marginBottom: 4 }} />
                  <Text style={styles.toggleLabel}>구인 중인 어린이집</Text>
                  <Text style={styles.toggleDesc}>현재 채용 공고가 올라온 곳</Text>
                </View>
                <Switch 
                  value={localFilters.hiringOnly} 
                  onValueChange={(val) => setLocalFilters(prev => ({...prev, hiringOnly: val}))}
                  trackColor={{ true: '#75BA57' }}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Bus size={16} color="#475569" style={{ marginBottom: 4 }} />
                  <Text style={styles.toggleLabel}>통학차량 운영</Text>
                  <Text style={styles.toggleDesc}>셔틀버스를 운행하는 곳</Text>
                </View>
                <Switch 
                  value={localFilters.busOnly} 
                  onValueChange={(val) => setLocalFilters(prev => ({...prev, busOnly: val}))}
                  trackColor={{ true: '#75BA57' }}
                />
              </View>
            </View>
          </View>

          {/* 4. Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>어린이집 유형</Text>
            <View style={styles.badgeContainer}>
              {ALL_TYPES.map(type => {
                const isSelected = localFilters.types.includes(type);
                return (
                  <TouchableOpacity 
                    key={type} 
                    onPress={() => toggleType(type)}
                    style={[styles.badge, isSelected && styles.badgeActive]}
                  >
                    <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 5. Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>제공 서비스 (다중선택)</Text>
            <View style={styles.badgeContainer}>
              {ALL_SERVICES.map(svc => {
                const isSelected = localFilters.services.includes(svc);
                return (
                  <TouchableOpacity 
                    key={svc} 
                    onPress={() => toggleService(svc)}
                    style={[styles.serviceTag, isSelected && styles.serviceTagActive]}
                  >
                    {isSelected && <Check size={14} color="#75BA57" style={{ marginRight: 4 }} />}
                    <Text style={[styles.serviceTagText, isSelected && styles.serviceTagTextActive]}>{svc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyBtn} onPress={apply}>
            <Text style={styles.applyBtnText}>필터 적용하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  closeBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  resetBtn: { padding: 8 },
  
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  
  cardSection: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },

  optionsRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, height: 48, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  optionBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  optionBtnActiveTeacher: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  optionText: { fontSize: 14, color: '#64748B', fontWeight: '800' },
  optionTextActive: { color: '#fff' },
  
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  toggleDesc: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  badgeActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  badgeText: { fontSize: 14, color: '#64748B', fontWeight: '800' },
  badgeTextActive: { color: '#fff' },
  
  serviceTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  serviceTagActive: { borderColor: '#75BA57', backgroundColor: '#F0F9EB' },
  serviceTagText: { fontSize: 14, color: '#64748B', fontWeight: '800' },
  serviceTagTextActive: { color: '#75BA57' },
  
  footer: { padding: 24, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  applyBtn: { height: 60, backgroundColor: '#1E293B', borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  applyBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' }
});;
