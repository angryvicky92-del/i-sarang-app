import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Navigation, ChevronDown, SlidersHorizontal } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useSearch } from '../contexts/SearchContext';
import { getKakaoRegionCode, TYPE_COLORS, SIDO_LIST } from '../services/dataService';
import { SIGUNGU_LIST } from '../services/sigungu';
import LocationBottomSheet from '../components/LocationBottomSheet';
import KakaoMapWebView from '../components/KakaoMapWebView';
import FilterModal from '../components/FilterModal';

export default function HomeMapScreen({ navigation }) {
  const { region, updateRegion, filteredDaycares, filters, jobCounts } = useSearch();
  const [selectedDaycare, setSelectedDaycare] = useState(null);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const initialRegion = {
    latitude: region?.center?.lat || 37.5145,
    longitude: region?.center?.lng || 127.0607,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const getJobCount = (daycareName) => {
    const normalize = (name) => name.replace(/\s/g, '').replace(/\(.*\)/g, '');
    return jobCounts[normalize(daycareName)] || 0;
  };

  const activeFilterCount = (filters.types.length > 0 ? 1 : 0) + 
                             (filters.minRating > 0 ? 1 : 0) + 
                             (filters.busOnly ? 1 : 0) + 
                             (filters.hiringOnly ? 1 : 0) + 
                             (filters.services.length > 0 ? 1 : 0);

  const handleRegionChange = async (newRegion) => {
    try {
      const { getKakaoRegionCode, getMultiRegionDaycares, SIDO_LIST } = require('../services/dataService');
      const { SIGUNGU_LIST } = require('../services/sigungu');

      if (newRegion.bounds) {
        const { sw, ne } = newRegion.bounds;
        const center = { lat: (sw.lat + ne.lat) / 2, lng: (sw.lng + ne.lng) / 2 };
        
        // Sample points: Center + 4 Corners
        const points = [
          center,
          { lat: sw.lat, lng: sw.lng },
          { lat: sw.lat, lng: ne.lng },
          { lat: ne.lat, lng: sw.lng },
          { lat: ne.lat, lng: ne.lng }
        ];

        const multiDaycares = await getMultiRegionDaycares(points);
        
        if (multiDaycares.length > 0) {
          // Find the center district name for display
          const reg = await getKakaoRegionCode(newRegion.latitude, newRegion.longitude);
          updateRegion(reg?.sido || '', reg?.sigungu || '', '', { lat: newRegion.latitude, lng: newRegion.longitude }, false, multiDaycares);
          return;
        }
      }

      // Fallback to center point only
      const kakaoAddr = await getKakaoRegionCode(newRegion.latitude, newRegion.longitude);
      if (kakaoAddr) {
        const sidoObj = SIDO_LIST.find(s => s.name === kakaoAddr.sido || kakaoAddr.sido.includes(s.name));
        if (sidoObj) {
          const districts = SIGUNGU_LIST[sidoObj.code] || [];
          const foundDistrict = districts.find(d => d.name === kakaoAddr.sigungu);
          if (foundDistrict && foundDistrict.code !== region.arcode) {
             updateRegion(sidoObj.name, foundDistrict.name, foundDistrict.code, { lat: newRegion.latitude, lng: newRegion.longitude });
          }
        }
      }
    } catch (error) {
      console.error('Region change error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setIsLocationOpen(true)} activeOpacity={0.7}>
        <Text style={styles.headerTitle}>{region?.sido} {region?.sigungu}</Text>
        <ChevronDown size={20} color="#1E293B" style={{ marginLeft: 6 }} />
      </TouchableOpacity>

      <KakaoMapWebView
        center={region?.center || initialRegion}
        markers={filteredDaycares}
        onRegionChange={handleRegionChange}
        onMarkerPress={(id) => {
          const dc = filteredDaycares.find(d => d.id === id);
          if (dc) setSelectedDaycare(dc);
        }}
        onMapPress={() => setSelectedDaycare(null)}
      />

      {/* Layer Popup (Summary Card) */}
      {selectedDaycare && (
        <TouchableOpacity 
          style={styles.popupCard} 
          activeOpacity={1}
          onPress={() => {
            navigation.navigate('Detail', { daycare: selectedDaycare });
            setSelectedDaycare(null);
          }}
        >
          <View style={styles.popupHeader}>
            <View style={{ flex: 1 }}>
              <View style={[styles.popupTypeBadge, { backgroundColor: selectedDaycare.color || '#75BA57' }]}>
                <Text style={styles.popupTypeText}>{selectedDaycare.type}</Text>
              </View>
              <Text style={styles.popupTitle}>{selectedDaycare.name}</Text>
            </View>
          </View>
          
          <Text style={styles.popupAddr}>{selectedDaycare.addr}</Text>

          {/* Ratings moved below address */}
          <View style={styles.popupRatingsGroup}>
            <View style={styles.ratingInfo}>
              <Text style={styles.ratingLabel}>학부모 평점</Text>
              <Text style={styles.ratingScore}>{selectedDaycare.parentRating || '4.5'}</Text>
              <Text style={[styles.star, { color: '#75BA57' }]}>★</Text>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingInfo}>
              <Text style={styles.ratingLabel}>선생님 평점</Text>
              <Text style={styles.ratingScore}>{selectedDaycare.teacherRating || '4.2'}</Text>
              <Text style={[styles.star, { color: '#4A6CF7' }]}>★</Text>
            </View>
          </View>
          
          <View style={styles.popupStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>아동수 (현/정)</Text>
              <Text style={styles.statValue}>{selectedDaycare.current}/{selectedDaycare.capacity}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>대기 인원</Text>
              <Text style={[styles.statValue, { color: '#DC2626' }]}>{selectedDaycare.waitingCount || '12'}명</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>구인 중</Text>
              <Text style={[styles.statValue, { color: getJobCount(selectedDaycare.name) > 0 ? '#3B82F6' : '#94A3B8' }]}>
                {getJobCount(selectedDaycare.name)}건
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.popupDetailBtn}
            onPress={() => {
              navigation.navigate('Detail', { daycare: selectedDaycare });
              setSelectedDaycare(null);
            }}
          >
             <Text style={styles.popupDetailBtnText}>상세 정보 보기</Text>
             <ChevronDown size={18} color="#fff" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      <View style={styles.legend}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{type}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.myLocateBtn} onPress={() => updateRegion(null, null, null, { ...region.center }, true)}>
        <Navigation size={22} color="#1E293B" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterOpen(true)}>
        <SlidersHorizontal size={22} color={activeFilterCount > 0 ? '#fff' : '#1E293B'} />
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <LocationBottomSheet 
        isVisible={isLocationOpen} 
        onClose={() => setIsLocationOpen(false)} 
      />

      <FilterModal 
        visible={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  popupCard: {
    position: 'absolute',
    bottom: 120, // Move up a bit more if needed
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20, // Increase elevation to stay above legend
    borderWidth: 1,
    borderColor: '#F1F5F9',
    zIndex: 1000, // High zIndex!
  },
  popupHeader: { marginBottom: 10 },
  popupTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  popupTypeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  popupTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  popupAddr: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  
  popupRatingsGroup: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', // Center align!
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12
  },
  ratingInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingLabel: { fontSize: 12, color: '#64748B', marginRight: 4 },
  ratingScore: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  star: { fontSize: 12, color: '#FACC15' },
  ratingDivider: { width: 1, height: 12, backgroundColor: '#E2E8F0', marginHorizontal: 12 },

  popupStats: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 15, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%', backgroundColor: '#CBD5E1' },
  statLabel: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  
  popupDetailBtn: { 
    backgroundColor: '#75BA57', 
    paddingVertical: 14, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 8,
    shadowColor: '#75BA57',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  popupDetailBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  legend: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  markerBody: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0,height:2}
  },
  markerText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  myLocateBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  filterBtn: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  filterBtnActive: { backgroundColor: '#1E293B' },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
