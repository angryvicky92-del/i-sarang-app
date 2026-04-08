import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking, Share, Platform, TextInput, Alert, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getPlaceDetail } from '../services/tourismService';
import { getReviews, createReview, deleteReview } from '../services/reviewService';
import { getMyVotes } from '../services/engagementService';
import { ChevronLeft, MapPin, Phone, Globe, Share2, Star, MessageSquare, Send, Edit2, Trash2, X, Star as StarIcon, LogIn, Heart, Info, Clock, Baby, Users, PhoneCall, Calendar, Wallet, Navigation } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useSearch } from '../contexts/SearchContext';
import { PLACE_TYPE_COLORS } from '../services/dataService';
import { WebView } from 'react-native-webview';
import EngagementButtons from '../components/EngagementButtons';
import UserActionModal from '../components/UserActionModal';
import { getOrCreateChat } from '../services/chatService';

const KAKAO_JS_KEY = 'dc33fe7753b02b59868630ccbfd7b820';

export default function PlaceDetailScreen({ route, navigation }) {
  const { place } = route.params;
  const { colors, isDarkMode } = useTheme();
  const { profile: user } = useAuth();
  const { isFavorited, toggleFavorite } = useSearch();
  
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [visitorAvg, setVisitorAvg] = useState('0.0');
  const [userReviewVotes, setUserReviewVotes] = useState({});

  // Review Input State
  const [newReviewContent, setNewReviewContent] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Edit Review State
  const [isEditingReviewId, setIsEditingReviewId] = useState(null);
  const [editReviewContent, setEditReviewContent] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);

  // Chat Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Ref for star interaction
  const ratingStateRef = useRef({ isEditingReviewId, editReviewRating, newReviewRating });
  useEffect(() => {
    ratingStateRef.current = { isEditingReviewId, editReviewRating, newReviewRating };
  }, [isEditingReviewId, editReviewRating, newReviewRating]);

  // Star Rating PanResponder
  const ratingPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 5,
      onPanResponderGrant: (evt) => {
        const { isEditingReviewId } = ratingStateRef.current;
        const x = evt.nativeEvent.locationX;
        const totalWidth = 160; // 5 stars * 32px
        let rating = Math.ceil((x / totalWidth) * 10) / 2;
        rating = Math.max(0.5, Math.min(5, rating));
        if (isEditingReviewId) setEditReviewRating(rating);
        else setNewReviewRating(rating);
      },
      onPanResponderMove: (evt) => {
        const { isEditingReviewId } = ratingStateRef.current;
        const x = evt.nativeEvent.locationX;
        const totalWidth = 160;
        let rating = Math.ceil((x / totalWidth) * 10) / 2;
        rating = Math.max(0.5, Math.min(5, rating));
        if (isEditingReviewId) setEditReviewRating(rating);
        else setNewReviewRating(rating);
      }
    })
  ).current;

  const fetchPlaceReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const data = await getReviews(place.id, user?.id);
      setReviews(data || []);
      
      // Calculate single average
      if (data && data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        setVisitorAvg((sum / data.length).toFixed(1));
        
        if (user) {
          const votes = await getMyVotes('review', data.map(r => r.id), user.id);
          setUserReviewVotes(votes);
        }
      } else {
        setVisitorAvg('0.0');
      }
    } catch (err) {
      console.warn('Failed to fetch reviews', err);
    } finally {
      setReviewsLoading(false);
    }
  }, [place.id, user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Detail from Tourism API
      const detailData = await getPlaceDetail(place.id, place);
      if (detailData) {
        setDetail(detailData);
      }

      // 2. Fetch Reviews & Averages
      await fetchPlaceReviews();
    } catch (err) {
      console.error('Fetch place detail fail', err);
    } finally {
      setLoading(false);
    }
  }, [place, fetchPlaceReviews]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReviewSubmit = async () => {
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (!newReviewContent.trim()) {
      Alert.alert('알림', '내용을 입력해 주세요.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        user_id: user.id,
        center_id: place.id,
        rating: newReviewRating,
        content: newReviewContent.trim(),
        center_name: place.title,
        center_addr: place.addr,
        center_type: 'RECOMMENDED'
      };

      const result = await createReview(reviewData);
      if (result) {
        setNewReviewContent('');
        setNewReviewRating(5);
        fetchPlaceReviews();
      }
    } catch {
      Alert.alert('오류', '후기 등록에 실패했습니다.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = (reviewId) => {
    Alert.alert('후기 삭제', '삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '삭제', 
        style: 'destructive', 
        onPress: async () => {
          const success = await deleteReview(reviewId);
          if (success) fetchPlaceReviews();
        } 
      }
    ]);
  };

  const handleUpdateReview = async (reviewId) => {
    if (!editReviewContent.trim()) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ content: editReviewContent.trim(), rating: editReviewRating })
        .eq('id', reviewId);
      if (error) throw error;
      setIsEditingReviewId(null);
      fetchPlaceReviews();
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    }
  };

  const startEditingReview = (review) => {
    setEditReviewRating(review.rating);
  };

  const handleNicknameClick = (id, nickname, type) => {
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (id === user.id) return; // Don't chat with self

    setSelectedUser({ id, nickname, userType: type });
    setIsModalVisible(true);
  };

  const startChat = useCallback(async () => {
    if (!selectedUser) return;
    try {
      const chatId = await getOrCreateChat(user.id, selectedUser.id);
      if (chatId) {
        navigation.navigate('ChatRoom', { chatId, otherUser: selectedUser });
      }
    } catch {
      Alert.alert('오류', '채팅방을 여는 중 문제가 발생했습니다.');
    }
  }, [selectedUser, user?.id, navigation]);

  const displayData = detail || place;

  const roadviewHtml = useMemo(() => {
    const lat = displayData.lat;
    const lng = displayData.lng;
    if (!lat || !lng) return '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #eee; }
          #roadview { width: 100%; height: 100%; }
        </style>
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
      </head>
      <body>
        <div id="roadview"></div>
        <script>
          var rvContainer = document.getElementById('roadview');
          var rv = new kakao.maps.Roadview(rvContainer);
          var rvClient = new kakao.maps.RoadviewClient();
          var position = new kakao.maps.LatLng(${lat}, ${lng});

          rvClient.getNearestPanoId(position, 50, function(panoId) {
              if (panoId) {
                  rv.setPanoId(panoId, position);
              } else {
                  rvContainer.innerHTML = '<div style="display:flex;justify:center;align:center;height:100%;flex-direction:column;font-weight:bold;color:#666;font-size:14px;padding:20px;text-align:center;">근처 로드뷰 정보가 없습니다</div>';
              }
          });
        </script>
      </body>
      </html>
    `;
  }, [displayData.lat, displayData.lng]);

  const mapHtml = useMemo(() => {
    const lat = displayData.lat || 37.5665;
    const lng = displayData.lng || 126.9780;
    const color = (displayData.type in PLACE_TYPE_COLORS ? PLACE_TYPE_COLORS[displayData.type] : colors.primary);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: ${colors.background}; }
          #map { width: 100%; height: 100%; }
          ${isDarkMode ? '#map { filter: invert(90%) hue-rotate(180deg) brightness(105%) contrast(90%); } img[src*="copyright"] { filter: invert(100%) hue-rotate(180deg); }' : ''}
        </style>
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var container = document.getElementById('map');
          var center = new kakao.maps.LatLng(${lat}, ${lng});
          var map = new kakao.maps.Map(container, { center: center, level: 3 });
          
          var svg = '<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="${color}" stroke="white" stroke-width="2"/>' +
                    '<circle cx="16" cy="16" r="5" fill="white"/>' +
                    '</svg>';
          var markerImage = new kakao.maps.MarkerImage(
              'data:image/svg+xml;base64,' + btoa(svg),
              new kakao.maps.Size(32, 40),
              { offset: new kakao.maps.Point(16, 40) }
          );

          var marker = new kakao.maps.Marker({ position: center, image: markerImage });
          marker.setMap(map);
        </script>
      </body>
      </html>
    `;
  }, [displayData.lat, displayData.lng, displayData.type, isDarkMode, colors.background, colors.primary]);

  const openNavigation = () => {
    const dlat = displayData.lat;
    const dlng = displayData.lng;
    const label = encodeURIComponent(displayData.title);
    
    const url = Platform.select({
      ios: `kakaomap://look?p=${dlat},${dlng}`,
      android: `kakaomap://look?p=${dlat},${dlng}`,
    });

    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Linking.openURL(`https://map.kakao.com/link/map/${label},${dlat},${dlng}`);
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color={colors.text} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{displayData.title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.backBtn, { marginRight: 4 }]} onPress={() => toggleFavorite(place, navigation)}>
            <Heart 
              color={isFavorited(place.id) ? '#EF4444' : colors.text} 
              fill={isFavorited(place.id) ? '#EF4444' : 'transparent'} 
              size={24} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => Share.share({ message: `${displayData.title}\n${displayData.addr}` })}>
            <Share2 color={colors.text} size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {displayData.image ? (
          <Image 
            source={{ uri: displayData.image }} 
            style={styles.mainImage} 
            resizeMode="cover"
          />
        ) : (
          <View style={styles.roadviewContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: roadviewHtml }}
              style={styles.mainImage}
              scrollEnabled={false}
              javaScriptEnabled={true}
            />
            <View style={styles.roadviewBadge}>
              <Text style={styles.roadviewBadgeText}>로드뷰</Text>
            </View>
          </View>
        )}

        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <View style={styles.titleSection}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={[styles.badge, { backgroundColor: (displayData.type in PLACE_TYPE_COLORS ? PLACE_TYPE_COLORS[displayData.type] : colors.primary), borderColor: 'transparent' }]}>
                <Text style={[styles.badgeText, { color: '#FFF' }]}>{displayData.type}</Text>
              </View>
              {displayData.isKidsFriendly && !['키즈카페', '공원/자연', '문화/전시', '놀이/레저'].includes(displayData.type) && (
                <View style={[styles.badge, { backgroundColor: '#FCE7F3', borderColor: 'transparent' }]}>
                  <Text style={[styles.badgeText, { color: '#DB2777' }]}>🍭 아이 추천</Text>
                </View>
              )}
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{displayData.title}</Text>
            <View style={styles.ratingRow}>
              <Star size={18} color="#FACC15" fill="#FACC15" />
              <Text style={[styles.ratingText, { color: colors.text }]}>{visitorAvg}</Text>
              <Text style={{ color: colors.textSecondary, marginLeft: 4 }}>({reviews.length}개의 후기)</Text>
            </View>
          </View>

          <View style={[styles.infoGrid, { borderTopColor: colors.border }]}>
            <View style={styles.infoRow}>
              <MapPin size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{displayData.addr}</Text>
            </View>
            
            {displayData.tel && displayData.tel !== '-' && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${displayData.tel}`)}>
                <Phone size={20} color={colors.primary} />
                <Text style={[styles.infoLink, { color: colors.primary }]}>{displayData.tel}</Text>
              </TouchableOpacity>
            )}

            {displayData.homepage && (
              <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(displayData.homepage)}>
                <Globe size={20} color={colors.primary} />
                <Text style={[styles.infoLink, { color: colors.primary }]} numberOfLines={1}>웹사이트 방문</Text>
              </TouchableOpacity>
            )}

            {displayData.bizStatus && (
              <View style={styles.infoRow}>
                <Info size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  상태: <Text style={{fontWeight: 'bold', color: displayData.bizStatus === '정상' ? '#10B981' : colors.text}}>{displayData.bizStatus}</Text>
                </Text>
              </View>
            )}

            {/* Map Section */}
            <View style={[styles.mapBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={{ flex: 1 }}
                scrollEnabled={true}
                javaScriptEnabled={true}
              />
            </View>
            <TouchableOpacity 
              style={[styles.mapActionBtn, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }]} 
              onPress={openNavigation}
            >
              <Navigation size={16} color={colors.primary} />
              <Text style={[styles.mapActionText, { color: colors.text }]}>카카오맵 열기</Text>
            </TouchableOpacity>
          </View>

          {/* Integrated Detailed Info Section (Blended Metadata + Overview) */}
          {(displayData.usetime || displayData.restdate || displayData.parking || displayData.babycarriage || displayData.expagerange || displayData.usefee || displayData.overview) && (
            <View style={[styles.section, { borderTopColor: colors.border, marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>시설 상세 정보</Text>
              
              {/* Usage Summary Grid - Masonry-lite (Two Columns) */}
              <View style={styles.usageStatsGrid}>
                {/* Left Column */}
                <View style={styles.usageColumn}>
                  {displayData.usetime && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Clock size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>이용시간</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.usetime.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                  {displayData.parking && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <MapPin size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>주차시설</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.parking.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                  {displayData.expagerange && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Users size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>권장연령</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.expagerange.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                  {displayData.infocenter && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <PhoneCall size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>문의처</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.infocenter.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Right Column */}
                <View style={styles.usageColumn}>
                  {displayData.restdate && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Calendar size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>쉬는날</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.restdate.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                  {displayData.usefee && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Wallet size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>이용요금</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.usefee.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                  {displayData.babycarriage && (
                    <View style={styles.usageStatItem}>
                      <View style={[styles.statIconBox, { backgroundColor: colors.primary + '15' }]}>
                        <Baby size={16} color={colors.primary} />
                      </View>
                      <View style={styles.statTextBox}>
                        <Text style={[styles.statLabel, { color: colors.textMuted }]}>유모차</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{displayData.babycarriage.replace(/<[^>]*>/g, '')}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {displayData.overview ? (
                <View style={[styles.overviewBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                  <Text style={[styles.overviewText, { color: colors.textSecondary }]}>
                    {displayData.overview.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={[styles.reviewSection, { backgroundColor: colors.card }]}>
          <View style={styles.reviewMainHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MessageSquare size={20} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>방문 후기</Text>
            </View>
            <Text style={[styles.reviewCountText, { color: colors.textSecondary }]}>총 {reviews.length}건</Text>
          </View>

          {/* Review Input Section */}
          {!user ? (
            <View style={[styles.loginPromptBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <LogIn size={20} color={colors.textSecondary} />
              <Text style={[styles.loginPromptText, { color: colors.textSecondary }]}>후기를 남기려면 로그인이 필요합니다.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={[styles.loginLinkText, { color: colors.primary }]}>로그인하기</Text>
              </TouchableOpacity>
            </View>
          ) : reviews.some(r => r.user_id === user.id) ? (
             <View style={[styles.loginPromptBox, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', borderColor: colors.border }]}>
               <MessageSquare size={20} color={colors.textSecondary} />
               <Text style={[styles.loginPromptText, { color: colors.textSecondary }]}>이미 후기를 작성하셨습니다. (1인 1후기)</Text>
             </View>
          ) : (
            <View style={[styles.reviewInputBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.ratingSelectRow}>
                <Text style={[styles.ratingLabelSmall, { color: colors.textSecondary }]}>방문 만족도</Text>
                <View style={styles.ratingInteractionContainer} {...ratingPanResponder.panHandlers}>
                  <View style={styles.starsRowSmall} pointerEvents="none">
                    {[1, 2, 3, 4, 5].map(s => (
                      <View key={s} style={{ position: 'relative', width: 32, height: 32 }}>
                        <StarIcon size={32} color={colors.border} fill="transparent" />
                        <View style={{ position: 'absolute', top: 0, left: 0, width: newReviewRating >= s ? 32 : (newReviewRating >= s - 0.5 ? 16 : 0), overflow: 'hidden' }}>
                          <StarIcon size={32} color={colors.primary} fill={colors.primary} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={[styles.ratingValueText, { color: colors.primary }]}>{newReviewRating}점</Text>
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.reviewInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="아이와 함께한 소중한 경험을 공유해 주세요."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={newReviewContent}
                  onChangeText={setNewReviewContent}
                />
                <TouchableOpacity 
                  style={[styles.submitBtn, { backgroundColor: colors.primary }, (!newReviewContent.trim() || isSubmittingReview) && { opacity: 0.5 }]} 
                  onPress={handleReviewSubmit}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {reviewsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : reviews.length === 0 ? (
            <View style={styles.emptyReview}>
              <Text style={{ color: colors.textMuted }}>아직 작성된 후기가 없습니다.</Text>
            </View>
          ) : (
            reviews.map((item, idx) => (
              <View key={item.id} style={[styles.reviewRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={styles.reviewUserHeader}>
                  <View style={styles.userInfoSide}>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>방문객</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleNicknameClick(item.user_id, item.profiles?.nickname || '익명', '방문객')}>
                      <Text style={[styles.userNameText, { color: colors.text }]}>{item.profiles?.nickname || '익명'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.userMetaSide}>
                    <Star size={14} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.userRatingText, { color: colors.text }]}>{item.rating}</Text>
                    <Text style={[styles.dateText, { color: colors.textMuted }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    
                    {(user?.id === item.user_id) && (
                      <View style={styles.actionRow}>
                        {!isEditingReviewId || isEditingReviewId !== item.id ? (
                           <>
                             <TouchableOpacity onPress={() => startEditingReview(item)}><Edit2 size={16} color={colors.textMuted} /></TouchableOpacity>
                             <TouchableOpacity onPress={() => handleDeleteReview(item.id)}><Trash2 size={16} color={colors.textMuted} /></TouchableOpacity>
                           </>
                        ) : (
                           <TouchableOpacity onPress={() => setIsEditingReviewId(null)}><X size={16} color={colors.textMuted} /></TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {isEditingReviewId === item.id ? (
                  <View style={styles.editBox}>
                    <View style={[styles.ratingSelectRow, { marginBottom: 10 }]}>
                      <View style={styles.ratingInteractionContainer} {...ratingPanResponder.panHandlers}>
                        <View style={styles.starsRowSmall} pointerEvents="none">
                          {[1, 2, 3, 4, 5].map(s => (
                            <View key={s} style={{ position: 'relative', width: 32, height: 32 }}>
                              <StarIcon size={32} color={colors.border} fill="transparent" />
                              <View style={{ position: 'absolute', top: 0, left: 0, width: editReviewRating >= s ? 32 : (editReviewRating >= s - 0.5 ? 16 : 0), overflow: 'hidden' }}>
                                <StarIcon size={32} color={colors.primary} fill={colors.primary} />
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                      <Text style={[styles.ratingValueText, { color: colors.primary }]}>{editReviewRating}점</Text>
                    </View>
                    <TextInput
                      style={[styles.editInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                      value={editReviewContent}
                      onChangeText={setEditReviewContent}
                      multiline
                    />
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => handleUpdateReview(item.id)}>
                      <Text style={styles.saveBtnText}>수정 완료</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.reviewBodyText, { color: colors.textSecondary }]}>{item.content}</Text>
                    <View style={styles.engagementRow}>
                      <EngagementButtons 
                        targetType="review" 
                        targetId={item.id} 
                        item={item} 
                        userVote={userReviewVotes[item.id] || 0} 
                        userId={user?.id}
                        onUpdate={(updated) => {
                          setReviews(prev => prev.map(r => r.id === item.id ? { ...r, ...updated } : r));
                          setUserReviewVotes(prev => ({ ...prev, [item.id]: updated.userVote }));
                        }}
                      />
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>

        <UserActionModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onChat={startChat}
          nickname={selectedUser?.nickname}
          userType={selectedUser?.userType}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, justifyContent: 'space-between' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  mainImage: { width: '100%', height: 250 },
  roadviewContainer: { position: 'relative', width: '100%', height: 250 },
  roadviewBadge: { 
    position: 'absolute', 
    bottom: 12, 
    right: 12, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  roadviewBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  content: { padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.1, shadowRadius:4 },
  titleSection: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 16, fontWeight: '800', marginLeft: 4 },
  infoGrid: { paddingTop: 16, borderTopWidth: 1, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, flex: 1, lineHeight: 20 },
  infoLink: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  section: { marginTop: 24, paddingTop: 16, borderTopWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  overviewText: { fontSize: 15, lineHeight: 24 },
  navBtn: { marginTop: 24, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  navBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  reviewSection: { marginTop: 12, padding: 20, paddingBottom: 40 },
  reviewText: { fontSize: 14, lineHeight: 22 },
  
  // Premium Review Styles
  reviewMainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reviewCountText: { fontSize: 14, fontWeight: '600' },
  loginPromptBox: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  loginPromptText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  loginLinkText: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  
  reviewInputBox: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.05, shadowRadius:4 },
  ratingSelectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ratingLabelSmall: { fontSize: 13, fontWeight: '700', marginRight: 12 },
  ratingInteractionContainer: { width: 160 },
  starsRowSmall: { flexDirection: 'row' },
  ratingValueText: { fontSize: 16, fontWeight: '900', marginLeft: 12 },
  
  inputWrapper: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  reviewInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, height: 80, fontSize: 14, textAlignVertical: 'top' },
  submitBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  
  reviewRow: { paddingVertical: 16 },
  reviewUserHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  userInfoSide: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  userNameText: { fontSize: 15, fontWeight: 'bold' },
  
  userMetaSide: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userRatingText: { fontSize: 14, fontWeight: '800' },
  dateText: { fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginLeft: 8 },
  
  reviewBodyText: { fontSize: 15, lineHeight: 24, marginBottom: 12 },
  engagementRow: { flexDirection: 'row' },
  
  editBox: { marginTop: 8 },
  editInput: { borderWidth: 1, borderRadius: 12, padding: 12, height: 100, fontSize: 14, textAlignVertical: 'top', marginBottom: 10 },
  saveBtn: { height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  
  // Blended Detail Styles
  usageStatsGrid: { 
    flexDirection: 'row', 
    marginVertical: 16,
    gap: 16
  },
  usageColumn: {
    flex: 1,
    gap: 12
  },
  usageStatItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    paddingVertical: 4
  },
  statIconBox: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 8
  },
  statTextBox: { flex: 1 },
  statLabel: { fontSize: 11, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '500' },
  overviewBox: { 
    padding: 16, 
    borderRadius: 12, 
    marginTop: 8,
    lineHeight: 22
  },
  
  // Detail Information Row Styles (Keep if still used elsewhere, but mostly replaced by grid)
  detailInfoRow: { flexDirection: 'row', paddingVertical: 4 },
  detailInfoLabel: { width: 100, fontSize: 14, fontWeight: 'bold' },
  detailInfoValue: { flex: 1, fontSize: 14, lineHeight: 20 },
  mapBox: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginTop: 16 },
  mapActionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 12, 
    borderRadius: 8, 
    marginTop: 12, 
    borderWidth: 1, 
    gap: 8 
  },
  mapActionText: { fontSize: 13, fontWeight: 'bold' },
});
