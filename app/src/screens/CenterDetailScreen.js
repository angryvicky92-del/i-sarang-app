import React, { useState, useEffect, useMemo, useLayoutEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Linking, Alert, TextInput, Platform, InteractionManager, PanResponder, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { PieChart } from 'react-native-chart-kit';
import KakaoRoadview from '../components/KakaoRoadview';
import { SIDO_LIST, TYPE_COLORS, TYPE_GOK, getDaycares, isJobMatchingDaycare } from '../services/dataService';
import KindergartenLoader from '../components/KindergartenLoader';
import { Star, MapPin, Building2, Phone, Bus, Package, ChevronDown, ChevronLeft, ChevronRight, Heart, MessageCircle, Info, Calendar, Users, Briefcase } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../services/supabaseClient';
import { getReviews, createReview, deleteReview, getReviewAverages } from '../services/reviewService';
import { getMyVotes } from '../services/engagementService';
import RatingStars from '../components/RatingStars';
import EngagementButtons from '../components/EngagementButtons';
import { User, MessageSquare, Star as StarIcon, Send, LogIn, Trash2, Edit2, X } from 'lucide-react-native';
import UserActionModal from '../components/UserActionModal';
import { getOrCreateChat } from '../services/chatService';

const screenWidth = Dimensions.get('window').width;

const calculateRatio = (children, teachers) => {
  if (!teachers || teachers === 0) return '계산불가';
  const ratio = (children / teachers).toFixed(1);
  return `1 : ${ratio}`;
};

// Format Office Name: "서울특별시 강남구" -> "서울 강남구청"
const formatOfficeName = (officeStr) => {
  if (!officeStr) return '확인 불가';
  const parts = officeStr.split(' ');
  let city = parts[0] || '';
  let district = parts[1] || '';
  
  // Shorten City
  if (city === '서울특별시') city = '서울';
  else if (city === '인천광역시') city = '인천';
  else if (city === '경기도') city = '경기';
  else if (city.length > 2 && city.endsWith('광역시')) city = city.substring(0, 2);
  else if (city.length > 2 && city.endsWith('특별자치도')) city = city.substring(0, 2);

  // Add "청" (Office) suffix to district if missing
  if (district && !district.endsWith('청')) {
    if (district.endsWith('구') || district.endsWith('시') || district.endsWith('군')) {
      district += '청';
    }
  }
  
  return `${city} ${district}`.trim();
};

export default function CenterDetailScreen({ route, navigation }) {
  const initialDaycare = route.params.daycare;
  const [daycare, setDaycare] = useState(initialDaycare);
  const [isDaycareLoading, setIsDaycareLoading] = useState(!initialDaycare.lat);
  const { profile } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const { updateDaycareRating, allJobs, toggleFavorite, isFavorited } = useSearch();

  const hasTriedFetch = useRef(false);

  useEffect(() => {
    // If we only have a stub (e.g. from Home screen), fetch full info
    if (!daycare.lat && !hasTriedFetch.current) {
      if (!daycare.arcode) {
        // No arcode to fetch full info, just stop loading and show stub
        setIsDaycareLoading(false);
        hasTriedFetch.current = true;
        return;
      }

      const fetchFullDaycare = async () => {
        hasTriedFetch.current = true;
        try {
          setIsDaycareLoading(true);
          
          // Safety timeout for 5 seconds
          const timeout = setTimeout(() => {
            setIsDaycareLoading(false);
          }, 5000);

          const list = await getDaycares(daycare.arcode);
          const fullInfo = list.find(d => d.stcode === daycare.stcode);
          
          clearTimeout(timeout);
          if (fullInfo) {
            setDaycare(fullInfo);
          }
        } catch (e) {
          console.warn('Failed to fetch full daycare info', e);
        } finally {
          setIsDaycareLoading(false);
        }
      };
      fetchFullDaycare();
    }
  }, [daycare.stcode, daycare.arcode, daycare.lat]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation, daycare.lat, daycare.lng]);

  const [activeTab, setActiveTab] = useState('기본정보');
  const [jobOffers, setJobOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userReviewVotes, setUserReviewVotes] = useState({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewContent, setNewReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Review Edit State
  const [isEditingReviewId, setIsEditingReviewId] = useState(null);
  const [editReviewContent, setEditReviewContent] = useState('');
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  // Chat Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const startRating = useRef(5);
  const ratingStateRef = useRef({
    isEditingReviewId,
    editReviewRating,
    newReviewRating
  });

  useEffect(() => {
    ratingStateRef.current = {
      isEditingReviewId,
      editReviewRating,
      newReviewRating
    };
  }, [editReviewRating, newReviewRating, isEditingReviewId]);
  
  // PanResponder for Star Rating Dragging
  const ratingPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 5,
      onPanResponderGrant: (evt) => {
        const { isEditingReviewId } = ratingStateRef.current;
        const x = evt.nativeEvent.locationX;
        const totalWidth = 192;
        let rating = Math.ceil((x / totalWidth) * 10) / 2;
        rating = Math.max(0.5, Math.min(5, rating));
        
        if (isEditingReviewId) setEditReviewRating(rating);
        else setNewReviewRating(rating);
        
        startRating.current = rating; // Use the new rating as start for any subsequent drag
      },
      onPanResponderMove: (evt) => {
        const { isEditingReviewId } = ratingStateRef.current;
        const x = evt.nativeEvent.locationX;
        const totalWidth = 192;
        let rating = Math.ceil((x / totalWidth) * 10) / 2;
        rating = Math.max(0.5, Math.min(5, rating));
        
        if (isEditingReviewId) setEditReviewRating(rating);
        else setNewReviewRating(rating);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Just a safety check to ensure final state is set
        const { isEditingReviewId } = ratingStateRef.current;
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          const x = evt.nativeEvent.locationX;
          const totalWidth = 192;
          let rating = Math.ceil((x / totalWidth) * 10) / 2;
          rating = Math.max(0.5, Math.min(5, rating));
          
          if (isEditingReviewId) setEditReviewRating(rating);
          else setNewReviewRating(rating);
        }
      }
    })
  ).current;

  const fetchCenterReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const data = await getReviews(daycare.stcode, profile?.id);
      setReviews(data || []);
      
      if (profile && data && data.length > 0) {
        const votes = await getMyVotes('review', data.map(r => r.id), profile.id);
        setUserReviewVotes(votes);
      }
    } catch (e) {
      console.warn('Failed to fetch reviews', e);
    } finally {
      setReviewsLoading(false);
    }
  }, [daycare.stcode, profile]);

  const fetchRelatedJobs = useCallback(async () => {
    try {
      const matched = (allJobs || []).filter(job => isJobMatchingDaycare(job, daycare));
      setJobOffers(matched);
    } catch (e) {
      console.warn('Failed to fetch matched jobs', e);
    }
  }, [allJobs, daycare]);

  useEffect(() => {
    if (!daycare.stcode) return;
    
    // Delay fetching until after transition for smoother UI
    const task = InteractionManager.runAfterInteractions(() => {
      fetchRelatedJobs();
      fetchCenterReviews();
      
      // If navigating from a specific review on home screen
      if (route.params?.targetReviewId) {
        setActiveTab('후기');
      }
    });
    return () => task.cancel();
  }, [daycare.stcode, route.params?.targetReviewId, fetchCenterReviews, fetchRelatedJobs]);

  const { teacherRatio, formattedOffice, hasChildBreakdown, totalTeachers, tBreak } = useMemo(() => {
    return {
      teacherRatio: calculateRatio(daycare.current, daycare.nurseryTeacherCount),
      formattedOffice: formatOfficeName(daycare.office),
      hasChildBreakdown: [0,1,2,3,4,5].some(age => (daycare.childBreakdown?.[`age${age}`] || 0) > 0),
      totalTeachers: daycare.teacherCount || 5,
      tBreak: daycare.tenureBreakdown || {}
    };
  }, [daycare]);
  
  const handleReviewSubmit = async () => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (!newReviewContent.trim()) {
      Alert.alert('알림', '후기 내용을 입력해 주세요.');
      return;
    }

    if ((profile.user_type === '선생님' || profile.user_type === '보육교사') && !profile.is_verified) {
      Alert.alert('알림', '인증된 선생님만 후기를 작성할 수 있습니다. 마이페이지에서 선생님 인증을 진행해 주세요.');
      return;
    }

    if (reviews.some(r => r.user_id === profile.id)) {
      Alert.alert('알림', '이미 이 어린이집에 후기를 작성하셨습니다. 후기는 어린이집당 1개만 작성 가능합니다.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        user_id: profile.id,
        center_id: daycare.stcode || daycare.id,
        rating: newReviewRating,
        content: newReviewContent,
        center_name: daycare.name,
        center_addr: daycare.addr,
        center_type: daycare.type,
        center_arcode: daycare.arcode
      };

      const result = await createReview(reviewData);
      if (result) {
        Alert.alert('성공', '후기가 등록되었습니다.');
        setNewReviewContent('');
        setNewReviewRating(5);
        fetchCenterReviews();
      } else {
        Alert.alert('오류', '후기 등록에 실패했습니다.');
      }
    } catch (e) {
      console.error('Submit review error:', e);
      Alert.alert('오류', '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = (reviewId) => {
    Alert.alert('후기 삭제', '정말 삭제하시겠습니까? 삭제된 후기는 복구할 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      { 
        text: '삭제', 
        style: 'destructive', 
        onPress: async () => {
          const success = await deleteReview(reviewId);
          if (success) {
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            // Recalculate averages and sync with main map
            const cid = daycare.stcode || daycare.id;
            const avgs = await getReviewAverages(cid);
            updateDaycareRating(daycare.stcode, avgs);
          } else {
            Alert.alert('오류', '후기 삭제에 실패했습니다.');
          }
        } 
      }
    ], { cancelable: true });
  };

  const handleUpdateReview = async (reviewId) => {
    if (!editReviewContent.trim()) {
      Alert.alert('알림', '후기 내용을 입력해 주세요.');
      return;
    }
    setIsUpdatingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ 
          content: editReviewContent.trim(),
          rating: editReviewRating
        })
        .eq('id', reviewId);
      
      if (error) throw error;
      setIsEditingReviewId(null);
      fetchCenterReviews();
    } catch {
      Alert.alert('오류', '후기 수정에 실패했습니다.');
    } finally {
      setIsUpdatingReview(false);
    }
  };
  const startEditingReview = (review) => {
    setIsEditingReviewId(review.id);
    setEditReviewContent(review.content);
    setEditReviewRating(review.rating);
  };

  const handleNicknameClick = (id, nickname, type) => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (id === profile.id) return; // Don't chat with self

    setSelectedUser({ id, nickname, userType: type });
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

  // Calculate Average Ratings from Reviews
  const { parentAvg, teacherAvg, parentCount, teacherCount, filteredReviews, hasMyReview } = React.useMemo(() => {
    const parentReviews = reviews.filter(r => r.profiles?.user_type !== '선생님' && r.profiles?.user_type !== '보육교사');
    const teacherReviews = reviews.filter(r => r.profiles?.user_type === '선생님' || r.profiles?.user_type === '보육교사');
    
    // User type filter for the list ONLY
    const currentUserType = profile?.user_type || '학부모';
    const filtered = reviews.filter(r => {
      if (currentUserType === '관리자') return true;
      const authorType = r.profiles?.user_type || '학부모';
      
      // Verified teachers can see both teacher and parent reviews
      if ((currentUserType === '선생님' || currentUserType === '보육교사') && profile?.is_verified) {
        return true;
      }
      
      return authorType === currentUserType;
    });

    const calc = (list) => {
      if (list.length === 0) return reviewsLoading ? '-' : '0.0';
      const sum = list.reduce((acc, curr) => acc + curr.rating, 0);
      return (sum / list.length).toFixed(1);
    };

    return {
      parentAvg: calc(parentReviews),
      teacherAvg: calc(teacherReviews),
      parentCount: parentReviews.length,
      teacherCount: teacherReviews.length,
      filteredReviews: filtered,
      hasMyReview: reviews.some(r => r.user_id === profile?.id)
    };
  }, [reviews, profile?.id, profile?.user_type, profile?.is_verified, reviewsLoading]);

  // Sync with global cache so Map Popup stays updated
  useEffect(() => {
    if (parentAvg !== '-' && teacherAvg !== '-') {
      updateDaycareRating(daycare.stcode, { parentAvg, teacherAvg });
    }
  }, [parentAvg, teacherAvg, daycare.stcode, updateDaycareRating]);

  const tenureData = useMemo(() => {
    const popY0 = Math.round(totalTeachers * ((tBreak.y0 || 0)/100));
    const popY1 = Math.round(totalTeachers * ((tBreak.y1 || 0)/100));
    const popY2 = Math.round(totalTeachers * ((tBreak.y2 || 0)/100));
    const popY4 = Math.round(totalTeachers * ((tBreak.y4 || 0)/100));
    const popY6 = Math.round(totalTeachers * ((tBreak.y6 || 0)/100));

    const data = [
      { name: `1년미만 (${popY0}명)`, population: popY0, color: '#3B82F6', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: `1~2년 (${popY1}명)`, population: popY1, color: '#10B981', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: `2~4년 (${popY2}명)`, population: popY2, color: '#FACC15', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: `4~6년 (${popY4}명)`, population: popY4, color: '#F97316', legendFontColor: colors.textSecondary, legendFontSize: 12 },
      { name: `6년이상 (${popY6}명)`, population: popY6, color: '#EF4444', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    ].filter(d => d.population > 0);

    return data.length > 0 ? data : [{ name: '데이터 없음', population: 1, color: '#CBD5E1', legendFontColor: colors.textMuted, legendFontSize: 12 }];
  }, [totalTeachers, tBreak, colors.textMuted, colors.textSecondary]);

  // Parse Services (제공서비스 badges from the actual Spec string)
  const allServices = ['일반', '영아전담', '장애아전담', '방과후', '시간연장', '휴일보육', '24시간'];
  const activeServices = useMemo(() => (daycare.spec || '').split(',').map(s => s.trim()), [daycare.spec]);

  const handleApplyWaitlist = () => {
    const sidoCode = daycare.arcode ? daycare.arcode.substring(0, 2) : '11';
    const sidoObj = SIDO_LIST.find(s => s.code === sidoCode);
    const sidoText = sidoObj ? sidoObj.name : '서울특별시';
    const sidoParam = `${sidoCode}000`;
    const url = `https://www.childcare.go.kr/?menuno=166&sido=${sidoParam}&sidoText=${encodeURIComponent(sidoText)}&searchText=${encodeURIComponent(daycare.name)}`;
    Linking.openURL(url).catch(err => console.error('Failed to open URL', err));
  };

  const renderBasicInfo = () => (
    <View style={styles.tabContent}>
      
      {/* 1. 기본 정보 */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>어린이집 기본 정보</Text>
        <InfoRow label="대표자명" value={daycare.directorName} />
        <InfoRow label="개원일" value={daycare.openingDate || '미상'} />
        <InfoRow label="관할행정기관" value={formattedOffice} />
        <InfoRow label="운영시간" value="07:30 ~ 19:30" />
        <InfoRow label="통학차량" value={daycare.schoolbus || '미운영'} />
      </View>

      {/* 1-2. 건물/시설 & 연락처 정보 */}
      <View style={[styles.cardSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>건물 시설 및 연락처</Text>
        <InfoRow label="전화번호" value={daycare.tel || '정보 없음'} colors={colors} />
        <InfoRow label="보육실" value={`${daycare.roomCount || 0}개 (${daycare.roomSize || 0}㎡)`} colors={colors} />
        <InfoRow label="놀이터" value={`${daycare.playground || 0}곳`} colors={colors} />
        <InfoRow label="CCTV 설치" value={`${daycare.cctv || 0}대`} colors={colors} />

        {/* Map Section */}
        <View style={{ marginTop: 16, height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                  body { margin: 0; padding: 0; background-color: ${colors.background}; }
                  #map { width: 100%; height: 100vh; }
                  ${isDarkMode ? `
                  #map { filter: invert(90%) hue-rotate(180deg) brightness(105%) contrast(90%); }
                  img[src*="copyright"] { filter: invert(100%) hue-rotate(180deg); }
                  ` : ''}
                </style>
                <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=dc33fe7753b02b59868630ccbfd7b820"></script>
              </head>
              <body>
                <div id="map"></div>
                <script>
                  var mapContainer = document.getElementById('map');
                  var center = new kakao.maps.LatLng(${daycare.lat || 37.5665}, ${daycare.lng || 126.9780});
                  var mapOption = { center: center, level: 3 };
                  var map = new kakao.maps.Map(mapContainer, mapOption);
                  
                  var color = '${daycare.color || '#75BA57'}';
                  var svg = '<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">' +
                            '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="' + color + '" stroke="white" stroke-width="2"/>' +
                            '<circle cx="16" cy="16" r="5" fill="white"/>' +
                            '</svg>';
                  var markerImage = new kakao.maps.MarkerImage(
                      'data:image/svg+xml;base64,' + btoa(svg),
                      new kakao.maps.Size(32, 40),
                      { offset: new kakao.maps.Point(16, 40) }
                  );

                  var marker = new kakao.maps.Marker({ position: center, image: markerImage });
                  marker.setMap(map);
                  // Interactive map enabled
                </script>
              </body>
              </html>
            ` }}
            containerStyle={{ borderRadius: 12 }}
            scrollEnabled={true}
          />
        </View>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: colors.border }}
          onPress={() => {
            const url = Platform.OS === 'ios' 
              ? 'kakaomap://look?p=' + daycare.lat + ',' + daycare.lng
              : 'daummaps://look?p=' + daycare.lat + ',' + daycare.lng;
            Linking.openURL(url).catch(() => {
              Linking.openURL('https://map.kakao.com/link/map/' + encodeURIComponent(daycare.name) + ',' + daycare.lat + ',' + daycare.lng);
            });
          }}
        >
          <MapPin size={16} color={colors.textSecondary} />
          <Text style={{ fontSize: 13, color: colors.text, fontWeight: 'bold', marginLeft: 6 }}>카카오맵 열기</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 제공서비스 뱃지 UI */}
      <View style={[styles.cardSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>제공 서비스</Text>
        <View style={styles.serviceContainer}>
          {allServices.map(svc => {
            const isActive = activeServices.some(act => act.includes(svc) || svc.includes(act));
            return (
              <View key={svc} style={[
                styles.serviceBadge, 
                isActive ? [styles.serviceBadgeActive, isDarkMode && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }] : [styles.serviceBadgeInactive, { backgroundColor: colors.background, borderColor: colors.border }]
              ]}>
                <Text style={[styles.serviceText, isActive ? [styles.serviceTextActive, isDarkMode && { color: colors.primary }] : [styles.serviceTextInactive, { color: colors.textMuted }]]}>{svc}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. 연령별 아동 정보 (정원/현원/대기) */}
      {hasChildBreakdown && (
        <View style={[styles.cardSection, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>연령별 아동 정보</Text>
            <Text style={[styles.totalText, { color: colors.primary }]}>총 현원 {daycare.current || 0}명 / 총 정원 {daycare.capacity || 0}명</Text>
          </View>
          <View style={[styles.tableHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.th, { color: colors.textSecondary }]}>연령</Text>
            <Text style={[styles.th, { flex: 1.5, color: colors.textSecondary }]}>현원 / 정원</Text>
            <Text style={[styles.th, { color: colors.textSecondary }]}>대기</Text>
          </View>
          {(() => {
            const AGE_RATIOS = { 0: 3, 1: 5, 2: 7, 3: 15, 4: 20, 5: 20 };
            const MIXED_RATIOS = { infantMixed: 5, toddlerMixed: 15, special: 3 };
            const totalCap = Number(daycare.capacity || 0);
            
            // Calculate raw weights for all possible categories
            const categories = [
              ...[0, 1, 2, 3, 4, 5].map(age => ({ key: 'age' + age, ratio: AGE_RATIOS[age], type: 'age' })),
              { key: 'infantMixed', ratio: MIXED_RATIOS.infantMixed, type: 'mixed' },
              { key: 'toddlerMixed', ratio: MIXED_RATIOS.toddlerMixed, type: 'mixed' },
              { key: 'special', ratio: MIXED_RATIOS.special, type: 'special' }
            ];

            const rawWeights = categories.map(cat => (daycare.classBreakdown[cat.key] || 0) * cat.ratio);
            const totalRawWeight = rawWeights.reduce((acc, w) => acc + w, 0);
            
            // Initial distribution
            const distributedCaps = categories.map((cat, idx) => {
              if (totalRawWeight > 0 && totalCap > 0) {
                return Math.floor((rawWeights[idx] / totalRawWeight) * totalCap);
              }
              return 0;
            });

            // Adjust rounding difference
            if (totalRawWeight > 0 && totalCap > 0) {
              const distributedSum = distributedCaps.reduce((acc, c) => acc + c, 0);
              const diff = totalCap - distributedSum;
              if (diff !== 0) {
                // Add remainder to the category with the largest weight
                const maxIdx = rawWeights.indexOf(Math.max(...rawWeights));
                distributedCaps[maxIdx] += diff;
              }
            }

            const rows = [
              ...[0, 1, 2, 3, 4, 5].map(age => ({
                label: '만 ' + age + '세',
                current: daycare.childBreakdown['age' + age] || 0,
                capacity: distributedCaps[age] || '-',
                waitlist: daycare.waitingBreakdown['age' + age]?.count || 0
              })),
              {
                label: '혼합반',
                current: (daycare.childBreakdown.infantMixed || 0) + (daycare.childBreakdown.toddlerMixed || 0),
                capacity: (distributedCaps[6] || 0) + (distributedCaps[7] || 0) || '-',
                waitlist: daycare.waitingBreakdown.mixed?.count || 0
              },
              {
                label: '특수아동',
                current: daycare.childBreakdown.special || 0,
                capacity: distributedCaps[8] || '-',
                waitlist: daycare.waitingBreakdown.special?.count || 0
              }
            ];

            return rows.map((row, idx) => {
              if (row.current === 0 && row.waitlist === 0 && !row.label.includes('세')) return null;
              
              return (
                <View key={idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.td, { color: colors.textMuted }]}>{row.label}</Text>
                  <Text style={[styles.td, { flex: 1.5, color: colors.text }]}>{row.current} / {row.capacity === 0 ? '-' : row.capacity}</Text>
                  <Text style={[styles.td, { color: colors.text }]}>{row.waitlist}명</Text>
                </View>
              );
            });
          })()}
        </View>
      )}

      {/* 4. 교사 현황 (근속 연수 원형 차트) */}
      <View style={[styles.cardSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>교사 현황</Text>
        <InfoRow label="총 교사수" value={`${daycare.nurseryTeacherCount}명`} colors={colors} />
        <InfoRow label="교사 1명당 아동수" value={teacherRatio} highlight colors={colors} />
        
        <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>교직원 근속 연수</Text>
        <PieChart
          data={tenureData}
          width={screenWidth - 80}
          height={160}
          chartConfig={{ color: (opacity = 1) => `rgba(${isDarkMode ? '255,255,255' : '0,0,0'}, ${opacity})` }}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"0"}
          absolute
        />
      </View>

    </View>
  );

  const renderJobTab = () => (
    <View style={styles.tabContent}>
      {jobOffers.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
          <Briefcase size={48} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>현재 진행 중인 구인 공고가 없습니다.</Text>
        </View>
      ) : (
        <View style={[styles.cardSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>채용 소식 ({jobOffers.length}건)</Text>
          {jobOffers.map((job, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.jobItem, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => navigation.navigate('JobDetail', { itemId: job.id, jobId: job.id })}
            >
              <View style={[styles.jobIconBox, { backgroundColor: colors.card }]}>
                <Briefcase size={20} color={colors.primary} />
              </View>
              <View style={styles.jobTextContent}>
                <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>{job.title}</Text>
                <Text style={[styles.jobMeta, { color: colors.textSecondary }]}>{job.position} · {job.deadline}</Text>
              </View>
              <ChevronRight size={20} color={colors.border} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderReviews = () => {
    return (
      <View style={[styles.tabContent, { paddingTop: 24 }]}>
        
        {/* Review Access Control Logic */}
        {!profile ? (
          <View style={[styles.loginPromptBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LogIn size={20} color={colors.textSecondary} />
            <Text style={[styles.loginPromptText, { color: colors.textSecondary }]}>후기를 작성하려면 로그인이 필요합니다.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLinkText, { color: colors.primary }]}>로그인하기</Text>
            </TouchableOpacity>
          </View>
        ) : hasMyReview ? (
          <View style={[styles.loginPromptBox, { borderStyle: 'solid', borderColor: colors.border, backgroundColor: isDarkMode ? colors.card : '#F1F5F9', marginBottom: 20 }]}>
            <MessageSquare size={20} color={colors.textSecondary} />
            <Text style={[styles.loginPromptText, { color: colors.textSecondary }]}>이미 이 어린이집에 대한 후기를 작성하셨습니다.{"\n"}(1인 1후기)</Text>
          </View>
        ) : (profile.user_type === '선생님' && !profile.is_verified) ? (
          <View style={[styles.loginPromptBox, { borderStyle: 'solid', borderColor: '#FEE2E2', backgroundColor: isDarkMode ? `${colors.primary}20` : '#FEF2F2', marginBottom: 20 }]}>
            <Info size={20} color="#EF4444" />
            <Text style={[styles.loginPromptText, { color: isDarkMode ? '#F87171' : '#B91C1C' }]}>인증된 선생님만 후기를 작성할 수 있습니다. 마이페이지에서 선생님 인증을 완료해 주세요.</Text>
          </View>
        ) : (
          <View style={[styles.reviewInputSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.ratingSelectRow}>
              <Text style={[styles.ratingLabelSmall, { color: colors.textSecondary }]}>기본 평점 선택</Text>
              <View style={styles.ratingInteractionContainer} {...ratingPanResponder.panHandlers}>
                <View style={styles.starsRowSmall} pointerEvents="none">
                  {[1, 2, 3, 4, 5].map(starNum => {
                    const starColor = profile.user_type === '선생님' ? '#4A6CF7' : colors.primary;
                    return (
                      <View key={starNum} style={{ position: 'relative', width: 32, height: 32 }}>
                        <StarIcon size={32} color={colors.border} fill="transparent" />
                        <View style={{ 
                          position: 'absolute', top: 0, left: 0, 
                          width: newReviewRating >= starNum ? 32 : (newReviewRating >= starNum - 0.5 ? 16 : 0),
                          overflow: 'hidden'
                        }}>
                          <StarIcon size={32} color={starColor} fill={starColor} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
              <Text style={[styles.ratingTextSmall, { color: profile.user_type === '선생님' ? '#4A6CF7' : colors.primary }]}>{newReviewRating}점</Text>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.newReviewInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="어린이집에 대한 솔직한 후기를 남겨주세요."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={newReviewContent}
                onChangeText={setNewReviewContent}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.submitReviewBtn, { backgroundColor: colors.primary }, (!newReviewContent.trim() || isSubmittingReview) && [styles.submitReviewBtnDisabled, { backgroundColor: isDarkMode ? colors.card : colors.border }]]} 
                onPress={handleReviewSubmit}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Send size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}



        {reviewsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : filteredReviews.length === 0 ? (
          <View style={[styles.reviewPlaceholder, { backgroundColor: colors.card }]}>
            <MessageSquare size={48} color={colors.border} />
            <Text style={[styles.reviewPlaceholderDesc, { color: colors.textMuted }]}>해당하는 후기가 없습니다. 첫 후기를 작성해 보세요!</Text>
          </View>
        ) : (
          filteredReviews.map((review) => (
            <View key={review.id} style={[styles.reviewItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthorBox}>
                  <View style={[styles.userTypeBadge, { 
                    backgroundColor: review.profiles?.user_type === '선생님' 
                      ? (isDarkMode ? '#4A6CF720' : '#EEF2FF') 
                      : (isDarkMode ? `${colors.primary}20` : `${colors.primary}10`),
                    borderColor: review.profiles?.user_type === '선생님' ? '#4A6CF740' : `${colors.primary}40`,
                    borderWidth: 1
                  }]}>
                    <Text style={[styles.userTypeBadgeText, { 
                      color: review.profiles?.user_type === '선생님' ? '#4A6CF7' : colors.primary 
                    }]}>
                      {review.profiles?.user_type || '학부모'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleNicknameClick(review.user_id, review.profiles?.nickname || '익명 사용자', review.profiles?.user_type || '학부모')}>
                    <Text style={[styles.reviewAuthor, { color: colors.text }]}>{review.profiles?.nickname || '익명 사용자'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.reviewRatingBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Star size={14} color={review.profiles?.user_type === '선생님' ? '#4A6CF7' : colors.primary} fill={review.profiles?.user_type === '선생님' ? '#4A6CF7' : colors.primary} />
                    <Text style={[styles.ratingScore, { color: colors.text, marginLeft: 4, fontSize: 13 }]}>{review.rating}</Text>
                  </View>
                  <Text style={[styles.reviewDate, { color: colors.textMuted }]}>{new Date(review.created_at).toLocaleDateString()}</Text>
                  
                  {/* Delete Button for Author or Admin */}
                  {(profile?.id === review.user_id || profile?.user_type === '관리자') && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {!isEditingReviewId || isEditingReviewId !== review.id ? (
                        <>
                          <TouchableOpacity 
                            style={{ padding: 4 }} 
                            onPress={() => startEditingReview(review)}
                          >
                            <Edit2 size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ padding: 4 }} 
                            onPress={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity 
                          style={{ padding: 4 }} 
                          onPress={() => setIsEditingReviewId(null)}
                        >
                          <X size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
              
              {isEditingReviewId === review.id ? (
                <View style={styles.editReviewContainer}>
                  {/* Edit Rating Selection */}
                  <View style={[styles.ratingSelectRow, { marginBottom: 12, marginTop: 4 }]}>
                    <View 
                      style={styles.ratingInteractionContainer}
                      {...ratingPanResponder.panHandlers}
                    >
                      <View style={styles.starsRowSmall} pointerEvents="none">
                        {[1, 2, 3, 4, 5].map((starNum) => {
                          const starColor = review.profiles?.user_type === '선생님' ? '#4A6CF7' : colors.primary;
                          return (
                            <View key={starNum} style={{ position: 'relative', width: 32, height: 32 }}>
                              <StarIcon size={32} color={colors.border} fill="transparent" />
                              <View style={{ 
                                position: 'absolute', top: 0, left: 0, 
                                width: editReviewRating >= starNum ? 32 : (editReviewRating >= starNum - 0.5 ? 16 : 0),
                                overflow: 'hidden'
                              }}>
                                <StarIcon size={32} color={starColor} fill={starColor} />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    <Text style={[styles.ratingTextSmall, { color: review.profiles?.user_type === '선생님' ? '#4A6CF7' : colors.primary }]}>{editReviewRating}점</Text>
                  </View>

                  <TextInput
                    style={[styles.editReviewInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={editReviewContent}
                    onChangeText={setEditReviewContent}
                    multiline
                  />
                  <TouchableOpacity 
                    style={[styles.reviewSaveBtn, { backgroundColor: colors.primary }]} 
                    onPress={() => handleUpdateReview(review.id)}
                    disabled={isUpdatingReview}
                  >
                    {isUpdatingReview ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.reviewSaveText}>수정 완료</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.reviewContent, { color: colors.textSecondary }]}>{review.content}</Text>
                  <View style={styles.reviewEngagement}>
                    <EngagementButtons 
                      targetType="review" 
                      targetId={review.id} 
                      item={review} 
                      userVote={userReviewVotes[review.id] || 0} 
                      userId={profile?.id}
                      onUpdate={(updatedData) => {
                        setReviews(prev => prev.map(r => r.id === review.id ? { ...r, ...updatedData } : r));
                        setUserReviewVotes(prev => ({ ...prev, [review.id]: updatedData.userVote }));
                      }}
                    />
                  </View>
                </>
              )}
            </View>
          ))
        )}

        <UserActionModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onChat={startChat}
          nickname={selectedUser?.nickname}
          userType={selectedUser?.userType}
        />
      </View>
    );
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Include auxiliary styles temporarily if needed, or better, add to main styles object below */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>어린이집 상세</Text>
        <View style={styles.headerRight} />
      </View>

      {isDaycareLoading ? (
        <KindergartenLoader />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.roadviewWrapper}>
          <KakaoRoadview lat={daycare.lat || 37.5} lng={daycare.lng || 127.0} />
          {/* Favorite Button */}
          <TouchableOpacity 
            style={styles.favBtn} 
            onPress={() => toggleFavorite(daycare, navigation)}
          >
            <Heart 
              size={24} 
              color={isFavorited(daycare.stcode) ? '#EF4444' : '#fff'} 
              fill={isFavorited(daycare.stcode) ? '#EF4444' : 'transparent'} 
            />
          </TouchableOpacity>
        </View>

          <View style={[styles.topHeader, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[daycare.type] || colors.primary }]}>
              <Text style={[styles.typeBadgeText, daycare.type === TYPE_GOK && { color: colors.card }]}>{daycare.type || '어린이집'}</Text>
            </View>
            {daycare.status && !['정상', '운영중'].includes(daycare.status) && (
              <View style={[styles.typeBadge, { backgroundColor: daycare.status.includes('미운영') || daycare.status.includes('휴지') ? '#94A3B8' : '#10B981', borderColor: 'transparent' }]}>
                <Text style={styles.typeBadgeText}>{daycare.status}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{daycare.name || '어린이집 상세'}</Text>
          <Text style={[styles.addr, { color: colors.textSecondary }]}>{daycare.addr || '주소 정보 없음'}</Text>
          
          <View style={[styles.ratingContainer, { backgroundColor: colors.background }]}>
            <View style={styles.ratingBox}>
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>학부모 평점</Text>
              <View style={styles.starRow}>
                <Star size={16} color={colors.primary} fill={colors.primary} />
                <Text style={[styles.ratingScore, { color: colors.text }]}>{parentAvg}</Text>
              </View>
            </View>
            <View style={[styles.ratingDivider, { backgroundColor: colors.border }]} />
            <View style={styles.ratingBox}>
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>선생님 평점</Text>
              <View style={styles.starRow}>
                <Star size={16} color="#4A6CF7" fill="#4A6CF7" />
                <Text style={[styles.ratingScore, { color: colors.text }]}>{teacherAvg}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === '기본정보' && [styles.tabBtnActive, { backgroundColor: colors.primary }]]} onPress={() => setActiveTab('기본정보')}>
            <Text style={[styles.tabBtnText, { color: colors.textSecondary }, activeTab === '기본정보' && styles.tabBtnTextActive]}>기본정보</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === '구인정보' && [styles.tabBtnActive, { backgroundColor: colors.primary }]]} onPress={() => setActiveTab('구인정보')}>
            <Text style={[styles.tabBtnText, { color: colors.textSecondary }, activeTab === '구인정보' && styles.tabBtnTextActive]}>구인정보</Text>
            {jobOffers.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{jobOffers.length}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === '후기' && [styles.tabBtnActive, { backgroundColor: colors.primary }]]} onPress={() => setActiveTab('후기')}>
            <Text style={[styles.tabBtnText, { color: colors.textSecondary }, activeTab === '후기' && styles.tabBtnTextActive]}>
              후기 ({profile?.user_type === '선생님' ? teacherCount : (profile?.user_type === '관리자' ? reviews.length : parentCount)})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === '기본정보' && renderBasicInfo()}
        {activeTab === '구인정보' && renderJobTab()}
        {activeTab === '후기' && renderReviews()}

        {activeTab === '기본정보' && (
          <View style={styles.bottomFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyWaitlist}>
              <Text style={styles.applyBtnText}>어린이집 입소 대기신청하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    )}
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, highlight }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }, highlight && { color: '#DC2626', fontWeight: 'bold' }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingHorizontal: 4 },
  headerLeft: { width: 48, alignItems: 'center', justifyContent: 'center' },
  headerRight: { width: 48, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center' },
  scroll: { paddingBottom: 40 },
  roadviewWrapper: { width: '100%', height: 200 },
  favBtn: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 100 
  },
  topHeader: { padding: 20, paddingTop: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 16, elevation: 2 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  typeBadgeText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  addr: { fontSize: 14, marginBottom: 16 },
  ratingContainer: { flexDirection: 'row', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  ratingBox: { flex: 1, alignItems: 'center' },
  ratingDivider: { width: 1, height: 30 },
  ratingLabel: { fontSize: 12, marginBottom: 4 },
  starRow: { flexDirection: 'row', alignItems: 'center' },
  ratingScore: { fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabBtnActive: { },
  tabBtnText: { fontWeight: '600', fontSize: 14 },
  tabBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  tabBadge: { backgroundColor: '#EF4444', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  tabContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, borderRadius: 16, marginTop: 10 },
  emptyText: { marginTop: 16, fontSize: 14, textAlign: 'center' },
  
  cardSection: { padding: 20, borderRadius: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  totalText: { fontSize: 13, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 14, fontWeight: '700', flex: 2, textAlign: 'right' },
  serviceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  serviceBadgeActive: { },
  serviceBadgeInactive: { },
  serviceText: { fontSize: 13, fontWeight: 'bold' },
  serviceTextActive: { },
  serviceTextInactive: { },
  chartTitle: { fontSize: 15, fontWeight: '700', marginTop: 24, marginBottom: 8, textAlign: 'center' },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderRadius: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1 },
  th: { flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 13 },
  td: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  reviewPlaceholder: { padding: 40, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  reviewPlaceholderDesc: { fontSize: 14, textAlign: 'center', marginTop: 16 },
  writeReviewBtnHeader: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  writeReviewHeaderText: { fontSize: 13, fontWeight: 'bold' },
  reviewItem: { padding: 20, borderRadius: 16, marginBottom: 12, borderBottomWidth: 1 },
  editReviewContainer: { marginTop: 12 },
  editReviewInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  reviewSaveBtn: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  reviewSaveText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reviewAuthorBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  userTypeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  reviewAuthor: { fontSize: 14, fontWeight: 'bold' },
  reviewRatingBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewDate: { fontSize: 11, marginLeft: 6 },
  reviewContent: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  reviewEngagement: { alignItems: 'flex-end' },
  bottomFooter: { padding: 16, marginTop: 10, paddingBottom: 40 },
  applyBtn: { backgroundColor: '#16A34A', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
  recruitBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  recruitBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  jobItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  jobIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  jobTextContent: { flex: 1 },
  jobTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  jobMeta: { fontSize: 13 },
  
  // Embedded Review Input Styles
  reviewInputSection: { padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  ratingSelectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  ratingLabelSmall: { fontSize: 13, fontWeight: 'bold', width: 80 },
  ratingInteractionContainer: { paddingVertical: 10, paddingHorizontal: 4 },
  starsRowSmall: { flexDirection: 'row', gap: 8 },
  ratingTextSmall: { fontSize: 13, fontWeight: '900', marginLeft: 8 },
  inputWrapper: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  newReviewInput: { flex: 1, borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, minHeight: 80 },
  submitReviewBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitReviewBtnDisabled: { },
  loginPromptBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderStyle: 'dashed', gap: 10 },
  loginPromptText: { flex: 1, fontSize: 13, fontWeight: '500' },
  loginLinkText: { fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' },
  reviewListHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 12 },
  reviewListTitle: { fontSize: 16, fontWeight: '800' },
  reviewListDivider: { flex: 1, height: 1 },

  // Kindergarten Loader Styles
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loaderIconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  loadingText: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  loadingTextSub: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  loadingDots: { flexDirection: 'row', alignItems: 'center', marginTop: 10 }
});
