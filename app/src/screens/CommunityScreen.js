import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PenSquare, Briefcase, User, GraduationCap, MapPin, Calendar, Clock } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const ALL_TABS = [
  { id: 'all', label: '전체', icon: null },
  { id: 'teacher', label: '선생님', icon: <GraduationCap size={14} /> },
  { id: 'parent', label: '학부모', icon: <User size={14} /> },
  { id: 'jobs', label: '구인정보', icon: <Briefcase size={14} /> },
];

export default function CommunityScreen({ navigation }) {
  const { session, profile } = useAuth();
  
  const getVisibleTabs = () => {
    if (profile?.user_type === '관리자') return ALL_TABS;
    if (profile?.user_type === '선생님') return ALL_TABS.filter(t => t.id === 'teacher' || t.id === 'jobs');
    return ALL_TABS.filter(t => t.id === 'parent'); // Default to parent for others/parents
  };

  const visibleTabs = getVisibleTabs();
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || 'parent');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // If current activeTab is not in visibleTabs, reset it
    if (!visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'parent');
    }
  }, [profile]);

  const fetchData = async (tab = activeTab) => {
    setLoading(true);
    try {
      if (tab === 'jobs') {
        const { data: jobData, error } = await supabase
          .from('job_offers')
          .select('*')
          .order('posted_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setData(jobData || []);
      } else {
        let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (tab === 'teacher') query = query.eq('type', '선생님');
        if (tab === 'parent') query = query.eq('type', '학부모');
        
        const { data: posts, error } = await query;
        if (error) throw error;
        setData(posts || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab])
  );

  const renderPostItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: item.type === '선생님' ? '#FEF2F2' : '#EFF6FF' }]}>
          <Text style={[styles.badgeText, { color: item.type === '선생님' ? '#DC2626' : '#2563EB' }]}>
            {item.type}
          </Text>
        </View>
        <Text style={styles.author}>{item.author}</Text>
        <Text style={styles.timeText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.contentSnippet} numberOfLines={2}>{item.content}</Text>
    </TouchableOpacity>
  );

  const renderJobItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.jobCard} 
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <View style={styles.jobBadge}>
        <Text style={styles.jobBadgeText}>{item.center_type}</Text>
      </View>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.centerName}>{item.center_name}</Text>
      
      <View style={styles.jobFooter}>
        <View style={styles.infoRow}>
          <MapPin size={12} color="#64748B" />
          <Text style={styles.infoText}>{item.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={12} color="#64748B" />
          <Text style={styles.infoText}>{item.deadline}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>커뮤니티</Text>
      </View>

      <View style={styles.tabContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={visibleTabs}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.tabList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tab, activeTab === item.id && styles.activeTab]}
              onPress={() => setActiveTab(item.id)}
            >
              {item.icon && React.cloneElement(item.icon, { color: activeTab === item.id ? '#75BA57' : '#94A3B8' })}
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color="#75BA57" />
        </View>
      ) : (
        <FlatList
          data={data}
          contentContainerStyle={styles.list}
          keyExtractor={item => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'jobs' 
                  ? '구인 정보가 없습니다. 잠시 후 다시 확인해 주세요.' 
                  : '등록된 게시글이 없습니다. 첫 글을 작성해보세요!'}
              </Text>
            </View>
          }
          renderItem={activeTab === 'jobs' ? renderJobItem : renderPostItem}
        />
      )}

      {activeTab !== 'jobs' && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => {
            if (!session) {
              Alert.alert('알림', '로그인이 필요합니다.', [
                { text: '취소', style: 'cancel' },
                { text: '로그인', onPress: () => navigation.navigate('MyPage') }
              ]);
            } else {
              navigation.navigate('WritePost');
            }
          }}
        >
          <PenSquare color="#fff" size={24} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  tabList: { paddingHorizontal: 12, paddingVertical: 10 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, gap: 5 },
  activeTab: { backgroundColor: '#F0F9EB' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  activeTabText: { color: '#75BA57' },
  list: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 14 },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  author: { fontSize: 13, fontWeight: '600', color: '#475569', flex: 1 },
  timeText: { fontSize: 11, color: '#94A3B8' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  contentSnippet: { fontSize: 14, color: '#475569', lineHeight: 22 },
  jobCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#75BA57' },
  jobBadge: { alignSelf: 'flex-start', backgroundColor: '#F0F9EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 10 },
  jobBadgeText: { fontSize: 10, color: '#75BA57', fontWeight: 'bold' },
  jobTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 6 },
  centerName: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 15 },
  jobFooter: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12, color: '#64748B' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#75BA57', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0, height:2}, elevation: 4 }
});
