import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PenSquare, User, GraduationCap, ThumbsUp, MessageSquare, Menu, Bell, Eye, Search, ChevronDown, X, MessageCircle } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AdBanner from '../components/AdBanner';
import UserActionModal from '../components/UserActionModal';
import { getOrCreateChat } from '../services/chatService';

const ALL_TABS = [
  { id: 'parent', label: '자유게시판', icon: <User size={14} /> },
  { id: 'teacher', label: '선생님게시판', icon: <GraduationCap size={14} /> },
];

export default function CommunityScreen({ navigation, route }) {
  const { session, profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  
  const getVisibleTabs = () => {
    if (profile?.user_type === '관리자') return ALL_TABS;
    if (profile?.user_type === '선생님' || profile?.user_type === '보육교사') return ALL_TABS;
    return ALL_TABS.filter(t => t.id === 'parent');
  };

  const visibleTabs = getVisibleTabs();
  const [activeTab, setActiveTab] = useState(route.params?.activeTab || visibleTabs[0]?.id || 'parent');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('title_content'); // 'title_content', 'title', 'author'
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Chat Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <TouchableOpacity 
            onPress={() => setShowSearch(prev => !prev)}
            style={{ padding: 8 }}
          >
            <Search size={22} color={showSearch ? colors.primary : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              if (!session) {
                Alert.alert('알림', '로그인이 필요합니다.', [
                  { text: '취소', style: 'cancel' },
                  { text: '확인', onPress: () => navigation.navigate('Login') }
                ]);
              } else {
                navigation.navigate('ChatList');
              }
            }}
            style={{ padding: 8 }}
          >
            <MessageCircle size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation, showSearch, colors, session]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase.from('posts').select('*, post_comments(count)').order('created_at', { ascending: false }).limit(50);
      
      if (activeTab === 'teacher') query = query.eq('type', '선생님');
      if (activeTab === 'parent') query = query.eq('type', '학부모');
      
      if (searchQuery.trim()) {
        const q = `%${searchQuery.trim()}%`;
        if (searchType === 'title_content') {
          query = query.or(`title.ilike.${q},content.ilike.${q}`);
        } else if (searchType === 'title') {
          query = query.ilike('title', q);
        } else if (searchType === 'author') {
          query = query.ilike('author', q);
        }
      }
      
      const { data: posts, error } = await query;
      if (error) throw error;
      setData(posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery, searchType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleNicknameClick = (post) => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (post.user_id === profile.id) return; // Don't chat with self

    setSelectedUser({
      id: post.user_id,
      nickname: post.author,
      userType: post.type
    });
    setIsModalVisible(true);
  };

  const startChat = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const chatId = await getOrCreateChat(profile.id, selectedUser.id);
      if (chatId) {
        navigation.navigate('ChatRoom', { chatId, otherUser: selectedUser });
      }
    } catch {
      Alert.alert('오류', '채팅방을 여는 중 문제가 발생했습니다.');
    }
  }, [selectedUser, profile?.id, navigation]);

  const renderPostItem = ({ item, index }) => {
    const commentCount = item.post_comments?.[0]?.count || 0;
    const upvotes = item.upvotes || 0;
    
    return (
      <>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.card, borderBottomColor: colors.border }]} 
          onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        >
          <View style={styles.cardMain}>
            <View style={styles.cardLeft}>
              <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              
              <View style={styles.metaRowCompact}>
                {item.type && (
                  <View style={[styles.typeBadgeCompact, { 
                    backgroundColor: item.type === '선생님' 
                      ? (isDarkMode ? '#4A6CF720' : '#EEF2FF') 
                      : (isDarkMode ? `${colors.primary}20` : `${colors.primary}10`),
                    borderColor: item.type === '선생님' ? '#4A6CF740' : `${colors.primary}40`,
                    borderWidth: 1
                  }]}>
                    <Text style={[styles.typeBadgeTextCompact, { 
                      color: item.type === '선생님' ? '#4A6CF7' : colors.primary 
                    }]}>
                      {item.type}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => handleNicknameClick(item)}>
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.author}</Text>
                </TouchableOpacity>
                <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>추천 {upvotes}</Text>
                <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Eye size={12} color={colors.textMuted} />
                  <Text style={[styles.metaText, { color: colors.textMuted }]}>{item.views || 0}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardRight}>
              {item.image_url && (
                <Image source={{ uri: item.image_url }} style={[styles.itemThumbnail, { backgroundColor: colors.background }]} />
              )}
              <View style={[styles.commentBox, { backgroundColor: isDarkMode ? colors.background : '#EDF2F7' }]}>
                <Text style={[styles.commentCount, { color: colors.textSecondary }]}>{commentCount}</Text>
                <Text style={[styles.commentLabel, { color: colors.textMuted }]}>댓글</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {(index + 1) % 7 === 0 && <AdBanner style={{ marginHorizontal: 20, marginBottom: 10 }} />}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      
      {visibleTabs.length > 1 && (
        <View style={[styles.tabContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={visibleTabs}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.tabList}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.tab, activeTab === item.id && [styles.activeTab, { borderBottomColor: colors.primary }]]}
                onPress={() => { setActiveTab(item.id); setData([]); }}
              >
                <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === item.id && { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Search Bar */}
      {showSearch && (
        <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.searchMainRow}>
            <TouchableOpacity 
              style={[styles.typeDropdownTrigger, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]} 
              onPress={() => setIsTypeDropdownVisible(!isTypeDropdownVisible)}
            >
              <Text style={[styles.typeDropdownText, { color: colors.textSecondary }]}>
                {searchType === 'title_content' ? '제목+내용' : searchType === 'title' ? '제목' : '작성자'}
              </Text>
              <ChevronDown size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.searchInputWrapper, { backgroundColor: isDarkMode ? colors.background : '#fff', borderColor: colors.primary }]}>
              <TextInput 
                style={[styles.searchInputCompact, { color: colors.text }]} 
                placeholder="검색어 입력..." 
                placeholderTextColor={colors.textMuted} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                onSubmitEditing={fetchData} 
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); fetchData(); }} style={{ padding: 4 }}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={fetchData} style={{ paddingHorizontal: 12 }}>
                <Search size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {isTypeDropdownVisible && (
            <View style={[styles.typeDropdownOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={[styles.typeOption, { borderBottomColor: colors.border }]} onPress={() => { setSearchType('title_content'); setIsTypeDropdownVisible(false); fetchData(); }}>
                <Text style={[styles.typeOptionText, { color: searchType === 'title_content' ? colors.primary : colors.textSecondary }]}>제목+내용</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeOption, { borderBottomColor: colors.border }]} onPress={() => { setSearchType('title'); setIsTypeDropdownVisible(false); fetchData(); }}>
                <Text style={[styles.typeOptionText, { color: searchType === 'title' ? colors.primary : colors.textSecondary }]}>제목</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.typeOption} onPress={() => { setSearchType('author'); setIsTypeDropdownVisible(false); fetchData(); }}>
                <Text style={[styles.typeOptionText, { color: searchType === 'author' ? colors.primary : colors.textSecondary }]}>작성자</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={data}
          ListHeaderComponent={<AdBanner style={{ marginHorizontal: 20, marginTop: 10 }} />}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>등록된 게시글이 없습니다.</Text>
            </View>
          }
          renderItem={renderPostItem}
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]} 
        onPress={() => {
          if (!session) {
            Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
          } else { navigation.navigate('WritePost', { boardType: activeTab }); }
        }}
      >
        <PenSquare color="#fff" size={24} />
      </TouchableOpacity>

      <UserActionModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onChat={startChat}
        nickname={selectedUser?.nickname}
        userType={selectedUser?.userType}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    height: 60,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottomWidth: 1, 
    paddingHorizontal: 16
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  tabContainer: { borderBottomWidth: 1 },
  tabList: { paddingHorizontal: 4 },
  tab: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  activeTab: { },
  tabText: { fontSize: 15, fontWeight: 'bold' },
  activeTabText: { },
  list: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  card: { padding: 16, borderBottomWidth: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flex: 1, paddingRight: 10 },
  itemTitle: { fontSize: 16, fontWeight: '500', marginBottom: 6 },
  metaRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13 },
  metaDivider: { width: 1, height: 10 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemThumbnail: { width: 64, height: 64, borderRadius: 12 },
  commentBox: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  commentCount: { fontSize: 16, fontWeight: 'bold' },
  commentLabel: { fontSize: 10 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.2, shadowOffset: {width:0, height:2}, elevation: 4 },
  
  // Search Bar Styles
  searchBarContainer: { padding: 12, borderBottomWidth: 1, zIndex: 10 },
  searchMainRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  typeDropdownTrigger: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 5, minWidth: 90 },
  typeDropdownText: { fontSize: 12, fontWeight: 'bold' },
  searchInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingLeft: 12, borderWidth: 1.5 },
  searchInputCompact: { flex: 1, paddingVertical: 8, fontSize: 13 },
  searchBtnInBox: { paddingHorizontal: 12, paddingVertical: 8, borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  searchBtnInBoxText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  typeDropdownOverlay: { position: 'absolute', top: 55, left: 12, borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 20, borderWidth: 1 },
  typeOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  typeOptionText: { fontSize: 13, fontWeight: '600' },
  typeBadgeCompact: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  typeBadgeTextCompact: { fontSize: 10, fontWeight: 'bold' },
});
