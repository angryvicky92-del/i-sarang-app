import React, { useState } from 'react';
import { FlatList, TextInput, TouchableOpacity, Text, StyleSheet, RefreshControl, Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

// Sub-components
import { PostCard } from './components/PostCard';

// Queries
import { usePosts } from './queries/usePosts';

export const CommunityScreen: React.FC<any> = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  
  const isRestricted = !profile || profile.user_type === '학부모';
  const [activeTab, setActiveTab] = useState(isRestricted ? '자유' : '전체');
  
  const { data: posts = [], isLoading, refetch, isRefetching } = usePosts(searchQuery, activeTab);

  const handleWritePress = () => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    navigation.navigate('WritePost');
  };

  const tabs = isRestricted ? [] : ['전체', '자유', '선생님'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <VerticalBox paddingHorizontal={16} paddingVertical={8} gap={12} style={{ marginBottom: isRestricted ? 12 : 4 }}>
        {/* UNIFIED SEARCH BAR (CenterList Design) */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchWrapper, { backgroundColor: colors.cardSecondary, borderColor: colors.primary }]}>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="커뮤니티 검색..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => refetch()} style={{ paddingHorizontal: 4 }}>
              <Search size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {tabs.length > 0 && (
          <HorizontalBox gap={16}>
            {tabs.map((tab) => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabItem, 
                  activeTab === tab && { borderBottomColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.tabText, 
                  { color: activeTab === tab ? colors.primary : colors.textMuted },
                  activeTab === tab && { fontWeight: '800' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </HorizontalBox>
        )}
      </VerticalBox>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            colors={colors} 
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })} 
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={handleWritePress}
        accessibilityLabel="글쓰기"
      >
        <Plus size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingVertical: 8 },
  searchWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    height: 44, 
    borderWidth: 1.5 
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  tabItem: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 16, fontWeight: '600' },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    shadowOffset: { width: 0, height: 2 } 
  }
});
