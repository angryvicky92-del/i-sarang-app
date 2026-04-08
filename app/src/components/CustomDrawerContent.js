import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { User, Settings, LogOut, LogIn, ChevronRight, Heart, Bookmark, Star, MessageCircle, Bell } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { useIsFocused } from '@react-navigation/native';
import { useSettings } from '../contexts/SettingsContext';

export default function CustomDrawerContent(props) {
  const { navigation } = props;
  const { session, profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { settings } = useSettings();
  const isFocused = useIsFocused(); // To refresh when navigating back
  const [recentDaycareFavs, setRecentDaycareFavs] = React.useState([]);
  const [recentPlaceFavs, setRecentPlaceFavs] = React.useState([]);
  const [recentScraps, setRecentScraps] = React.useState([]);
  const [recentNotifications, setRecentNotifications] = React.useState([]);

  const fetchRecentActivity = React.useCallback(async () => {
    if (!session) return;
    try {
      // Fetch all favorites and split by type
      const { data: allFavs } = await supabase
        .from('daycare_favorites')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (allFavs) {
        const daycareList = allFavs.filter(f => f.metadata?.type !== 'RECOMMENDED').slice(0, 3);
        const placeList = allFavs.filter(f => f.metadata?.type === 'RECOMMENDED').slice(0, 3);
        
        setRecentDaycareFavs(daycareList.map(f => f.metadata));
        setRecentPlaceFavs(placeList.map(f => f.metadata));
      }

      // Fetch top 3 job favorites/scraps
      const { data: scraps } = await supabase
        .from('job_favorites')
        .select('*, job_offers(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (scraps) setRecentScraps(scraps.map(s => s.job_snapshot || s.job_offers));

      // Fetch latest 3 notifications (new comments on my posts) - ONLY if enabled
      if (settings.community) {
        const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', session.user.id);
        if (myPosts && myPosts.length > 0) {
          const myPostIds = myPosts.map(p => p.id);
          const { data: notis } = await supabase.from('post_comments')
            .select('id, content, created_at, profiles(nickname), post_id')
            .in('post_id', myPostIds)
            .neq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (notis) setRecentNotifications(notis.map(n => ({
            id: n.id,
            title: '내 게시글에 새로운 댓글이 달렸습니다.',
            body: n.content,
            date: n.created_at,
            author: n.profiles?.nickname,
            targetId: n.post_id
          })));
        } else {
          setRecentNotifications([]);
        }
      }
    } catch (e) {
      console.warn('Drawer fetch fail', e);
    }
  }, [session, settings.community]);

  React.useEffect(() => {
    if (session) {
      fetchRecentActivity();
    }
  }, [session, isFocused, fetchRecentActivity]);

  const handleLogout = async () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '로그아웃', 
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.closeDrawer();
          } 
        }
      ]
    );
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* User Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: isDarkMode ? colors.card : '#F8FAFC', borderBottomColor: colors.border }]}>
        {session ? (
          <TouchableOpacity 
            style={styles.profileInfo}
            onPress={() => navigation.navigate('MyPage')}
          >
            <View style={styles.userInfo}>
              <Text style={[styles.nickname, { color: colors.text }]}>{profile?.nickname || '사용자'}님</Text>
                <View style={[
                  styles.userTypeBadge, 
                  { 
                    backgroundColor: (profile?.user_type === '선생님' || profile?.user_type === '관리자') 
                      ? (isDarkMode ? '#4A6CF720' : '#EEF2FF') 
                      : (isDarkMode ? `${colors.primary}20` : `${colors.primary}10`),
                    borderColor: (profile?.user_type === '선생님' || profile?.user_type === '관리자') ? '#4A6CF740' : `${colors.primary}40`
                  }
                ]}>
                  <Text style={[styles.userTypeBadgeText, { 
                    color: (profile?.user_type === '선생님' || profile?.user_type === '관리자') ? '#4A6CF7' : colors.primary 
                  }]}>
                    {profile?.user_type || '학부모'}
                  </Text>
                </View>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.loginPrompt}
            onPress={() => navigation.navigate('Login')}
          >
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
              <User size={30} color={colors.textMuted} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.loginText, { color: colors.text }]}>로그인 해주세요</Text>
              <Text style={[styles.loginSubText, { color: colors.textMuted }]}>더 많은 기능을 이용해 보세요</Text>
            </View>
            <View style={[styles.loginBtn, { backgroundColor: colors.primary }]}>
              <LogIn size={16} color="#fff" />
              <Text style={styles.loginBtnText}>로그인</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerItems}>
        {/* Favorites and Scraps Section */}
        {session && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Heart size={16} color={colors.primary} fill={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>즐겨찾는 어린이집</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'ListTab', params: { tab: 'fav' } })}>
                  <Text style={[styles.moreText, { color: colors.primary }]}>더보기</Text>
                </TouchableOpacity>
              </View>
              {recentDaycareFavs.length > 0 ? (
                recentDaycareFavs.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('Detail', { daycare: item })}
                  >
                    <Text style={[styles.miniCardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.miniCardSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.addr}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptyActivity, { backgroundColor: colors.card, color: colors.textMuted }]}>즐겨찾기한 어린이집이 없습니다.</Text>
              )}
            </View>

            {/* Custom Content based on User Role */}
            {(profile?.user_type === '보육교사' || profile?.user_type === '선생님') ? (
              // Teacher: Scrapped Jobs
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Bookmark size={16} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>스크랩된 모집공고</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('FavoriteJobs')}>
                    <Text style={[styles.moreText, { color: colors.primary }]}>더보기</Text>
                  </TouchableOpacity>
                </View>
                {recentScraps.length > 0 ? (
                  recentScraps.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
                    >
                      <Text style={[styles.miniCardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.miniCardSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.center_name}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.emptyActivity, { backgroundColor: colors.card, color: colors.textMuted }]}>스크랩한 내역이 없습니다.</Text>
                )}
              </View>
            ) : (
              // Parent/Guest: Favorite Places
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Star size={16} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>즐겨찾는 장소</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'MapTab', params: { screen: 'Map', params: { mode: 'RECOMMENDED' } } })}>
                    <Text style={[styles.moreText, { color: colors.primary }]}>더보기</Text>
                  </TouchableOpacity>
                </View>
                {recentPlaceFavs.length > 0 ? (
                  recentPlaceFavs.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => navigation.navigate('PlaceDetail', { place: { ...item, id: item.id || item.contentid } })}
                    >
                      <Text style={[styles.miniCardTitle, { color: colors.text }]} numberOfLines={1}>{item.name || item.title}</Text>
                      <Text style={[styles.miniCardSub, { color: colors.textSecondary }]} numberOfLines={1}>{item.addr}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={[styles.emptyActivity, { backgroundColor: colors.card, color: colors.textMuted }]}>즐겨찾기한 장소가 없습니다.</Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Bell size={16} color={colors.primary} fill={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>최신 알림</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={[styles.moreText, { color: colors.primary }]}>더보기</Text>
            </TouchableOpacity>
          </View>
          {session ? (
            !settings.community ? (
              <Text style={[styles.emptyActivity, { backgroundColor: colors.card, color: colors.textMuted }]}>커뮤니티 알림 설정이 꺼져 있습니다.</Text>
            ) : recentNotifications.length > 0 ? (
              recentNotifications.map((noti, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('PostDetail', { postId: noti.targetId })}
                >
                  <Text style={[styles.miniCardTitle, { color: colors.text }]} numberOfLines={1}>{noti.title}</Text>
                  <Text style={[styles.miniCardSub, { color: colors.textSecondary }]} numberOfLines={1}>{noti.body}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.emptyActivity, { backgroundColor: colors.card, color: colors.textMuted }]}>새로운 알림이 없습니다.</Text>
            )
          ) : (
            <TouchableOpacity 
              style={[styles.miniCard, { backgroundColor: colors.card, borderColor: colors.border, borderStyle: 'dashed' }]}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={[styles.emptyActivity, { backgroundColor: 'transparent', color: colors.textMuted, fontStyle: 'normal' }]}>로그인하고 알림을 확인하세요</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Section */}
        <View style={styles.section}>
          {/* Notifications moved to section above */}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.menuIcon}><Settings size={20} color={colors.textSecondary} /></View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>설정</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Footer / Logout */}
      {session && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profileSection: {
    padding: 24,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#75BA57',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  userTypeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  loginSubText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#75BA57',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  drawerItems: {
    paddingTop: 0,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: -0.2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
  },
  menuLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingRight: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  miniCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  miniCardSub: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyActivity: {
    fontSize: 12,
    color: '#94A3B8',
    padding: 12,
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    fontStyle: 'italic',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EF4444',
  },
});
