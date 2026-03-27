import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useSearch } from '../contexts/SearchContext';
import { MapPin, Users, ChevronRight, ChevronDown, SlidersHorizontal, Heart } from 'lucide-react-native';
import LocationBottomSheet from '../components/LocationBottomSheet';
import FilterModal from '../components/FilterModal';

export default function CenterListScreen({ navigation }) {
  const { region, filteredDaycares, filters, favorites } = useSearch();
  const daycares = filteredDaycares || [];
  const loading = region?.isLoading;
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'fav'

  const activeFilterCount = (filters.types.length > 0 ? 1 : 0) + 
                             (filters.minRating > 0 ? 1 : 0) + 
                             (filters.busOnly ? 1 : 0) + 
                             (filters.hiringOnly ? 1 : 0) + 
                             (filters.services.length > 0 ? 1 : 0);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('Detail', { daycare: item })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: `${item.color || '#94A3B8'}20` }]}>
          <Text style={[styles.typeText, { color: item.color || '#94A3B8' }]}>{item.type}</Text>
        </View>
        <Text style={styles.title}>{item.name}</Text>
      </View>
      <View style={styles.infoRow}>
        <MapPin size={14} color="#636E72" />
        <Text style={styles.infoText} numberOfLines={1}>{item.addr}</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Users size={14} color="#3B82F6" />
          <Text style={[styles.statTextHighlight, { color: '#3B82F6' }]}>아동수 {item.current || 0}/{item.capacity || 0}명</Text>
        </View>
        <View style={styles.statItem}>
          <Users size={14} color="#75BA57" />
          <Text style={styles.statTextHighlight}>대기 {item.waitingCount || 0}명</Text>
        </View>
      </View>
      <View style={styles.chevron}>
        <ChevronRight size={20} color="#ADB5BD" />
      </View>
    </TouchableOpacity>
  );

  const listData = activeTab === 'all' ? daycares : favorites.map(f => f.metadata);

  const renderReviews = () => { // Placeholder just in case it was used
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.header} onPress={() => setIsLocationOpen(true)} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>{region.sido} {region.sigungu}</Text>
          <ChevronDown size={24} color="#1E293B" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} 
          onPress={() => setIsFilterOpen(true)}
        >
          <SlidersHorizontal size={18} color={activeFilterCount > 0 ? '#fff' : '#64748B'} />
          {activeFilterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>}
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.tabActive]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>전체 {daycares.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'fav' && styles.tabActive]} 
          onPress={() => setActiveTab('fav')}
        >
          <Heart size={14} color={activeTab === 'fav' ? '#fff' : '#EF4444'} fill={activeTab === 'fav' ? '#fff' : 'transparent'} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, activeTab === 'fav' && styles.tabTextActive]}>즐겨찾기 {favorites.length}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#75BA57" />
          <Text style={{ marginTop: 10, color: '#ADB5BD' }}>데이터를 불러오는 중입니다...</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  filterBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, gap: 10 },
  tab: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', borderWidth: 1, borderColor: '#F1F5F9' },
  tabActive: { backgroundColor: '#75BA57', borderColor: '#75BA57' },
  tabText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  tabTextActive: { color: '#fff' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingTop: 10 },
  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  typeText: { fontSize: 10, fontWeight: '900' },
  title: { fontSize: 16, fontWeight: '800', color: '#2D3436', flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 13, color: '#636E72', marginLeft: 6, flex: 1 },
  statsRow: { flexDirection: 'row' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  statTextHighlight: { fontSize: 12, color: '#75BA57', fontWeight: '700', marginLeft: 4 },
  chevron: { position: 'absolute', right: 20, top: '50%', marginTop: -10, backgroundColor: '#F8F9FA', borderRadius: 12, padding: 6 }
});
