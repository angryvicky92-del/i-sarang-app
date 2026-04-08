import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ExternalLink, Building2, MapPin, Briefcase, Calendar, Phone, Mail, User, UserCheck, Smartphone, CreditCard, Award, Clock, Star, ChevronRight, Heart, Copy, Check, Bookmark, Eye } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../services/supabaseClient';
import { getDaycareByInfo, TYPE_COLORS, TYPE_GOK } from '../services/dataService';
import { getReviewAverages } from '../services/reviewService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AdBanner from '../components/AdBanner';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const { session } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [job, setJob] = useState(null);
  const [liveRatings, setLiveRatings] = useState({ parentAvg: '0.0', teacherAvg: '0.0' });
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    fetchJobDetail();
    incrementViewCount();
  }, [jobId]);

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_views', { table_name: 'job_offers', row_id: jobId });
    } catch (error) {
      console.error('Error incrementing job views:', error);
    }
  };

  useEffect(() => {
    if (session && jobId) {
      checkFavoriteStatus();
    }
  }, [session, jobId]);

  const checkFavoriteStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('job_favorites')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('job_id', jobId)
        .maybeSingle();
      
      if (!error && data) {
        setIsFavorited(true);
      }
    } catch (e) {
      console.log('Error checking favorite status:', e);
    }
  };

  const toggleFavorite = async () => {
    if (!session) {
      Alert.alert('로그인 필요', '관심 공고를 저장하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인하기', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    if (isToggling) return;
    setIsToggling(true);

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('job_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('job_id', jobId);
        
        if (error) throw error;
        setIsFavorited(false);
      } else {
        const { error } = await supabase
          .from('job_favorites')
          .insert({
            user_id: session.user.id,
            job_id: jobId,
            job_snapshot: {
              id: job.id,
              title: job.title,
              center_name: job.center_name,
              location: job.location,
              deadline: job.deadline,
              center_type: job.center_type,
              posted_at: job.posted_at
            }
          });
        
        if (error) throw error;
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('오류', '관심 목록 추가/삭제 중 문제가 발생했습니다.');
    } finally {
      setIsToggling(false);
    }
  };

  const fetchJobDetail = async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      setJob(data);

      // Fetch Live Ratings
      if (data.center_id) {
        const ratings = await getReviewAverages(data.center_id);
        setLiveRatings(ratings);
      }
    } catch (error) {
      console.error('Error fetching job detail:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const [copiedField, setCopiedField] = useState(null);
  const [showToast, setShowToast] = useState(false);

  const handleCopy = async (text, fieldName) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(fieldName);
    setShowToast(true);
    setTimeout(() => {
      setCopiedField(null);
      setShowToast(false);
    }, 2000);
  };

  const renderSummaryRow = (field, isWide = true) => {
    const value = field.value || (job.metadata ? job.metadata[field.key] : null) || job[field.key];
    if (!value || value === '-') return null;

    const isPhone = field.key.includes('phone') || field.label?.includes('전화');
    const isEmail = field.key.includes('email') || field.label?.includes('이메일');
    
    return (
      <View key={field.key} style={[isWide ? styles.wideItem : styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDarkMode ? colors.background : field.bgColor }]}>
          {field.icon}
        </View>
        <View style={styles.metadataTextContent}>
          <Text style={[styles.metadataLabel, { color: colors.textMuted }]}>{field.label || field.key}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.metadataValue, { color: colors.text }, field.highlight && { color: isDarkMode ? colors.primary : '#0F172A' }]} numberOfLines={isWide ? undefined : 1}>
              {value}
            </Text>
            {isPhone && (
              <TouchableOpacity 
                onPress={() => Linking.openURL(`tel:${value.replace(/[^0-9]/g, '')}`)}
                style={[styles.actionIconBtn, { backgroundColor: colors.background }]}
              >
                <Phone size={14} color={colors.primary} fill={colors.primary} />
              </TouchableOpacity>
            )}
            {isEmail && (
              <TouchableOpacity 
                onPress={() => handleCopy(value, field.key)}
                style={[styles.actionIconBtn, { backgroundColor: colors.background }]}
              >
                {copiedField === field.key ? (
                  <Check size={14} color={colors.primary} />
                ) : (
                  <Copy size={14} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderMetadata = () => {
    if (!job.metadata || Object.keys(job.metadata).length === 0) return null;
    
    return (
      <View style={[styles.metadataCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>모집요강 요약</Text>
          <View style={[styles.premiumBadge, { backgroundColor: isDarkMode ? colors.background : colors.border, borderColor: colors.border }]}>
            <Text style={[styles.premiumBadgeText, { color: colors.textMuted }]}>PREMIUM INFO</Text>
          </View>
        </View>
        
        <View style={styles.summaryContainer}>
          {/* Row 1: 어린이집명 (Wide) */}
          {renderSummaryRow({ key: 'center_name', value: job.center_name, label: '어린이집명', icon: <Building2 size={16} color={colors.primary} />, bgColor: isDarkMode ? colors.background : '#F0F9EB' })}
          
          {/* Row 2: Grid (담당자명, 모집직종) */}
          <View style={styles.metadataGrid}>
            {renderSummaryRow({ key: '담당자명', label: '담당자명', icon: <UserCheck size={16} color={isDarkMode ? colors.primary : "#8B5CF6"} />, bgColor: isDarkMode ? colors.background : '#F5F3FF' }, false)}
            {renderSummaryRow({ key: '모집직종', label: '모집직종', icon: <Briefcase size={16} color={isDarkMode ? colors.primary : "#F97316"} />, bgColor: isDarkMode ? colors.background : '#FFF7ED' }, false)}
          </View>

          {/* Row 3: 근무지주소 (Wide) */}
          {renderSummaryRow({ key: '소재지', label: '근무지 주소', icon: <MapPin size={16} color={isDarkMode ? colors.primary : "#F59E0B"} />, bgColor: isDarkMode ? colors.background : '#FFFBEB' })}

          {/* Row 4: 담당자 전화번호 (Wide) */}
          {renderSummaryRow({ 
            key: 'contact_phone', 
            value: job.metadata['연락처'] || job.metadata['휴대전화'] || job.metadata['담당자전화번호'] || job.metadata['전화번호'] || job.metadata['담당자 전화번호'],
            label: '담당자 전화번호', 
            icon: <Phone size={16} color={isDarkMode ? colors.primary : "#10B981"} />, 
            bgColor: isDarkMode ? colors.background : '#ECFDF5' 
          })}

          {/* Row 5: 이메일주소 (Wide) */}
          {renderSummaryRow({ key: '담당자 이메일', label: '이메일 주소', icon: <Mail size={16} color={isDarkMode ? colors.primary : "#EC4899"} />, bgColor: isDarkMode ? colors.background : '#FDF2F8' })}


          {/* Row 6: 임금 (Wide) */}
          {renderSummaryRow({ key: '임금', label: '임금', icon: <CreditCard size={16} color={isDarkMode ? colors.primary : "#DC2626"} />, bgColor: isDarkMode ? colors.background : '#FEF2F2', highlight: true })}

          {/* Row 7: 접수마감일 (Wide) */}
          {renderSummaryRow({ key: '접수마감일', label: '접수마감일', icon: <Calendar size={16} color={colors.textSecondary} />, bgColor: isDarkMode ? colors.background : '#F8FAFC', highlight: true })}
        </View>

        <AdBanner style={{ marginHorizontal: 20 }} />

        {/* Additional Detail Section */}
        <View style={[styles.otherMetadata, { borderTopColor: colors.border }]}>
          <View style={styles.otherHeader}>
            <Text style={[styles.otherTitle, { color: colors.textSecondary }]}>추가 세부정보</Text>
            <View style={[styles.otherDivider, { backgroundColor: colors.border }]} />
          </View>
          {Object.entries(job.metadata).map(([key, val], idx) => {
            const summaryKeys = [
              '공유하기', '어린이집명', '담당자 전화번호', '담당자전화번호', '전화번호',
              '시설유형', '시설장명', '담당자명', '연락처', '휴대전화', 
              '모집직종', '연장보육반 전담여부', '소재지', '담당자 이메일', 
              '자격사항', '임금', '접수마감일', '제목', '채용제목', '채용제목_잠정'
            ];
            if (summaryKeys.includes(key)) return null;
            return (
              <View key={`other-${idx}`} style={[styles.otherRow, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }]}>
                <View style={styles.otherLabelBox}>
                  <Text style={[styles.otherLabel, { color: colors.textSecondary }]}>{key}</Text>
                </View>
                <Text style={[styles.otherValue, { color: colors.text }]}>{val}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (!job) return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>공고를 찾을 수 없습니다.</Text></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{job.center_name}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.topSection, { backgroundColor: colors.card }]}>
          <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[job?.center_type] || colors.primary }]}>
            <Text style={[styles.typeBadgeText, { color: job?.center_type === TYPE_GOK ? '#1E293B' : '#fff' }]}>
              {job?.center_type}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 4 }}>
            <View style={[styles.postedInfo, { marginTop: 0 }]}>
              <Calendar size={14} color={colors.textMuted} />
              <Text style={[styles.postedDate, { color: colors.textMuted }]}>작성일: {job.posted_at || '최근'}</Text>
              <View style={{ width: 8 }} />
              <Eye size={14} color={colors.textMuted} />
              <Text style={[styles.postedDate, { color: colors.textMuted }]}>조회: {job.views || 0}</Text>
            </View>
            <TouchableOpacity 
              onPress={toggleFavorite} 
              disabled={isToggling}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: isDarkMode ? colors.background : '#F1F5F9', borderRadius: 8 }}
            >
              <Bookmark 
                size={16} 
                color={isFavorited ? colors.primary : colors.textSecondary} 
                fill={isFavorited ? colors.primary : "transparent"} 
              />
              <Text style={{ fontSize: 13, color: isFavorited ? colors.primary : colors.textSecondary, fontWeight: 'bold' }}>
                {isFavorited ? '스크랩 완료' : '스크랩'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderMetadata()}

        <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>어린이집 정보</Text>
          </View>
          <View style={[styles.daycareStatsRow, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>학부모 평점</Text>
              <View style={styles.statStarRow}>
                <Star size={12} color={colors.primary} fill={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{liveRatings.parentAvg}</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>선생님 평점</Text>
              <View style={styles.statStarRow}>
                <Star size={12} color="#4A6CF7" fill="#4A6CF7" />
                <Text style={[styles.statValue, { color: colors.text }]}>{liveRatings.teacherAvg}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.viewCenterBtn}
            onPress={async () => {
              try {
                const loc = job.location || '';
                // Get the most detailed address available
                let detailedAddr = job.metadata ? (job.metadata['소재지'] || job.metadata['근무지 주소']) : null;
                if (!detailedAddr) detailedAddr = loc; // Fallback to location field (e.g. "인천 서구")

                // Try to extract district from detailedAddr first (more reliable)
                let district = '';
                const addrParts = detailedAddr.split(' ');
                for (const part of addrParts) {
                    // Match district names like "성동구", "강남구", "가평군", "수원시"
                    const isMajorCity = part.length > 4 && (part.endsWith('특별시') || part.endsWith('광역시') || part.endsWith('자치도'));
                    if (!isMajorCity && part.length > 1 && (part.endsWith('구') || part.endsWith('군') || (part.endsWith('시') && part.length > 2))) {
                        district = part;
                        break;
                    }
                }
                
                // Fallback to location field
                if (!district) {
                  const parts = loc.split(' ');
                  district = parts.find(p => p.endsWith('구') || p.endsWith('군')) || parts[parts.length > 1 ? 1 : 0];
                }

                // If loc contains Sido but detailedAddr doesn't, combine them for better matching
                let finalFullAddr = detailedAddr;
                if (loc.length > 1 && !detailedAddr.includes(loc.substring(0, 2))) {
                   finalFullAddr = `${loc} ${detailedAddr}`;
                }

                if (district === '세종' || finalFullAddr.includes('세종')) district = '';

                setLoading(true);
                const foundDc = await getDaycareByInfo(job.center_name, district, finalFullAddr);
                setLoading(false);
                
                if (foundDc) {
                  navigation.navigate('Detail', { daycare: foundDc });
                } else {
                  Alert.alert('알림', '어린이집 정보를 찾을 수 없습니다.');
                }
              } catch (e) {
                setLoading(false);
                Alert.alert('오류', '데이터 처리 중 오류가 발생했습니다.');
              }
            }}
          >
            <Text style={[styles.viewCenterBtnText, { color: colors.primary }]}>어린이집 상세 보기</Text>
            <ChevronRight size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.detailSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>상세 모집내용</Text>
            <View style={[styles.dotLine, { borderColor: colors.border }]} />
          </View>
          <View style={[styles.contentCard, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }]}>
            <Text style={[styles.contentText, { color: colors.text }]}>
              {job.content || '상세 내용이 없습니다. 원본 공고를 확인해 주세요.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.originalBtn, { backgroundColor: isDarkMode ? colors.primary : '#0F172A' }]} 
          onPress={() => Linking.openURL(job.original_url)}
        >
          <Text style={styles.originalBtnText}>중앙육아종합지원센터에서 보기</Text>
          <ExternalLink size={16} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={[styles.toast, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }]}>
            <Text style={[styles.toastText, { color: isDarkMode ? '#000' : '#fff' }]}>복사되었습니다.</Text>
          </View>
        </View>
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
    borderBottomWidth: 1, 
    paddingHorizontal: 4 
  },
  headerLeft: { width: 48, alignItems: 'center', justifyContent: 'center' },
  headerRight: { width: 48, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800', flex: 1, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  
  topSection: { padding: 24, paddingBottom: 32 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  typeBadgeText: { fontSize: 13, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 20, lineHeight: 34, letterSpacing: -0.5 },
  postedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postedDate: { fontSize: 14, fontWeight: '500' },
  
  metadataCard: { padding: 24, marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 24 },
  sectionTitle: { fontSize: 19, fontWeight: '800' },
  premiumBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  premiumBadgeText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  summaryContainer: { gap: 10 },
  metadataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { 
    width: '48.5%', 
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    gap: 10,
  },
  wideItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1
  },
  iconContainer: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  metadataTextContent: { flex: 1 },
  metadataLabel: { fontSize: 11, fontWeight: '800', marginBottom: 2, letterSpacing: 0.2 },
  metadataValue: { fontSize: 15, fontWeight: '800', lineHeight: 22 },
  
  otherMetadata: { marginTop: 32, borderTopWidth: 1, paddingTop: 24 },
  otherHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  otherTitle: { fontSize: 16, fontWeight: '800' },
  otherDivider: { flex: 1, height: 1 },
  otherRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16, 
    padding: 16, 
    borderRadius: 16,
    borderWidth: 1
  },
  otherLabelBox: { width: 140 },
  otherLabel: { fontSize: 13, fontWeight: '700' },
  otherValue: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 22 },

  detailSection: { padding: 24, marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  daycareStatsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginTop: 12 },
  statBox: { alignItems: 'center', flex: 1, minWidth: '22%' },
  statLabel: { fontSize: 12, marginBottom: 4, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800' },
  statStarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCenterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 8, gap: 4 },
  viewCenterBtnText: { fontSize: 14, fontWeight: 'bold' },
  
  dotLine: { flex: 1, height: 1, borderStyle: 'dotted', borderWidth: 1, borderRadius: 1 },
  contentCard: { padding: 24, borderRadius: 24, marginTop: 16, borderWidth: 1 },
  contentText: { fontSize: 16, lineHeight: 28, letterSpacing: -0.3 },
  
  originalBtn: { margin: 24, padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  originalBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionIconBtn: { padding: 4, borderRadius: 8, marginLeft: 4 },
  toastContainer: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 9999 },
  toast: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  toastText: { fontSize: 14, fontWeight: 'bold' }
});
