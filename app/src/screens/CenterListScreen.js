import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSearch } from '../contexts/SearchContext';
import { useTheme } from '../contexts/ThemeContext';
import { MapPin, Users, ChevronRight, ChevronDown, SlidersHorizontal, Heart, Search, X } from 'lucide-react-native';
import LocationBottomSheet from '../components/LocationBottomSheet';
import KindergartenLoader from '../components/KindergartenLoader';
import FilterModal from '../components/FilterModal';
import AdBanner from '../components/AdBanner';

export default function CenterListScreen({ navigation, route }) {
  const { region, filteredDaycares, filters, setFilters, favorites } = useSearch();
  const { colors, isDarkMode } = useTheme();
  const daycares = filteredDaycares || [];
  const loading = region?.isLoading;
  const [searchQuery, setSearchQuery] = useState(filters.nameQuery || '');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'fav'

  const [displayCount, setDisplayCount] = useState(10);

  const activeFilterCount = (filters.types.length > 0 ? 1 : 0) + 
                             (filters.minRating > 0 ? 1 : 0) + 
                             (filters.busOnly ? 1 : 0) + 
                             (filters.hiringOnly ? 1 : 0) + 
                             (filters.services.length > 0 ? 1 : 0);

  const renderItem = ({ item, index }) => (
    <>
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
        onPress={() => navigation.navigate('Detail', { daycare: item })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: isDarkMode ? `${item.color || '#94A3B8'}40` : `${item.color || '#94A3B8'}20` }]}>
            <Text style={[styles.typeText, { color: item.color || '#94A3B8' }]}>{item.type}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>{item.addr}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Users size={14} color="#3B82F6" />
            <Text style={[styles.statTextHighlight, { color: '#3B82F6' }]}>아동수 {item.current || 0}/{item.capacity || 0}명</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={14} color={colors.primary} />
            <Text style={[styles.statTextHighlight, { color: colors.primary }]}>대기 {item.waitingCount || 0}명</Text>
          </View>
        </View>
        <View style={[styles.chevron, { backgroundColor: isDarkMode ? colors.background : '#F8F9FA' }]}>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
      {(index + 1) % 5 === 0 && <AdBanner style={{ marginBottom: 16 }} />}
    </>
  );

  const listData = activeTab === 'all' ? daycares : favorites.map(f => f.metadata);
  const paginatedData = listData.slice(0, displayCount);

  // Reset pagination on region or tab change, and handle incoming tab param
  React.useEffect(() => {
    setDisplayCount(10);
  }, [region.arcode, activeTab]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route.params?.tab === 'fav') {
        setActiveTab('fav');
        // Clear param after using it to avoid sticky state
        navigation.setParams({ tab: undefined });
      }
    });
    return unsubscribe;
  }, [navigation, route.params]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    setFilters(prev => ({ ...prev, nameQuery: text }));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilters(prev => ({ ...prev, nameQuery: '' }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? colors.background : '#F8F9FA' }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchWrapper, { backgroundColor: isDarkMode ? colors.background : '#fff', borderColor: colors.primary }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="어린이집 명 검색..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={{ marginRight: 8 }}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleSearch(searchQuery)} style={{ paddingHorizontal: 4 }}>
            <Search size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.actionRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.locationSelector, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }]} onPress={() => setIsLocationOpen(true)} activeOpacity={0.7}>
          <MapPin size={16} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text }]}>{region.sido} {region.sigungu}</Text>
          <ChevronDown size={14} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterBtnCompact, 
            { backgroundColor: colors.card, borderColor: colors.border },
            activeFilterCount > 0 && { backgroundColor: isDarkMode ? colors.text : '#1E293B', borderColor: isDarkMode ? colors.text : '#1E293B' }
          ]} 
          onPress={() => setIsFilterOpen(true)}
        >
          <SlidersHorizontal size={16} color={activeFilterCount > 0 ? colors.background : colors.textSecondary} />
          <Text style={[styles.filterBtnText, activeFilterCount > 0 ? { color: colors.background } : { color: colors.textSecondary }]}>필터</Text>
          {activeFilterCount > 0 && <View style={[styles.filterBadge, { backgroundColor: '#EF4444' }]}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'all' && styles.tabTextActive]}>전체 {daycares.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            { backgroundColor: colors.card, borderColor: colors.border },
            activeTab === 'fav' && { backgroundColor: favorites.length > 0 ? '#EF4444' : colors.primary, borderColor: favorites.length > 0 ? '#EF4444' : colors.primary }
          ]} 
          onPress={() => setActiveTab('fav')}
        >
          <Heart size={14} color={activeTab === 'fav' ? '#fff' : '#EF4444'} fill={activeTab === 'fav' ? '#fff' : 'transparent'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'fav' && styles.tabTextActive]}>즐겨찾기 {favorites.length}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <KindergartenLoader text="어린이집 목록을" />
      ) : (
        <FlatList
          data={paginatedData}
          keyExtractor={(item, idx) => (item.id || item.stcode || idx).toString()}
          renderItem={renderItem}
          ListHeaderComponent={<AdBanner style={{ marginBottom: 20 }} />}
          contentContainerStyle={styles.list}
          onEndReached={() => setDisplayCount(prev => prev + 10)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {activeTab === 'fav' ? '즐겨찾기한 어린이집이 없습니다.' : '조건에 맞는 어린이집이 없습니다.'}
              </Text>
            </View>
          }
        />
      )}

      <LocationBottomSheet isVisible={isLocationOpen} onClose={() => setIsLocationOpen(false)} />
      <FilterModal visible={isFilterOpen} onClose={() => setIsFilterOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 10, height: 44, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  locationSelector: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  locationText: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    marginLeft: 6
  },
  filterBtnCompact: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1, 
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterBadge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  
  tabContainer: { 
    flexDirection: 'row', 
    marginHorizontal: 20, 
    marginTop: 16,
    marginBottom: 12, 
    gap: 10 
  },
  tab: { 
    flex: 1, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexDirection: 'row', 
    borderWidth: 1, 
  },
  tabText: { fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingTop: 10 },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },

  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingRight: 40 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  typeText: { fontSize: 10, fontWeight: '900' },
  title: { fontSize: 16, fontWeight: '800', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingRight: 40 },
  infoText: { fontSize: 13, marginLeft: 6, flex: 1 },
  statsRow: { flexDirection: 'row' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  statTextHighlight: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  chevron: { position: 'absolute', right: 20, top: '50%', marginTop: -10, borderRadius: 12, padding: 6 }
});
