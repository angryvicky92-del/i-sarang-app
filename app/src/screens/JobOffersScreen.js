import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Briefcase, MapPin, Calendar, Search, Filter, X, Check, RotateCcw, ChevronDown, Bell, Menu, Eye } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SIDO_LIST, SIGUNGU_LIST, TYPE_COLORS, TYPE_GOK } from '../services/dataService';
import AdBanner from '../components/AdBanner';
import KindergartenLoader from '../components/KindergartenLoader';

const POSITIONS = ['전체', '보육교사', '보조교사', '조리원', '대체교사', '기타'];

export default function JobOffersScreen({ navigation }) {
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Job Search/Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('title'); // 'title' or 'center_name'
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);
  
  // Modals Visibility
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  
  // Final Filters
  const [filters, setFilters] = useState({ region: '전체', sigungu: '전체', position: '전체', extendedCare: false });
  
  // Temp states for Modals
  const [tempFilters, setTempFilters] = useState({ position: '전체', extendedCare: false });
  const [regionTemp, setRegionTemp] = useState({ region: '전체', sigungu: '전체' });

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  const fetchData = async (isLoadMore = false) => {
    if (isLoadMore) setIsMoreLoading(true);
    else setLoading(true);

    try {
      let query = supabase.from('job_offers').select('*', { count: 'exact' });

      const todayStr = new Date().toISOString().split('T')[0];
      query = query.gte('deadline', todayStr);

      if (searchQuery) {
        query = query.ilike(searchType === 'title' ? 'title' : 'center_name', `%${searchQuery}%`);
      }

      if (filters.region !== '전체') {
        const locQuery = filters.sigungu !== '전체' ? `${filters.region} ${filters.sigungu}` : filters.region;
        query = query.ilike('location', `%${locQuery}%`);
      }

      if (filters.position !== '전체') {
        query = query.eq('position', filters.position);
      }

      if (filters.extendedCare) {
        query = query.contains('metadata', { "연장보육반 전담교사": "예" });
      }

      const from = isLoadMore ? (page + 1) * 10 : 0;
      const to = from + 9;

      const { data: jobData, error } = await query
        .order('posted_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (isLoadMore) {
        setData(prev => [...prev, ...(jobData || [])]);
        setPage(prev => prev + 1);
      } else {
        setData(jobData || []);
        setPage(0);
      }
      setHasMore(jobData.length === 10);
    } catch (error) {
      console.error('Error fetching job offers:', error.message);
    } finally {
      setLoading(false);
      setIsMoreLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLoadMore = () => {
    if (!isMoreLoading && hasMore) {
      fetchData(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [filters])
  );

  const applySearch = () => fetchData();

  // Region Handlers
  const handleOpenRegion = () => {
    setRegionTemp({ region: filters.region, sigungu: filters.sigungu });
    setIsRegionModalVisible(true);
  };
  const handleApplyRegion = () => {
    setFilters(prev => ({ ...prev, region: regionTemp.region, sigungu: regionTemp.sigungu }));
    setIsRegionModalVisible(false);
  };

  // Filter Handlers
  const handleOpenFilter = () => {
    setTempFilters({ position: filters.position, extendedCare: filters.extendedCare });
    setIsFilterModalVisible(true);
  };
  const handleApplyFilters = () => {
    setFilters(prev => ({ ...prev, position: tempFilters.position, extendedCare: tempFilters.extendedCare }));
    setIsFilterModalVisible(false);
  };
  const handleResetFilters = () => {
    setTempFilters({ position: '전체', extendedCare: false });
  };

  const regionDisplayText = filters.region === '전체' ? '지역 전체' : (filters.sigungu === '전체' ? `${filters.region} 전체` : `${filters.region} ${filters.sigungu}`);
  const selectedSidoObj = SIDO_LIST.find(s => s.name === regionTemp.region);
  const sidoCode = selectedSidoObj ? selectedSidoObj.code : null;
  const districts = sidoCode ? [{ name: '전체', code: 'all' }, ...(SIGUNGU_LIST[sidoCode] || [])] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.searchMainRow}>
          <TouchableOpacity style={[styles.typeDropdownTrigger, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]} onPress={() => setIsTypeDropdownVisible(!isTypeDropdownVisible)}>
            <Text style={[styles.typeDropdownText, { color: colors.textSecondary }]}>{searchType === 'title' ? '제목' : '어린이집명'}</Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.searchInputWrapper, { backgroundColor: isDarkMode ? colors.background : '#fff', borderColor: colors.primary }]}>
            <TextInput 
              style={[styles.searchInputCompact, { color: colors.text }]} 
              placeholder="검색어 입력..." 
              placeholderTextColor={colors.textMuted} 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
              onSubmitEditing={applySearch} 
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); applySearch(); }} style={{ padding: 4 }}>
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={applySearch} style={{ paddingHorizontal: 10 }}>
              <Search size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {isTypeDropdownVisible && (
          <View style={[styles.typeDropdownOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={[styles.typeOption, { borderBottomColor: colors.border }]} onPress={() => { setSearchType('title'); setIsTypeDropdownVisible(false); }}>
              <Text style={[styles.typeOptionText, { color: searchType === 'title' ? colors.primary : colors.textSecondary }]}>제목</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeOption, { borderBottomColor: colors.border }]} onPress={() => { setSearchType('center_name'); setIsTypeDropdownVisible(false); }}>
              <Text style={[styles.typeOptionText, { color: searchType === 'center_name' ? colors.primary : colors.textSecondary }]}>어린이집명</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterBtnSmall, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }, filters.region !== '전체' && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={handleOpenRegion}>
            <MapPin size={16} color={filters.region !== '전체' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.filterBtnSmallText, { color: filters.region !== '전체' ? '#fff' : colors.textSecondary }]} numberOfLines={1}>{regionDisplayText}</Text>
            <ChevronDown size={14} color={filters.region !== '전체' ? '#fff' : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.filterBtnSmall, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }, (filters.position !== '전체' || filters.extendedCare) && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={handleOpenFilter}>
            <Filter size={16} color={filters.position !== '전체' || filters.extendedCare ? '#fff' : colors.textSecondary} />
            <Text style={[styles.filterBtnSmallText, { color: filters.position !== '전체' || filters.extendedCare ? '#fff' : colors.textSecondary }]}>상세 필터</Text>
            <ChevronDown size={14} color={filters.position !== '전체' || filters.extendedCare ? '#fff' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <KindergartenLoader text="교직원 채용 정보를" />
      ) : (
        <FlatList
          data={data}
          style={{ backgroundColor: colors.background }}
          ListHeaderComponent={<AdBanner style={{ marginBottom: 16 }} />}
          contentContainerStyle={styles.list}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>검색 결과가 없습니다.</Text>
            </View>
          }
          ListFooterComponent={isMoreLoading && <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />}
          renderItem={({ item, index }) => (
            <>
              <TouchableOpacity style={[styles.jobCard, { backgroundColor: colors.card, borderBottomColor: colors.border, borderLeftColor: colors.primary }]} onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}>
                <View style={styles.jobCardHeader}>
                  <View style={[styles.jobBadge, { backgroundColor: TYPE_COLORS[item.center_type] || colors.primary }]}>
                    <Text style={[styles.jobBadgeText, { color: item.center_type === TYPE_GOK ? '#1E293B' : '#fff' }]}>{item.center_type}</Text>
                  </View>
                  <Text style={[styles.jobDate, { color: colors.textMuted }]}>{item.posted_at || '최근'}</Text>
                </View>
                <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.centerName, { color: colors.textSecondary }]}>{item.center_name}</Text>
                <View style={[styles.jobFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.infoRow}><MapPin size={12} color={colors.textMuted} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.location}</Text></View>
                  <View style={styles.infoRow}><Calendar size={12} color={colors.textMuted} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.deadline}</Text></View>
                  <View style={styles.infoRow}><Eye size={12} color={colors.textMuted} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.views || 0}</Text></View>
                </View>
              </TouchableOpacity>
              {(index + 1) % 5 === 0 && <AdBanner style={{ marginHorizontal: 16, marginBottom: 16 }} />}
            </>
          )}
        />
      )}

      {/* Region Modal */}
      <Modal visible={isRegionModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsRegionModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ width: 60 }} /><Text style={[styles.modalTitle, { color: colors.text }]}>지역 선택</Text>
              <TouchableOpacity onPress={() => setIsRegionModalVisible(false)} style={{ width: 60, alignItems: 'flex-end' }}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <View style={[styles.regionSelector, { borderColor: colors.border }]}>
              <View style={[styles.sidoCol, { backgroundColor: isDarkMode ? colors.background : '#F8F9FA', borderRightColor: colors.border }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity style={[styles.regionItem, regionTemp.region === '전체' && { backgroundColor: isDarkMode ? colors.card : colors.background }]} onPress={() => setRegionTemp({ region: '전체', sigungu: '전체' })}>
                    <Text style={[styles.regionText, { color: regionTemp.region === '전체' ? colors.primary : colors.textSecondary }]}>전체</Text>
                  </TouchableOpacity>
                  {SIDO_LIST.map((item) => (
                    <TouchableOpacity key={item.code} style={[styles.regionItem, regionTemp.region === item.name && { backgroundColor: isDarkMode ? colors.card : colors.background }]} onPress={() => setRegionTemp({ region: item.name, sigungu: '전체' })}>
                      <Text style={[styles.regionText, { color: regionTemp.region === item.name ? colors.primary : colors.textSecondary }]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={[styles.sigunguCol, { backgroundColor: colors.card }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {regionTemp.region === '전체' ? (
                    <View style={styles.emptyRegion}><Text style={[styles.emptyRegionText, { color: colors.textMuted }]}>시/도를 선택해주세요</Text></View>
                  ) : (
                    districts.map((d) => (
                      <TouchableOpacity key={d.code} style={[styles.sigunguItem, { borderBottomColor: colors.border }, regionTemp.sigungu === d.name && { backgroundColor: isDarkMode ? colors.background : '#F0F9EB' }]} onPress={() => setRegionTemp({ ...regionTemp, sigungu: d.name })}>
                        <Text style={[styles.sigunguText, { color: regionTemp.sigungu === d.name ? (isDarkMode ? colors.primary : '#16A34A') : colors.text }]}>{d.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyRegion}><Text style={styles.applyBtnText}>선택 완료</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsFilterModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleResetFilters} style={[styles.resetBtn, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}><RotateCcw size={16} color={colors.textSecondary} /><Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>초기화</Text></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>상세 필터</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}><X size={24} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>모집 직종</Text>
              <View style={styles.chipGroup}>
                {POSITIONS.map(p => (
                  <TouchableOpacity key={p} style={[styles.chip, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', borderColor: colors.border }, tempFilters.position === p && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setTempFilters({...tempFilters, position: p})}>
                    <Text style={[styles.chipText, { color: tempFilters.position === p ? '#fff' : colors.textSecondary }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.filterLabel, { color: colors.text }]}>기타 조건</Text>
              <TouchableOpacity style={[styles.toggleRow, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }]} onPress={() => setTempFilters({...tempFilters, extendedCare: !tempFilters.extendedCare})}>
                <Text style={[styles.toggleText, { color: colors.textSecondary }]}>연장보육반 전담교사만 보기</Text>
                <View style={[styles.toggle, { backgroundColor: colors.border }, tempFilters.extendedCare && { backgroundColor: colors.primary }]}>{tempFilters.extendedCare && <Check size={14} color="#fff" />}</View>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyFilters}><Text style={styles.applyBtnText}>필터 적용하기</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBarContainer: { padding: 16, borderBottomWidth: 1, gap: 10, zIndex: 10 },
  searchMainRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  typeDropdownTrigger: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 5, minWidth: 90 },
  typeDropdownText: { fontSize: 12, fontWeight: 'bold' },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingLeft: 12, borderWidth: 1.5 },
  searchInputCompact: { flex: 1, paddingVertical: 8, fontSize: 13 },
  searchBtnInBox: { paddingHorizontal: 12, paddingVertical: 8, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  searchBtnInBoxText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  typeDropdownOverlay: { position: 'absolute', top: 50, left: 16, borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 20, borderWidth: 1 },
  typeOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  typeOptionText: { fontSize: 13, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterBtnSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 6 },
  filterBtnSmallText: { fontSize: 13, fontWeight: '600' },
  list: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  jobCard: { padding: 20, borderBottomWidth: 1, borderLeftWidth: 4 },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  jobBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  jobBadgeText: { fontSize: 10, fontWeight: 'bold' },
  jobDate: { fontSize: 11 },
  jobTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  centerName: { fontSize: 14, fontWeight: '600', marginBottom: 15 },
  jobFooter: { flexDirection: 'row', gap: 12, borderTopWidth: 1, paddingTop: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  resetBtnText: { fontSize: 12, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { marginBottom: 20 },
  filterLabel: { fontSize: 15, fontWeight: 'bold', marginTop: 16, marginBottom: 12 },
  regionSelector: { flexDirection: 'row', height: 350, borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  sidoCol: { flex: 1, borderRightWidth: 1 },
  sigunguCol: { flex: 1.5 },
  regionItem: { paddingVertical: 14, paddingHorizontal: 16 },
  regionText: { fontSize: 14, fontWeight: '600' },
  sigunguItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  sigunguText: { fontSize: 14 },
  emptyRegion: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyRegionText: { fontSize: 13 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 13 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 16 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  toggle: { width: 40, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  applyBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
