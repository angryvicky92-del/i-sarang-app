import React, { useState } from 'react';
import { FlatList, TextInput, TouchableOpacity, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { HorizontalBox, VerticalBox } from '@/design/layout/Box';

// Sub-components
import { PostCard } from './components/PostCard';

// Queries
import { usePosts } from './queries/usePosts';

export const CommunityScreen: React.FC<any> = ({ navigation }) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: posts = [], isLoading, refetch, isRefetching } = usePosts(searchQuery);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <VerticalBox padding={16} style={{ paddingBottom: 0 }}>
        <HorizontalBox 
          style={[styles.searchBar, { backgroundColor: colors.cardSecondary }]}
          paddingHorizontal={16}
          gap={10}
        >
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="커뮤니티 검색..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </HorizontalBox>
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
        onPress={() => navigation.navigate('WritePost')}
        accessibilityLabel="글쓰기"
      >
        <Plus size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { height: 48, borderRadius: 24 },
  searchInput: { flex: 1, fontSize: 15 },
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
