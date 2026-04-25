import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, List, Star, PenTool, CheckCircle, ChevronRight, Info, MessageSquare, Briefcase, TrendingUp, Eye, ThumbsUp, Users, Heart, Search, User, AlertTriangle, Sun, Cloud, CloudRain, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomeData } from '../services/homeService';
import { diseaseService } from '../services/diseaseService';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator } from 'react-native';
import AdBanner from '../components/AdBanner';
import KindergartenLoader from '../components/KindergartenLoader';
import { weatherService } from '../services/weatherService';
import * as SplashScreen from 'expo-splash-screen';

const { width } = Dimensions.get('window');

const COOLDOWN = 5 * 60 * 1000; // 5 minutes

/* eslint-disable no-undef */
const MASCOTS = {
  weather: require('../../assets/pictogram_weather.png'),
  '수족구병': require('../../assets/pictogram_hfmd.png'),
  '독감': require('../../assets/pictogram_flu.png'),
  '수두': require('../../assets/pictogram_chickenpox.png'),
  '백일해': require('../../assets/pictogram_pertussis.png'),
};
/* eslint-enable no-undef */

export default function HomeScreen({ navigation }) {
  const { profile } = useAuth();
  const { filteredDaycares, favorites } = useSearch();
  const { colors } = useTheme();
  const [data, setData] = React.useState({ 
    popularReviews: [],
    recentReviews: [], 
    recentJobs: [],
    recommendedPlaces: [],
    stats: { reviewCount: 0, userCount: 0, postCount: 0 }
  });
  const [loading, setLoading] = React.useState(true);
  const [advisories, setAdvisories] = useState([]);
  const [weather, setWeather] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const COOLDOWN = 5 * 60 * 1000; // 5 minutes

  const fetchHomeContent = React.useCallback(async (forceLoading = false) => {
    // Only show loading indicator if explicitly forced OR if we have no crucial data
    const shouldShowLoader = forceLoading || !data.recentReviews.length;
    if (shouldShowLoader) {
      setLoading(true);
    }

    // Check cooldown unless forced
    const now = Date.now();
    if (!forceLoading && lastFetchTime && (now - lastFetchTime < COOLDOWN)) {
      setLoading(false);
      return;
    }

    try {
      // 1. Instantly hide splash screen if it's the first load
      // This allows the user to see the KindergartenLoader instead of a frozen splash
      if (!initialLoadDone) {
        SplashScreen.hideAsync().catch(() => {});
        setInitialLoadDone(true);
      }

      const [homeResult, diseaseResult, weatherResult] = await Promise.all([
        getHomeData(profile?.user_type),
        diseaseService.getLatestAdvisories(),
        weatherService.getOutdoorPlayIndex()
      ]);
      setData(homeResult);
      setAdvisories(diseaseResult || []);
      setWeather(weatherResult);
      setLastFetchTime(now);
    } catch (error) {
      console.error('Home content fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_type, initialLoadDone, lastFetchTime, data.recentReviews.length]);

  useFocusEffect(
    React.useCallback(() => {
      // Use background fetch (no loader) if we already have data
      fetchHomeContent(false);
    }, [fetchHomeContent])
  );

  const handleReviewClick = (review) => {
    if (review.center_type === 'RECOMMENDED') {
      navigation.navigate('PlaceDetail', { 
        place: {
          id: review.center_id,
          title: review.center_name,
          addr: review.center_addr,
          type: review.center_type
        }
      });
      return;
    }

    const foundInSearch = filteredDaycares.find(d => d.stcode === review.center_id);
    const foundInFavs = favorites.find(f => f.daycare_id === review.center_id)?.metadata;
    const fullDaycare = foundInSearch || foundInFavs;

    navigation.navigate('Detail', { 
      daycare: fullDaycare || { 
        stcode: review.center_id, 
        name: review.center_name || '어린이집',
        addr: review.center_addr || '',
        type: review.center_type || '기타',
        arcode: review.center_arcode || (review.center_id ? review.center_id.substring(0, 5) : '')
      },
      targetReviewId: review.id 
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* SECTION A: Unified Safety Dashboard (Single Card) */}
        <View style={{ marginTop: 24, paddingHorizontal: 24 }}>
          <View style={[styles.unifiedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.unifiedHeader}>
              <Text style={[styles.unifiedTitle, { color: colors.text }]}>오늘의 우리동네 안심 정보</Text>
              <TouchableOpacity onPress={() => navigation.navigate('DiseaseDetail', { diseaseName: '수족구병' })}>
                 <Info size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Weather Row */}
            <View style={styles.weatherRow}>
               <View style={styles.weatherLeft}>
                 <View style={[styles.weatherIconCircle, { backgroundColor: colors.background }]}>
                   {(() => {
                     const desc = weather?.weatherDesc || '';
                     if (desc.includes('비') || desc.includes('강수')) return <CloudRain size={32} color={colors.text} />;
                     if (desc.includes('흐림')) return <Cloud size={32} color={colors.text} />;
                     return <Sun size={32} color="#F59E0B" />;
                   })()}
                 </View>
                 <Text style={[styles.unifiedTempText, { color: colors.text }]}>{weather ? Math.round(weather.temp) : '--'}°</Text>
               </View>
               <View style={styles.weatherRight}>
                 <View style={[styles.statusBadge, { backgroundColor: (weather?.status === 'danger' ? '#EF4444' : (weather?.status === 'caution' ? '#F59E0B' : '#10B981')) + '15' }]}>
                   <Text style={[styles.statusBadgeText, { color: (weather?.status === 'danger' ? '#EF4444' : (weather?.status === 'caution' ? '#F59E0B' : '#10B981')) }]}>
                     {weather ? (weather.status === 'safe' ? '외출 최적' : (weather.status === 'caution' ? '외출 주의' : '실내 권장')) : '로딩중...'}
                   </Text>
                 </View>
                 <Text style={[styles.weatherDescText, { color: colors.text }]}>{weather?.label || '날씨 정보를 불러오는 중...'}</Text>
                 <Text style={[styles.weatherSubText, { color: colors.textSecondary }]}>
                    {weather ? (
                      <>
                        미세먼지 <Text style={{ color: weather.pm10Color, fontWeight: '900' }}>{weather.pm10Grade}</Text>
                        {weather.subText.split(weather.pm10Grade)[1] || ''}
                      </>
                    ) : (
                      '미세먼지 정보 포함'
                    )}
                  </Text>
               </View>
            </View>

            <View style={[styles.unifiedDivider, { backgroundColor: colors.border }]} />

            <View style={[styles.diseaseGrid, { flexWrap: 'wrap', rowGap: 16, justifyContent: 'center' }]}>
              {(() => {
                const dangerList = advisories.filter(a => a.status === 'danger' || a.status === 'caution');
                const statusOrder = { 'danger': 0, 'caution': 1 };
                const sorted = [...dangerList].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                const displayList = isExpanded ? sorted : sorted.slice(0, 4);
                const itemWidth = (width - 48 - 40 - 45) / 4;

                if (sorted.length === 0) {
                  return (
                    <View style={styles.allClearContainer}>
                      <ShieldCheck size={32} color="#10B981" />
                      <Text style={styles.allClearText}>현재 우리동네는 모든 감염병으로부터 안전합니다.</Text>
                    </View>
                  );
                }

                return displayList.map(adv => {
                  const { disease_name: name, status } = adv;
                  const statusColor = status === 'danger' ? '#EF4444' : (status === 'caution' ? '#F59E0B' : '#10B981');
                  
                  return (
                    <TouchableOpacity 
                      key={name} 
                      style={[styles.diseaseItem, { width: itemWidth }]}
                      onPress={() => navigation.navigate('DiseaseDetail', { 
                        diseaseName: name, 
                        status,
                        initialAdvisories: advisories 
                      })}
                    >
                      <View style={[styles.diseaseIconCircle, { backgroundColor: status === 'safe' ? '#10B98120' : '#EF444420', borderColor: statusColor + '40' }]}>
                        {status === 'safe' ? (
                          <ShieldCheck size={20} color="#10B981" />
                        ) : (
                          <AlertTriangle size={20} color={statusColor} />
                        )}
                      </View>
                      <Text style={[styles.diseaseItemName, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{name}</Text>
                      <Text style={[styles.diseaseItemStatus, { color: statusColor }]}>{status === 'danger' ? '경보' : (status === 'caution' ? '주의' : '안전')}</Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>

            {advisories.filter(a => a.status === 'danger' || a.status === 'caution').length > 4 && (
              <TouchableOpacity 
                onPress={() => setIsExpanded(!isExpanded)}
                style={[styles.moreButton, { borderTopColor: colors.border }]}
              >
                <Text style={[styles.moreButtonText, { color: colors.textSecondary }]}>{isExpanded ? '접기' : `더보기 (${advisories.filter(a => a.status === 'danger' || a.status === 'caution').length - 4}+)`}</Text>
                <ChevronRight size={16} color={colors.textSecondary} style={{ transform: [{ rotate: isExpanded ? '270deg' : '90deg' }] }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <KindergartenLoader text="꿀정보를 불러오는 중" />
        ) : (
          <View>
            <View style={styles.sectionDivider} />

            {/* SECTION B: Real-time Popular Posts Top 3 (Vertical List) */}
            <View style={[styles.popularListCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.sectionHeader, { paddingHorizontal: 16, paddingTop: 12, marginBottom: 8 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 지금 뜨는 인기글</Text>
                <TouchableOpacity onPress={() => navigation.navigate('CommunityTab')}>
                  <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>전체보기</Text>
                </TouchableOpacity>
              </View>
              {data.popularPosts.slice(0, 3).map((post, idx) => (
                <TouchableOpacity 
                   key={post.id} 
                   style={[styles.popularListItem, idx < 2 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                   onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                >
                  <View style={styles.popularRankWrapper}>
                    <Text style={[styles.popularRankText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.popularPostTitle, { color: colors.text }]} numberOfLines={1}>{post.title}</Text>
                    <View style={styles.popularMetaRow}>
                      <Text style={[styles.popularMetaText, { color: colors.textMuted }]}>
                        {post.profiles?.user_type || post.category_type || post.type} • {post.author}
                      </Text>
                      <View style={styles.popularIconRow}>
                        <MessageSquare size={12} color={colors.textMuted} />
                        <Text style={[styles.popularCountText, { color: colors.textMuted }]}>{post.post_comments?.[0]?.count || 0}</Text>
                        <Heart size={12} color="#EF4444" style={{ marginLeft: 8 }} />
                        <Text style={[styles.popularCountText, { color: colors.textMuted }]}>{post.upvotes || 0}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionDivider} />
            <AdBanner style={{ marginVertical: 0 }} />
            <View style={styles.sectionDivider} />

            {/* SECTION C: Real-time Reviews Carousel (Horizontal Swipe) */}
            <View style={[styles.sectionContainerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.sectionHeader, { paddingHorizontal: 20, paddingTop: 20, marginBottom: 12 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>⭐ 방금 올라온 생생 후기</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.72} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              {data.recentReviews.map((review) => (
                <TouchableOpacity 
                  key={review.id} 
                  style={[styles.reviewCarouselCard, { backgroundColor: colors.card, borderColor: colors.border, width: width * 0.7 }]}
                  onPress={() => handleReviewClick(review)}
                >
                  <View style={styles.reviewCardHeader}>
                    <View style={styles.starsRow}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={14} color={s <= review.rating ? "#FACC15" : colors.border} fill={s <= review.rating ? "#FACC15" : "transparent"} />)}
                      <Text style={[styles.reviewRatingText, { color: colors.text }]}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={[styles.reviewCenterName, { color: colors.text }]} numberOfLines={1}>{review.center_name}</Text>
                  <Text style={[styles.reviewContentMini, { color: colors.textSecondary }]} numberOfLines={2}>"{review.content}"</Text>
                </TouchableOpacity>
              ))}
              </ScrollView>
            </View>

            <View style={styles.sectionDivider} />
            <AdBanner style={{ marginVertical: 0 }} />
            <View style={styles.sectionDivider} />

            {/* SECTION D: Tailored Content (Jobs for Teachers, Places for Parents) */}
            <View style={[styles.sectionContainerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(!profile || (profile.user_type !== '선생님' && profile.user_type !== '보육교사')) ? (
                // Recommended Places for Parents/Guests
                <>
                  <View style={[styles.sectionHeader, { paddingHorizontal: 20, paddingTop: 20, marginBottom: 12 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🎈 아이와 가볼만한 곳</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('MapTab', { screen: 'Map', params: { mode: 'RECOMMENDED' } })}>
                      <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>내 주변</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.72} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
                  {data.recommendedPlaces.map((place) => (
                    <TouchableOpacity 
                      key={place.center_id} 
                      style={[styles.placeCarouselCard, { backgroundColor: colors.card, borderColor: colors.border, width: width * 0.7 }]}
                      onPress={() => navigation.navigate('PlaceDetail', { 
                        place: { id: place.center_id, title: place.center_name, addr: place.center_addr, type: 'RECOMMENDED', lat: place.lat, lng: place.lng, image: place.image } 
                      })}
                    >
                      {place.image ? (
                        <Image 
                          source={{ uri: place.image }} 
                          style={styles.placeCardImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={{ padding: 16 }}>
                        <View style={styles.jobCardTop}>
                          <Text style={[styles.jobCenterName, { color: colors.text }]} numberOfLines={1}>{place.center_name}</Text>
                          <View style={[styles.dDayBadge, { backgroundColor: colors.primary + '20' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <Star size={10} color={colors.primary} fill={colors.primary} />
                              <Text style={[styles.dDayText, { color: colors.primary }]}>{place.rating || '5.0'}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={[styles.jobRegionBold, { color: colors.text }]} numberOfLines={1}>{place.center_addr || '아이와 함께하기 좋은 곳'}</Text>
                        <Text style={[styles.jobTitleMini, { color: colors.textSecondary }]} numberOfLines={1}>방문객들이 추천하는 핫플레이스</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  </ScrollView>
                </>
              ) : (
                // Job Offers for Teachers
                <>
                  <View style={[styles.sectionHeader, { paddingHorizontal: 20, paddingTop: 20, marginBottom: 12 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>🏃‍♀️ 마감 임박! 내 주변 교직원 모집</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('JobsTab')}>
                      <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>전체보기</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width * 0.72} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
                  {data.recentJobs.map((job) => {
                    const dDay = Math.floor((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    const dDayColor = dDay <= 3 ? '#EF4444' : (dDay <= 7 ? '#F59E0B' : '#10B981');
                    
                    return (
                      <TouchableOpacity 
                        key={job.id} 
                        style={[styles.jobCarouselCard, { backgroundColor: colors.card, borderColor: colors.border, width: width * 0.7 }]}
                        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                      >
                        <View style={styles.jobCardTop}>
                          <Text style={[styles.jobCenterName, { color: colors.text }]} numberOfLines={1}>{job.center_name}</Text>
                          {job.deadline && (
                            <View style={[styles.dDayBadge, { backgroundColor: dDayColor + '20' }]}>
                              <Text style={[styles.dDayText, { color: dDayColor }]}>D-{dDay < 0 ? 'Day' : dDay}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.jobRegionBold, { color: colors.text }]} numberOfLines={1}>{job.location?.split(' ')[1] || '지역'} • {job.job_type}</Text>
                        <Text style={[styles.jobTitleMini, { color: colors.textSecondary }]} numberOfLines={1}>{job.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  </ScrollView>
                </>
              )}
            </View>

            <View style={{ height: 40 }} />

            {!profile && (
              <TouchableOpacity 
                style={[styles.loginBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                onPress={() => navigation.navigate('Login')}
              >
                <View style={styles.loginBannerText}>
                  <Text style={[styles.loginBannerTitle, { color: colors.text }]}>더 많은 정보를 원하시나요?</Text>
                  <Text style={[styles.loginBannerSub, { color: colors.primary }]}>로그인하고 우리동네 어린이집 순위를 확인하세요</Text>
                </View>
                <View style={[styles.loginBtn, { backgroundColor: colors.primary }]}>
                  <Text style={styles.loginBtnText}>로그인</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 0 },
  inlineHeader: { paddingHorizontal: 24, paddingBottom: 8 },
  brandText: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },

  sectionDivider: { height: 24 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '900' },
  
  loginBanner: { marginHorizontal: 24, padding: 20, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  loginBannerText: { flex: 1, gap: 4 },
  loginBannerTitle: { fontSize: 15, fontWeight: '900' },
  loginBannerSub: { fontSize: 12, fontWeight: '600' },
  loginBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  loginBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  
  // Card News styles
  newsCard: { padding: 24, borderRadius: 32, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  newsTopRow: { marginBottom: 12 },
  newsTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', lineHeight: 28 },
  newsTagRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  newsTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  newsTagText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  newsImageArea: { height: 160, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden', position: 'relative' },
  weatherFloatBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  weatherLargeIcon: { alignItems: 'center' },
  tempText: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: -10 },
  diseaseLargeIcon: { },
  newsFooter: { marginBottom: 16 },
  newsDescription: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, fontWeight: '500', marginBottom: 12 },
  readMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  newsProgress: { height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' },
  newsProgressBar: { height: '100%', borderRadius: 1 },

  // Modular Popular List
  popularListCard: { marginHorizontal: 24, backgroundColor: '#FFF', borderRadius: 28, padding: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionContainerBox: { marginHorizontal: 24, borderRadius: 28, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
  popularListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  popularRankWrapper: { width: 24, alignItems: 'center' },
  popularRankText: { fontSize: 18, fontWeight: '900', fontStyle: 'italic' },
  popularPostTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  popularMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  popularMetaText: { fontSize: 11, fontWeight: '600' },
  popularIconRow: { flexDirection: 'row', alignItems: 'center' },
  popularCountText: { fontSize: 11, fontWeight: '700', marginLeft: 3 },
  viewAllText: { fontSize: 13, fontWeight: '700' },

  // Carousel Cards
  reviewCarouselCard: { padding: 20, borderRadius: 28, borderWidth: 1, gap: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  reviewCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewRatingText: { fontSize: 13, fontWeight: '800', marginLeft: 4 },
  reviewCenterName: { fontSize: 15, fontWeight: '900' },
  reviewContentMini: { fontSize: 13, fontWeight: '500', lineHeight: 18, fontStyle: 'italic' },

  jobCarouselCard: { padding: 20, borderRadius: 28, borderWidth: 1, gap: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
  jobCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  jobCenterName: { flex: 1, fontSize: 15, fontWeight: '900' },
  dDayBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dDayText: { fontSize: 10, fontWeight: '900' },
  jobRegionBold: { fontSize: 13, fontWeight: '800' },
  jobTitleMini: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
  placeCarouselCard: { borderRadius: 28, borderWidth: 1, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, overflow: 'hidden' },
  placeCardImage: { width: '100%', height: 120 },

  // Unified Dashboard Styles
  unifiedCard: { padding: 20, borderRadius: 28, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  unifiedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  unifiedTitle: { fontSize: 16, fontWeight: '900' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  weatherLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  unifiedTempText: { fontSize: 32, fontWeight: '900' },
  weatherRight: { flex: 1, gap: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '900' },
  weatherDescText: { fontSize: 14, fontWeight: '800' },
  weatherSubText: { fontSize: 12, fontWeight: '600' },
  unifiedDivider: { height: 1, marginBottom: 20 },
  diseaseGrid: { flexDirection: 'row', gap: 12 },
  diseaseItem: { alignItems: 'center' },
  diseaseIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.02)', borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  diseaseItemName: { fontSize: 11, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  diseaseItemStatus: { fontSize: 10, fontWeight: '900' },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  allClearContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  allClearText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
});
