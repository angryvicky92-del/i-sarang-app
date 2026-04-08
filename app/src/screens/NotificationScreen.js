import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronLeft, Inbox, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../services/supabaseClient';

export default function NotificationScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { session } = useAuth();
  const { settings } = useSettings();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session || !settings.community) {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch latest notifications (new comments on my posts)
      const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', session.user.id);
      
      if (myPosts && myPosts.length > 0) {
        const myPostIds = myPosts.map(p => p.id);
        const { data: notis, error } = await supabase.from('post_comments')
          .select('id, content, created_at, profiles(nickname), post_id')
          .in('post_id', myPostIds)
          .neq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        if (notis) {
          setNotifications(notis.map(n => ({
            id: n.id,
            title: '게시글에 댓글이 달렸습니다.',
            body: n.content,
            date: new Date(n.created_at).toLocaleDateString() + ' ' + new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            author: n.profiles?.nickname,
            targetId: n.post_id
          })));
        }
      }
    } catch (e) {
      console.warn('Fetch notifications fail', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, settings.community]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>알림</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : !settings.community ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? colors.card : colors.background }]}>
            <Bell size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>알림 설정이 꺼져 있습니다.</Text>
          <Text style={[styles.emptySubText, { color: colors.textMuted }]}>설정에서 커뮤니티 알림을 켜주세요.</Text>
          <TouchableOpacity 
            style={[styles.loginBtn, { backgroundColor: colors.primary, marginTop: 20 }]} 
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.loginBtnText}>설정으로 이동</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: isDarkMode ? colors.card : colors.background }]}>
            <Inbox size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>도착한 알림이 없습니다.</Text>
          <Text style={[styles.emptySubText, { color: colors.textMuted }]}>새로운 소식이 생기면 알려드릴게요!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.notiItem, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('PostDetail', { postId: item.targetId })}
            >
              <View style={styles.notiHeader}>
                <View style={[styles.notiBadge, { backgroundColor: colors.primary + '15' }]}>
                   <MessageSquare size={12} color={colors.primary} />
                </View>
                <Text style={[styles.notiDate, { color: colors.textMuted }]}>{item.date}</Text>
              </View>
              <Text style={[styles.notiTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.notiBody, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyIcon: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20
  },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 14 },
  notiItem: { padding: 16, borderBottomWidth: 1 },
  notiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notiBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  notiDate: { fontSize: 12 },
  notiTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  notiBody: { fontSize: 14, lineHeight: 20 },
  loginBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  loginBtnText: { color: '#FFF', fontWeight: 'bold' }
});
