import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Dimensions, TouchableOpacity, ActivityIndicator, Linking, Alert, TextInput, Platform } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import KakaoRoadview from '../components/KakaoRoadview';
import { SIDO_LIST } from '../services/dataService';
import { Star, Briefcase, ChevronRight, Heart, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { supabase } from '../services/supabaseClient';
import { getReviews, createReview } from '../services/reviewService';
import { getMyVotes } from '../services/engagementService';
import EngagementButtons from '../components/EngagementButtons';
import { User, Calendar, MessageSquare, Star as StarIcon, Send, LogIn } from 'lucide-react-native';

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
  const { daycare } = route.params;
  const { profile } = useAuth();
  const { isFavorited, toggleFavorite, allJobs } = useSearch();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [activeTab, setActiveTab] = useState('기본정보');
  const [jobOffers, setJobOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userReviewVotes, setUserReviewVotes] = useState({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewContent, setNewReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    fetchRelatedJobs();
    fetchCenterReviews();
  }, [daycare.stcode, allJobs]);

  const fetchCenterReviews = async () => {
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
  };

  const fetchRelatedJobs = async () => {
    try {
      const { isJobMatchingDaycare } = require('../services/dataService');
      const matched = (allJobs || []).filter(job => isJobMatchingDaycare(job, daycare));
      setJobOffers(matched);
    } catch (e) {
      console.warn('Failed to fetch matched jobs', e);
    }
  };

  const teacherRatio = calculateRatio(daycare.current, daycare.nurseryTeacherCount);
  const formattedOffice = formatOfficeName(daycare.office);

  const hasChildBreakdown = [0,1,2,3,4,5].some(age => (daycare.childBreakdown[`age${age}`] || 0) > 0);

  // Tenure Pie Chart Data (Converted to People from Percentage)
  const totalTeachers = daycare.teacherCount || 5;
  const tBreak = daycare.tenureBreakdown || {};
  
  const handleReviewSubmit = async () => {
    if (!profile) {
      Alert.alert('알림', '로그인이 필요합니다.', [{ text: '취소', style: 'cancel' }, { text: '로그인', onPress: () => navigation.navigate('Login') }]);
      return;
    }
    if (!newReviewContent.trim()) {
      Alert.alert('알림', '후기 내용을 입력해 주세요.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        user_id: profile.id,
        center_id: daycare.stcode,
        rating: newReviewRating,
        content: newReviewContent,
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

  const popY0 = Math.round(totalTeachers * ((tBreak.y0 || 0)/100));
  const popY1 = Math.round(totalTeachers * ((tBreak.y1 || 0)/100));
  const popY2 = Math.round(totalTeachers * ((tBreak.y2 || 0)/100));
  const popY4 = Math.round(totalTeachers * ((tBreak.y4 || 0)/100));
  const popY6 = Math.round(totalTeachers * ((tBreak.y6 || 0)/100));

  // Calculate Average Ratings from Reviews
  const { parentAvg, teacherAvg } = React.useMemo(() => {
    const parentReviews = reviews.filter(r => r.profiles?.user_type !== '선생님');
    const teacherReviews = reviews.filter(r => r.profiles?.user_type === '선생님');
    
    const calc = (list) => {
      if (list.length === 0) return '0.0';
      const sum = list.reduce((acc, curr) => acc + curr.rating, 0);
      return (sum / list.length).toFixed(1);
    };

    return {
      parentAvg: calc(parentReviews),
      teacherAvg: calc(teacherReviews)
    };
  }, [reviews]);

  const tenureData = [
    { name: `1년미만 (${popY0}명)`, population: popY0, color: '#3B82F6', legendFontColor: '#334155', legendFontSize: 12 },
    { name: `1~2년 (${popY1}명)`, population: popY1, color: '#10B981', legendFontColor: '#334155', legendFontSize: 12 },
    { name: `2~4년 (${popY2}명)`, population: popY2, color: '#FACC15', legendFontColor: '#334155', legendFontSize: 12 },
    { name: `4~6년 (${popY4}명)`, population: popY4, color: '#F97316', legendFontColor: '#334155', legendFontSize: 12 },
    { name: `6년이상 (${popY6}명)`, population: popY6, color: '#EF4444', legendFontColor: '#334155', legendFontSize: 12 },
  ].filter(d => d.population > 0); // Only show segments > 0
  
  if (tenureData.length === 0) {
    tenureData.push({ name: '데이터 없음', population: 1, color: '#CBD5E1', legendFontColor: '#94A3B8', legendFontSize: 12 });
  }

  // Parse Services (제공서비스 badges from the actual Spec string)
  const allServices = ['일반', '영아전담', '장애아전담', '방과후', '시간연장', '휴일보육', '24시간'];
  const activeServices = (daycare.spec || '').split(',').map(s => s.trim());

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
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>건물 시설 및 연락처</Text>
        <InfoRow label="전화번호" value={daycare.tel || '정보 없음'} />
        <InfoRow label="보육실" value={`${daycare.roomCount || 0}개 (${daycare.roomSize || 0}㎡)`} />
        <InfoRow label="놀이터" value={`${daycare.playground || 0}곳`} />
        <InfoRow label="CCTV 설치" value={`${daycare.cctv || 0}대`} />
      </View>

      {/* 2. 제공서비스 뱃지 UI */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>제공 서비스</Text>
        <View style={styles.serviceContainer}>
          {allServices.map(svc => {
            const isActive = activeServices.some(act => act.includes(svc) || svc.includes(act));
            return (
              <View key={svc} style={[styles.serviceBadge, isActive ? styles.serviceBadgeActive : styles.serviceBadgeInactive]}>
                <Text style={[styles.serviceText, isActive ? styles.serviceTextActive : styles.serviceTextInactive]}>{svc}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. 연령별 아동 정보 (정원/현원/대기) */}
      {hasChildBreakdown && (
        <View style={styles.cardSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>연령별 아동 정보</Text>
            <Text style={styles.totalText}>총 현원 {daycare.current || 0}명 / 총 정원 {daycare.capacity || 0}명</Text>
          </View>
          <View style={styles.tableHeader}>
            <Text style={styles.th}>연령</Text>
            <Text style={styles.th}>아동수</Text>
            <Text style={styles.th}>대기</Text>
          </View>
          {[0,1,2,3,4,5].map(age => {
            const current = daycare.childBreakdown[`age${age}`] || 0;
            const waitlist = daycare.waitingBreakdown[`age${age}`]?.count || 0;
            return (
              <View key={age} style={styles.tableRow}>
                <Text style={styles.td}>만 {age}세</Text>
                <Text style={styles.td}>{current}명</Text>
                <Text style={styles.td}>{waitlist}명</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 4. 교사 현황 (근속 연수 원형 차트) */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>교사 현황</Text>
        <InfoRow label="총 교사수" value={`${daycare.nurseryTeacherCount}명`} />
        <InfoRow label="교사 1명당 아동수" value={teacherRatio} highlight />
        
        <Text style={styles.chartTitle}>교직원 근속 연수</Text>
        <PieChart
          data={tenureData}
          width={screenWidth - 80}
          height={160}
          chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
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
        <View style={styles.emptyContainer}>
          <Briefcase size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>현재 진행 중인 구인 공고가 없습니다.</Text>
        </View>
      ) : (
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>채용 소식 ({jobOffers.length}건)</Text>
          {jobOffers.map((job, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.jobItem}
              onPress={() => navigation.navigate('JobDetail', { itemId: job.id, jobId: job.id })}
            >
              <View style={styles.jobIconBox}>
                <Briefcase size={20} color="#75BA57" />
              </View>
              <View style={styles.jobTextContent}>
                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                <Text style={styles.jobMeta}>{job.position} · {job.deadline}</Text>
              </View>
              <ChevronRight size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderReviews = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>학부모 & 선생님 후기 ({reviews.length})</Text>
        </View>

        {/* Embedded Review Input Section */}
        {profile ? (
          <View style={styles.reviewInputSection}>
            <View style={styles.ratingSelectRow}>
              <Text style={styles.ratingLabelSmall}>기본 평점 선택</Text>
              <View style={styles.starsRowSmall}>
                {[1, 2, 3, 4, 5].map(num => (
                  <TouchableOpacity key={num} onPress={() => setNewReviewRating(num)}>
                    <StarIcon 
                      size={24} 
                      color={num <= newReviewRating ? '#FACC15' : '#E2E8F0'} 
                      fill={num <= newReviewRating ? '#FACC15' : 'transparent'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingTextSmall}>{newReviewRating}점</Text>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.newReviewInput}
                placeholder="어린이집에 대한 솔직한 후기를 남겨주세요."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={newReviewContent}
                onChangeText={setNewReviewContent}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.submitReviewBtn, (!newReviewContent.trim() || isSubmittingReview) && styles.submitReviewBtnDisabled]} 
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
        ) : (
          <View style={styles.loginPromptBox}>
            <LogIn size={20} color="#64748B" />
            <Text style={styles.loginPromptText}>후기를 작성하려면 로그인이 필요합니다.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>로그인하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {reviewsLoading ? (
          <ActivityIndicator color="#75BA57" style={{ marginVertical: 32 }} />
        ) : reviews.length === 0 ? (
          <View style={styles.reviewPlaceholder}>
            <MessageSquare size={48} color="#CBD5E1" />
            <Text style={styles.reviewPlaceholderDesc}>아직 등록된 후기가 없습니다. 첫 후기를 작성해 보세요!</Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAuthorBox}>
                  <View style={[styles.userTypeBadge, { backgroundColor: review.profiles?.user_type === '선생님' ? '#FEF2F2' : '#EFF6FF' }]}>
                    <Text style={[styles.userTypeBadgeText, { color: review.profiles?.user_type === '선생님' ? '#DC2626' : '#2563EB' }]}>{review.profiles?.user_type || '학부모'}</Text>
                  </View>
                  <Text style={styles.reviewAuthor}>{review.profiles?.nickname || '익명 사용자'}</Text>
                </View>
                <View style={styles.reviewRatingBox}>
                  {[1,2,3,4,5].map(star => (
                    <StarIcon key={star} size={14} color={star <= review.rating ? '#FACC15' : '#E2E8F0'} fill={star <= review.rating ? '#FACC15' : 'transparent'} />
                  ))}
                  <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
              <Text style={styles.reviewContent}>{review.content}</Text>
              
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
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle} numberOfLines={1}>어린이집 상세</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.roadviewWrapper}>
          <KakaoRoadview lat={daycare.lat || 37.5} lng={daycare.lng || 127.0} />
          {/* Favorite Button */}
          <TouchableOpacity 
            style={styles.favBtn} 
            onPress={() => toggleFavorite(daycare)}
          >
            <Heart 
              size={24} 
              color={isFavorited(daycare.stcode) ? '#EF4444' : '#fff'} 
              fill={isFavorited(daycare.stcode) ? '#EF4444' : 'transparent'} 
            />
          </TouchableOpacity>
        </View>

          <View style={styles.topHeader}>
          <Text style={styles.typeText}>{daycare.type} 어린이집</Text>
          <Text style={styles.title}>{daycare.name}</Text>
          <Text style={styles.addr}>{daycare.addr}</Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingLabel}>학부모 평점</Text>
              <View style={styles.starRow}>
                <Star size={16} color="#75BA57" fill="#75BA57" />
                <Text style={styles.ratingScore}>{parentAvg}</Text>
              </View>
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingBox}>
              <Text style={styles.ratingLabel}>선생님 평점</Text>
              <View style={styles.starRow}>
                <Star size={16} color="#4A6CF7" fill="#4A6CF7" />
                <Text style={styles.ratingScore}>{teacherAvg}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === '기본정보' && styles.tabBtnActive]} onPress={() => setActiveTab('기본정보')}>
            <Text style={[styles.tabBtnText, activeTab === '기본정보' && styles.tabBtnTextActive]}>기본정보</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === '구인정보' && styles.tabBtnActive]} onPress={() => setActiveTab('구인정보')}>
            <Text style={[styles.tabBtnText, activeTab === '구인정보' && styles.tabBtnTextActive]}>구인정보</Text>
            {jobOffers.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{jobOffers.length}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === '후기' && styles.tabBtnActive]} onPress={() => setActiveTab('후기')}>
            <Text style={[styles.tabBtnText, activeTab === '후기' && styles.tabBtnTextActive]}>후기</Text>
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
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, highlight }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, highlight && { color: '#DC2626', fontWeight: 'bold' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 4 },
  headerLeft: { width: 48, alignItems: 'center', justifyContent: 'center' },
  headerRight: { width: 48, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', flex: 1, textAlign: 'center' },
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
  topHeader: { backgroundColor: '#fff', padding: 20, paddingTop: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  typeText: { fontSize: 13, color: '#75BA57', fontWeight: 'bold', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  addr: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  ratingContainer: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  ratingBox: { flex: 1, alignItems: 'center' },
  ratingDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
  ratingLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  starRow: { flexDirection: 'row', alignItems: 'center' },
  ratingScore: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginLeft: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabBtnActive: { backgroundColor: '#75BA57' },
  tabBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  tabBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  tabBadge: { backgroundColor: '#EF4444', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  tabContent: { paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 40, borderRadius: 16, marginTop: 10 },
  emptyText: { marginTop: 16, fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  
  cardSection: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  totalText: { fontSize: 13, fontWeight: 'bold', color: '#3B82F6', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { color: '#64748B', fontSize: 14, flex: 1 },
  value: { color: '#1E293B', fontSize: 14, fontWeight: '700', flex: 2, textAlign: 'right' },
  serviceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  serviceBadgeActive: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  serviceBadgeInactive: { backgroundColor: '#F8F9FA', borderColor: '#E2E8F0' },
  serviceText: { fontSize: 13, fontWeight: 'bold' },
  serviceTextActive: { color: '#D97706' },
  serviceTextInactive: { color: '#94A3B8' },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 24, marginBottom: 8, textAlign: 'center' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8F9FA', paddingVertical: 10, borderRadius: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  th: { flex: 1, textAlign: 'center', fontWeight: 'bold', color: '#475569', fontSize: 13 },
  td: { flex: 1, textAlign: 'center', color: '#1E293B', fontSize: 14, fontWeight: '600' },
  reviewPlaceholder: { backgroundColor: '#fff', padding: 40, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  reviewPlaceholderDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 16 },
  writeReviewBtnHeader: { backgroundColor: '#F0F9EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#DCF3D1' },
  writeReviewHeaderText: { color: '#75BA57', fontSize: 13, fontWeight: 'bold' },
  reviewItem: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reviewAuthorBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  userTypeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  reviewAuthor: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
  reviewRatingBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  reviewDate: { fontSize: 11, color: '#94A3B8', marginLeft: 6 },
  reviewContent: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 12 },
  reviewEngagement: { alignItems: 'flex-end' },
  bottomFooter: { padding: 16, marginTop: 10, paddingBottom: 40 },
  applyBtn: { backgroundColor: '#16A34A', padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#16A34A', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
  recruitBadge: { backgroundColor: '#F0F9EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#DCF3D1' },
  recruitBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#75BA57', letterSpacing: 0.5 },
  jobItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  jobIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  jobTextContent: { flex: 1 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  jobMeta: { fontSize: 13, color: '#64748B' },
  
  // Embedded Review Input Styles
  reviewInputSection: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  ratingSelectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  ratingLabelSmall: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
  starsRowSmall: { flexDirection: 'row', gap: 6 },
  ratingTextSmall: { fontSize: 13, fontWeight: '900', color: '#FACC15', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  newReviewInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#F1F5F9', minHeight: 80 },
  submitReviewBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#75BA57', justifyContent: 'center', alignItems: 'center' },
  submitReviewBtnDisabled: { backgroundColor: '#CBD5E1' },
  loginPromptBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', gap: 10 },
  loginPromptText: { flex: 1, fontSize: 13, color: '#64748B', fontWeight: '500' },
  loginLinkText: { fontSize: 13, color: '#75BA57', fontWeight: 'bold', textDecorationLine: 'underline' }
});
