import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getConversations } from '../services/chatService';
import { MessageSquare, User, ChevronRight, Clock, ChevronLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function ChatListScreen({ navigation }) {
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getConversations(profile.id);
      setConversations(data || []);
    } catch (error) {
      console.error('Fetch chats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  const renderChatItem = ({ item }) => {
    const otherUser = item.user1_id === profile.id ? item.user2 : item.user1;
    const lastMsg = item.last_message || '대화가 시작되었습니다.';
    const time = new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(item.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <TouchableOpacity 
        style={[styles.chatItem, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, otherUser })}
      >
        <View style={[styles.avatar, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}>
          <User size={24} color={colors.primary} />
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.nickname, { color: colors.text }]}>{otherUser?.nickname || '익명'}</Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>{time}</Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={[styles.lastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
              {lastMsg}
            </Text>
            {item.unread_count > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCountText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
            <Text style={[styles.date, { color: colors.textMuted }]}>{date}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.border} />
      </TouchableOpacity>
    );
  };

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>채팅</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <MessageSquare size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>로그인이 필요한 서비스입니다.</Text>
          <TouchableOpacity style={[styles.loginBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>채팅</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={conversations}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <MessageSquare size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>아직 개설된 채팅방이 없습니다.</Text>
            <Text style={[styles.subText, { color: colors.textMuted }]}>게시글이나 후기의 닉네임을 클릭해 대화를 시작해보세요!</Text>
          </View>
        }
        contentContainerStyle={conversations.length === 0 && { flex: 1 }}
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
    paddingHorizontal: 16,
    borderBottomWidth: 1
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  subText: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  chatContent: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nickname: { fontSize: 16, fontWeight: 'bold' },
  time: { fontSize: 12 },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 14, flex: 1, marginRight: 10 },
  date: { fontSize: 12 },
  unreadBadge: {
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginRight: 6
  },
  unreadCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900'
  },
  loginBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
