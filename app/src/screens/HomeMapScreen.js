import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, InteractionManager, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, Map as MapIcon, Navigation, Search, ChevronDown, Info, SlidersHorizontal, Heart } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useSearch } from '../contexts/SearchContext';
import { useTheme } from '../contexts/ThemeContext';
import { getKakaoRegionCode, TYPE_COLORS, PLACE_TYPE_COLORS, SIDO_LIST } from '../services/dataService';
import { SIGUNGU_LIST } from '../services/sigungu';
import LocationBottomSheet from '../components/LocationBottomSheet';
import KakaoMapWebView from '../components/KakaoMapWebView';
import FilterModal from '../components/FilterModal';
import ClusterListBottomSheet from '../components/ClusterListBottomSheet';
import { isJobMatchingDaycare, getMultiRegionDaycares } from '../services/dataService';
import { getReviewAverages } from '../services/reviewService';
import { getRecommendedPlaces } from '../services/tourismService';
import RatingStars from '../components/RatingStars';
import { Linking } from 'react-native';



export default function HomeMapScreen({ navigation, route }) {
  const { 
    region, updateRegion, filteredMapDaycares, 
    mapPlaces, setMapPlaces, filters, allJobs, 
    daycareRatings, updateDaycareRating, isFavorited, toggleFavorite 
  } = useSearch();
  const { colors, isDarkMode } = useTheme();
  const [selectedDaycare, setSelectedDaycare] = useState(null);
  const [mapMode, setMapMode] = useState('DAYCARE');
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [clusterDaycares, setClusterDaycares] = useState(null);
  const lastFetchCoords = useRef({ lat: 0, lng: 0 });
  const lastProgrammaticMove = useRef(0);
  const isFirstMount = useRef(true);
  const [isFetching, setIsFetching] = useState(false);
  const webviewRef = useRef(null);

  const THRESHOLD = 0.002; // Roughly 200m threshold to prevent constant refetching on minor moves

  const fetchItemRatings = useCallback(async (item) => {
    if (!item) return;
    const cid = String(item.stcode || item.id || '').trim();
    
    if (daycareRatings[cid]) return;

    try {
      const averages = await getReviewAverages(cid);
      if (averages) {
        updateDaycareRating(cid, {
          parentAvg: averages.parentAvg,
          teacherAvg: averages.teacherAvg
        });
      }
    } catch (e) {
      console.warn('fetchItemRatings error:', e);
    }
  }, [daycareRatings, updateDaycareRating]);

  // Derived state for the popup - ALWAYS use the global cache with variant fallback
  const currentRatings = useMemo(() => {
    if (!selectedDaycare) return { parentAvg: '-', teacherAvg: '-' };
    const cid = String(selectedDaycare.stcode || selectedDaycare.id || '').trim();
    const altCid = cid.startsWith('0') ? cid.substring(1) : (cid.length > 0 ? '0' + cid : cid);
    
    // Check main ID, then variant ID, then fallback
    return daycareRatings[cid] || daycareRatings[altCid] || { parentAvg: '-', teacherAvg: '-' };
  }, [selectedDaycare, daycareRatings]);

  // Clear selection ONLY on unmount
  useEffect(() => {
    return () => {
      setSelectedDaycare(null);
    };
  }, []);

  // Clear selection when mode changes
  useEffect(() => {
    setSelectedDaycare(null);
  }, [mapMode]);

  // Fetch Recommended Places
  useEffect(() => {
    if (mapMode === 'RECOMMENDED' && region?.center) {
      // Calculate radius to cover viewport corners
      const radius = 5000; // Keep 5km for performance, but pass multiple sigungus for ODCLOUD
      getRecommendedPlaces(region.center.lat, region.center.lng, radius, region?.sido, region?.visibleRegions || [region?.sigungu]).then(data => {
        if (data && data.length > 0) {
          setMapPlaces(data);
        }
      });
    }
  }, [mapMode, region, setMapPlaces]);

  const selectedRecommendedIdFromNav = route?.params?.selectedRecommendedPlaceId;
  const navLat = route?.params?.lat;
  const navLng = route?.params?.lng;
  const pendingPlaceSelection = useRef(null);

  useEffect(() => {
    if (selectedRecommendedIdFromNav && navLat && navLng) {
      setMapMode('RECOMMENDED');
      pendingPlaceSelection.current = selectedRecommendedIdFromNav;
      
      updateRegion(
        region?.sido,
        region?.sigungu,
        region?.arcode,
        { lat: navLat, lng: navLng },
        true
      );
      navigation.setParams({ selectedRecommendedPlaceId: undefined, lat: undefined, lng: undefined });
    }
  }, [selectedRecommendedIdFromNav, navLat, navLng, region, updateRegion, navigation]);

  useEffect(() => {
    if (pendingPlaceSelection.current && mapPlaces.length > 0) {
      const rp = mapPlaces.find(p => p.id === pendingPlaceSelection.current);
      if (rp) {
        setSelectedDaycare(rp);
        pendingPlaceSelection.current = null;
      }
    }
  }, [mapPlaces]);

  useEffect(() => {
    if (selectedDaycare) {
      fetchItemRatings(selectedDaycare);
    }
  }, [selectedDaycare, fetchItemRatings]);

  // The initial GPS center is now exclusively handled by SearchContext
  // to prevent race conditions and duplicate API calls.
  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;
  }, []); // Only once on first mount

  const initialRegion = {
    latitude: region?.center?.lat || 37.5145,
    longitude: region?.center?.lng || 127.0607,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  const getJobCount = useCallback((dc) => {
    if (!dc || !allJobs) return 0;
    return allJobs.filter(job => isJobMatchingDaycare(job, dc)).length;
  }, [allJobs]);

  const activeFilterCount = (filters.types.length > 0 ? 1 : 0) + 
                             (filters.minRating > 0 ? 1 : 0) + 
                             (filters.minTeacherRating > 0 ? 1 : 0) + 
                             (filters.busOnly ? 1 : 0) + 
                             (filters.hiringOnly ? 1 : 0) + 
                             (filters.services.length > 0 ? 1 : 0) +
                             (filters.admissionAge !== null ? 1 : 0);

  const daycareLookupMap = useMemo(() => {
    const map = new Map();
    (filteredMapDaycares || []).forEach(d => map.set(String(d.id), d));
    (mapPlaces || []).forEach(p => map.set(String(p.id), p));
    return map;
  }, [filteredMapDaycares, mapPlaces]);

  // Use a ref to store the timeout for debounce
  const debounceTimer = useRef(null);
  const loadingTimer = useRef(null);

  const handleRegionChange = useCallback(async (newRegion) => {
    // Clear existing timers
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    // Set a new timer for debounce (600ms)
    debounceTimer.current = setTimeout(async () => {
      try {
        if (selectedDaycare || clusterDaycares || isFetching) return;
        
        const now = Date.now();
        if (now - lastProgrammaticMove.current < 1500) return;
        if (!newRegion?.latitude) return;

        // Distance check to prevent spamming on minor moves
        const dist = Math.sqrt(
          Math.pow(newRegion.latitude - (lastFetchCoords.current?.lat || 0), 2) +
          Math.pow(newRegion.longitude - (lastFetchCoords.current?.lng || 0), 2)
        );
        
        // If move is very minor (less than ~200m), skip refetch
        if (dist < THRESHOLD && lastFetchCoords.current?.lat !== 0) return;
        
        lastFetchCoords.current = { lat: newRegion.latitude, lng: newRegion.longitude };

        // Only show top loading bar if we have data, otherwise full overlay
        // Delay showing loader to avoid flickering on very fast responses
        if (loadingTimer.current) clearTimeout(loadingTimer.current);
        loadingTimer.current = setTimeout(() => setIsFetching(true), 150);

        // 1. Resolve Primary Region (Map Center)
        const kakaoAddr = await getKakaoRegionCode(newRegion.latitude, newRegion.longitude);
        if (!kakaoAddr) {
          setIsFetching(false);
          if (loadingTimer.current) clearTimeout(loadingTimer.current);
          return;
        }

        const sidoObj = SIDO_LIST.find(s => s.name === kakaoAddr.sido || kakaoAddr.sido.includes(s.name));
        if (!sidoObj) {
          setIsFetching(false);
          if (loadingTimer.current) clearTimeout(loadingTimer.current);
          return;
        }

        const districts = SIGUNGU_LIST[sidoObj.code] || [];
        const foundDistrict = districts.find(d => d.name === kakaoAddr.sigungu);
        if (!foundDistrict) {
          setIsFetching(false);
          if (loadingTimer.current) clearTimeout(loadingTimer.current);
          return;
        }

        // 2. Viewport-wide Sampling for Multi-District Support
        const { sw, ne } = newRegion.bounds || { sw: null, ne: null };
        const points = sw ? [
          { lat: newRegion.latitude, lng: newRegion.longitude },
          { lat: sw.lat, lng: sw.lng }, { lat: sw.lat, lng: ne.lng },
          { lat: ne.lat, lng: sw.lng }, { lat: ne.lat, lng: ne.lng }
        ] : [{ lat: newRegion.latitude, lng: newRegion.longitude }];

        // Resolve all points in parallel to identify all visible city districts
        const resolvedResults = await Promise.all(points.map(p => getKakaoRegionCode(p.lat, p.lng)));
        const uniqueSigungus = Array.from(new Set(resolvedResults.filter(Boolean).map(r => r.sigungu)));

        // 3. Fetch Data for all detected regions
        let multiData = await getMultiRegionDaycares(points, (partialData) => {
          updateRegion(
            sidoObj.name, 
            uniqueSigungus, 
            foundDistrict.code, 
            { lat: newRegion.latitude, lng: newRegion.longitude }, 
            false, 
            partialData
          );
        });

        // Final update to context with all resolved data
        InteractionManager.runAfterInteractions(() => {
          updateRegion(
            sidoObj.name, 
            uniqueSigungus, 
            foundDistrict.code, 
            { lat: newRegion.latitude, lng: newRegion.longitude }, 
            false, 
            multiData && multiData.length > 0 ? multiData : null
          );
        });
      } catch (error) {
        console.error('Region change error:', error);
      } finally {
        if (loadingTimer.current) clearTimeout(loadingTimer.current);
        setIsFetching(false);
      }
    }, 600);
  }, [selectedDaycare, clusterDaycares, isFetching, updateRegion]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.floatingHeaderContainer}>
        <View style={[styles.segmentContainer, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.segmentBtn, mapMode === 'DAYCARE' && [styles.segmentBtnActive, { backgroundColor: colors.card }]]} onPress={() => setMapMode('DAYCARE')}>
             <Text style={[styles.segmentText, mapMode === 'DAYCARE' && [styles.segmentTextActive, { color: colors.text }]]}>🏫 어린이집</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segmentBtn, mapMode === 'RECOMMENDED' && [styles.segmentBtnActive, { backgroundColor: colors.card }]]} onPress={() => setMapMode('RECOMMENDED')}>
             <Text style={[styles.segmentText, mapMode === 'RECOMMENDED' && [styles.segmentTextActive, { color: colors.text }]]}>🎈 장소 추천</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KakaoMapWebView
        ref={webviewRef}
        center={region?.center || initialRegion}
        animateTick={region?.animateTick}
        markers={
          mapMode === 'DAYCARE' 
            ? filteredMapDaycares.map(dc => ({ 
                id: dc.id, lat: dc.lat, lng: dc.lng, name: dc.name, type: dc.type, color: dc.color, isFavorite: isFavorited(dc.stcode), isRecommended: false 
              }))
            : mapPlaces
                .filter(rp => rp.isKidsFriendly)
                .map(rp => ({
                  id: rp.id, lat: rp.lat, lng: rp.lng, name: rp.title, type: rp.type, color: PLACE_TYPE_COLORS[rp.type] || PLACE_TYPE_COLORS['장소'], isFavorite: false, isRecommended: true
                }))
        }
        userLocation={userLocation}
        selectedId={selectedDaycare?.id}
        isDarkMode={isDarkMode}
        onRegionChange={handleRegionChange}
        onClusterClick={(ids) => {
          if (!ids || ids.length === 0) return;
          
          // Fast O(1) lookup using the pre-computed Map
          const list = [];
          const seenIds = new Set();
          
          ids.forEach(id => {
            const sid = String(id);
            if (seenIds.has(sid)) return;
            
            const item = daycareLookupMap.get(sid);
            if (item) {
              seenIds.add(sid);
              list.push(item);
            }
          });

          if (list.length > 0) {
            setClusterDaycares(list);
          }
        }}
        onMarkerPress={(id) => {
          lastProgrammaticMove.current = Date.now();
          if (mapMode === 'DAYCARE') {
            const dc = filteredMapDaycares.find(d => d.id === id);
            if (dc) setSelectedDaycare(dc);
          } else {
            const rp = mapPlaces.find(p => p.id === id);
            if (rp) setSelectedDaycare(rp);
          }
        }}
        onMapPress={() => {
          setSelectedDaycare(null);
        }}
      />

      {selectedDaycare && (
        <TouchableOpacity 
          style={[styles.popupCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
          activeOpacity={1}
          onPress={() => {
            if (selectedDaycare.isRecommended) {
              navigation.navigate('PlaceDetail', { place: selectedDaycare });
            } else {
              navigation.navigate('Detail', { daycare: selectedDaycare });
            }
          }}
        >
          <View style={styles.popupHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.popupTypeBadge, { backgroundColor: (selectedDaycare.type in PLACE_TYPE_COLORS ? PLACE_TYPE_COLORS[selectedDaycare.type] : selectedDaycare.color) || colors.primary }]}>
                  <Text style={styles.popupTypeText}>{selectedDaycare.type}</Text>
                </View>
                {selectedDaycare.status && !['정상', '운영중'].includes(selectedDaycare.status) && (
                  <View style={[styles.popupTypeBadge, { backgroundColor: selectedDaycare.status.includes('미운영') || selectedDaycare.status.includes('휴지') ? '#94A3B8' : '#10B981' }]}>
                    <Text style={styles.popupTypeText}>{selectedDaycare.status}</Text>
                  </View>
                )}
                {selectedDaycare.isKidsFriendly && !['키즈카페', '공원/자연', '문화/전시', '놀이/레저'].includes(selectedDaycare.type) && (
                  <View style={[styles.popupTypeBadge, { backgroundColor: '#FCE7F3' }]}>
                    <Text style={[styles.popupTypeText, { color: '#DB2777' }]}>🍭 아이 추천</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[styles.popupTitle, { color: colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                  {selectedDaycare.isRecommended ? selectedDaycare.title : selectedDaycare.name}
                </Text>
                {!selectedDaycare.isRecommended && (
                  <TouchableOpacity 
                    style={{ padding: 8 }}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent card press navigation
                      toggleFavorite(selectedDaycare, navigation);
                    }}
                  >
                    <Heart 
                      size={24} 
                      color={isFavorited(selectedDaycare.stcode) ? '#EF4444' : colors.textMuted} 
                      fill={isFavorited(selectedDaycare.stcode) ? '#EF4444' : 'transparent'} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          <Text style={[styles.popupAddr, { color: colors.textSecondary }]}>{selectedDaycare.addr}</Text>

          {(!selectedDaycare.isRecommended && !selectedDaycare.contentTypeId) ? (
            <>
              <View style={[styles.popupRatingsGroup, { backgroundColor: colors.background }]}>
                <View style={styles.ratingInfo}>
                  <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>학부모 평점</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Star size={12} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.ratingScore, { color: colors.text }]}>{currentRatings.parentAvg}</Text>
                  </View>
                </View>
                <View style={[styles.ratingDivider, { backgroundColor: colors.border }]} />
                <View style={styles.ratingInfo}>
                  <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>선생님 평점</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Star size={12} color="#4A6CF7" fill="#4A6CF7" />
                    <Text style={[styles.ratingScore, { color: colors.text }]}>{currentRatings.teacherAvg}</Text>
                  </View>
                </View>
              </View>
              
              <View style={[styles.popupStats, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>아동수 (현/정)</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{selectedDaycare.current}/{selectedDaycare.capacity}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : '#CBD5E1' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>대기 인원</Text>
                  <Text style={[styles.statValue, { color: '#DC2626' }]}>{selectedDaycare.waitingCount || '12'}명</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : '#CBD5E1' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>구인 중</Text>
                  <Text style={[styles.statValue, { color: getJobCount(selectedDaycare) > 0 ? '#3B82F6' : colors.textMuted }]}>
                    {getJobCount(selectedDaycare)}건
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={{ marginBottom: 20 }}>
              <View style={[styles.popupStats, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', marginBottom: 12 }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>거리</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{Math.round(parseFloat(selectedDaycare.dist) || 0)}m</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : '#CBD5E1' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>방문자 평점</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Star size={14} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.statValue, { color: colors.text, marginLeft: 4 }]}>{currentRatings.parentAvg === '-' ? '0.0' : currentRatings.parentAvg}</Text>
                  </View>
                </View>
                <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : '#CBD5E1' }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>구분</Text>
                  <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{selectedDaycare.type}</Text>
                </View>
              </View>

              {selectedDaycare.tel && (
                <View style={{ paddingHorizontal: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>📞 {selectedDaycare.tel}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={[styles.popupDetailBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={() => {
              if (selectedDaycare.isRecommended) {
                navigation.navigate('PlaceDetail', { place: selectedDaycare });
              } else {
                navigation.navigate('Detail', { daycare: selectedDaycare });
              }
            }}
          >
             <Text style={styles.popupDetailBtnText}>상세 정보 보기</Text>
             <ChevronDown size={18} color="#fff" style={{ transform: [{ rotate: '-90deg' }] }} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {mapMode === 'DAYCARE' ? (
        <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{type}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Object.entries(PLACE_TYPE_COLORS).map(([type, color]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{type}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.myLocateBtn, { backgroundColor: colors.card }, isLocating && { opacity: 0.6 }]} 
        disabled={isLocating}
        onPress={async () => {
          if (isLocating) return;
          setIsLocating(true);
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              alert('위치 권한이 필요합니다.');
              setIsLocating(false);
              return;
            }
            
            // Get position with Balanced accuracy for speed, High can be slow
            const location = await Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.Balanced,
                timeout: 5000 
            });
            const { latitude, longitude } = location.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            
            // 1. Move map immediately for better "felt" responsiveness
            updateRegion(region.sido, region.sigungu, region.arcode, { lat: latitude, lng: longitude }, true);
            
            // 2. Resolve region name in background
            const kakaoAddr = await getKakaoRegionCode(latitude, longitude);
            if (kakaoAddr) {
              const sidoObj = SIDO_LIST.find(s => s.name === kakaoAddr.sido || kakaoAddr.sido.includes(s.name));
              if (sidoObj) {
                const foundDistrict = (SIGUNGU_LIST[sidoObj.code] || []).find(d => d.name === kakaoAddr.sigungu);
                if (foundDistrict) {
                  updateRegion(sidoObj.name, foundDistrict.name, foundDistrict.code, { lat: latitude, lng: longitude }, true);
                }
              }
            }
          } catch (e) { 
            console.warn('My Locate fail', e); 
          } finally {
            setIsLocating(false);
          }
        }}
      >
        <Navigation size={22} color={isLocating ? colors.textMuted : colors.text} />
      </TouchableOpacity>

      {mapMode === 'DAYCARE' && (
        <TouchableOpacity 
          style={[styles.filterBtn, { backgroundColor: colors.card }, activeFilterCount > 0 && [styles.filterBtnActive, { backgroundColor: colors.text }]]} 
          onPress={() => setIsFilterOpen(true)}
        >
          <SlidersHorizontal size={22} color={activeFilterCount > 0 ? colors.card : colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {isFetching && (
        <View style={styles.loadingOverlay}>
          { (filteredMapDaycares.length === 0 && mapPlaces.length === 0) ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>불러오는 중...</Text>
            </View>
          ) : (
            <View style={[styles.miniLoadingIndicator, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.6 }] }} />
            </View>
          )}
        </View>
      )}

      <FilterModal 
        visible={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)} 
      />

      <ClusterListBottomSheet
        isVisible={!!clusterDaycares}
        daycareList={clusterDaycares}
        mode={mapMode}
        onSelect={(dc) => {
          setSelectedDaycare(dc);
          setClusterDaycares(null);
        }}
        onClose={() => setClusterDaycares(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  floatingHeaderContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 16,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  segmentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#1E293B',
  },
  floatingLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    maxWidth: 120,
  },
  floatingLocationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  popupCard: {
    position: 'absolute',
    bottom: 24, // Optimized position to match reference and balance with legend
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
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniLoadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  }
});
