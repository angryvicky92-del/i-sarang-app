import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { ChevronLeft, ExternalLink, Building2, MapPin, Briefcase, Calendar, Phone, Mail, User, UserCheck, Smartphone, CreditCard, Award, Clock, Star, ChevronRight } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { getDaycareByName } from '../services/dataService';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  const fetchJobDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job detail:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSummaryRow = (field, isWide = true) => {
    const value = field.value || (job.metadata ? job.metadata[field.key] : null) || job[field.key];
    if (!value || value === '-') return null;
    
    return (
      <View key={field.key} style={isWide ? styles.wideItem : styles.gridItem}>
        <View style={[styles.iconContainer, { backgroundColor: field.bgColor }]}>
          {field.icon}
        </View>
        <View style={styles.metadataTextContent}>
          <Text style={styles.metadataLabel}>{field.label || field.key}</Text>
          <Text style={[styles.metadataValue, field.highlight && styles.highlightValue]} numberOfLines={isWide ? undefined : 1}>{value}</Text>
        </View>
      </View>
    );
  };

  const renderMetadata = () => {
    if (!job.metadata || Object.keys(job.metadata).length === 0) return null;
    
    return (
      <View style={styles.metadataCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>모집요강 요약</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM INFO</Text>
          </View>
        </View>
        
        <View style={styles.summaryContainer}>
          {/* Row 1: 어린이집명 (Wide) */}
          {renderSummaryRow({ key: 'center_name', value: job.center_name, label: '어린이집명', icon: <Building2 size={16} color="#75BA57" />, bgColor: '#F0F9EB' })}
          
          {/* Row 2: Grid (담당자명, 모집직종) */}
          <View style={styles.metadataGrid}>
            {renderSummaryRow({ key: '담당자명', label: '담당자명', icon: <UserCheck size={16} color="#8B5CF6" />, bgColor: '#F5F3FF' }, false)}
            {renderSummaryRow({ key: '모집직종', label: '모집직종', icon: <Briefcase size={16} color="#F97316" />, bgColor: '#FFF7ED' }, false)}
          </View>

          {/* Row 3: 근무지주소 (Wide) */}
          {renderSummaryRow({ key: '소재지', label: '근무지 주소', icon: <MapPin size={16} color="#F59E0B" />, bgColor: '#FFFBEB' })}

          {/* Row 4: 담당자 전화번호 (Wide) */}
          {renderSummaryRow({ 
            key: 'contact_phone', 
            value: job.metadata['연락처'] || job.metadata['휴대전화'] || job.metadata['담당자전화번호'] || job.metadata['전화번호'] || job.metadata['담당자 전화번호'],
            label: '담당자 전화번호', 
            icon: <Phone size={16} color="#10B981" />, 
            bgColor: '#ECFDF5' 
          })}

          {/* Row 5: 이메일주소 (Wide) */}
          {renderSummaryRow({ key: '담당자 이메일', label: '이메일 주소', icon: <Mail size={16} color="#EC4899" />, bgColor: '#FDF2F8' })}


          {/* Row 6: 임금 (Wide) */}
          {renderSummaryRow({ key: '임금', label: '임금', icon: <CreditCard size={16} color="#DC2626" />, bgColor: '#FEF2F2', highlight: true })}

          {/* Row 7: 접수마감일 (Wide) */}
          {renderSummaryRow({ key: '접수마감일', label: '접수마감일', icon: <Calendar size={16} color="#475569" />, bgColor: '#F8FAFC', highlight: true })}
        </View>

        {/* Additional Detail Section */}
        <View style={styles.otherMetadata}>
          <View style={styles.otherHeader}>
            <Text style={styles.otherTitle}>추가 세부정보</Text>
            <View style={styles.otherDivider} />
          </View>
          {Object.entries(job.metadata).map(([key, val], idx) => {
            const summaryKeys = [
              '공유하기', '어린이집명', '담당자 전화번호', '담당자전화번호', '전화번호',
              '시설유형', '시설장명', '담당자명', '연락처', '휴대전화', 
              '모집직종', '연장보육반 전담여부', '소재지', '담당자 이메일', 
              '자격사항', '임금', '접수마감일', '제목'
            ];
            if (summaryKeys.includes(key) || key === '제목') return null;
            return (
              <View key={`other-${idx}`} style={styles.otherRow}>
                <View style={styles.otherLabelBox}>
                  <Text style={styles.otherLabel}>{key}</Text>
                </View>
                <Text style={styles.otherValue}>{val}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#75BA57" /></View>;
  if (!job) return <View style={styles.center}><Text>공고를 찾을 수 없습니다.</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.center_name}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(job.original_url)} style={styles.externalBtn}>
          <ExternalLink size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.topSection}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{job.center_type}</Text>
          </View>
          <Text style={styles.title}>{job.title}</Text>
          
          <View style={styles.postedInfo}>
            <Calendar size={14} color="#94A3B8" />
            <Text style={styles.postedDate}>작성일: {job.posted_at}</Text>
          </View>
        </View>

        {renderMetadata()}

        <View style={styles.detailSection}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#75BA57" />
            <Text style={styles.sectionTitle}>어린이집 정보</Text>
          </View>
          <View style={styles.daycareStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>학부모 평점</Text>
              <View style={styles.statStarRow}>
                <Star size={12} color="#75BA57" fill="#75BA57" />
                <Text style={styles.statValue}>{job.metadata['parentRating'] || job.metadata['평점'] || '4.5'}</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>선생님 평점</Text>
              <View style={styles.statStarRow}>
                <Star size={12} color="#4A6CF7" fill="#4A6CF7" />
                <Text style={styles.statValue}>{job.metadata['teacherRating'] || '4.2'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.viewCenterBtn}
            onPress={async () => {
              try {
                const loc = job.location || '';
                const parts = loc.split(' ');
                const district = parts[1];
                if (!district) {
                  Alert.alert('알림', '어린이집 위치 정보를 찾을 수 없습니다.');
                  return;
                }
                setLoading(true);
                const foundDc = await getDaycareByName(job.center_name, district);
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
            <Text style={styles.viewCenterBtnText}>어린이집 상세 보기</Text>
            <ChevronRight size={16} color="#75BA57" />
          </TouchableOpacity>
        </View>

        <View style={styles.detailSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>상세 모집내용</Text>
            <View style={styles.dotLine} />
          </View>
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>
              {job.content || '상세 내용이 없습니다. 원본 공고를 확인해 주세요.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.originalBtn} 
          onPress={() => Linking.openURL(job.original_url)}
        >
          <Text style={styles.originalBtnText}>중앙육아종합지원센터에서 보기</Text>
          <ExternalLink size={16} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  externalBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  
  topSection: { backgroundColor: '#fff', padding: 24, paddingBottom: 32 },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16 },
  typeText: { fontSize: 13, color: '#16A34A', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 20, lineHeight: 34, letterSpacing: -0.5 },
  postedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postedDate: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  
  metadataCard: { backgroundColor: '#fff', padding: 24, marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  premiumBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  premiumBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },

  summaryContainer: { gap: 10 },
  metadataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { 
    width: '48.5%', 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    gap: 10,
  },
  wideItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1
  },
  iconContainer: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  metadataTextContent: { flex: 1 },
  metadataLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '800', marginBottom: 2, letterSpacing: 0.2 },
  metadataValue: { fontSize: 15, color: '#1E293B', fontWeight: '800', lineHeight: 22 },
  highlightValue: { color: '#0F172A', fontWeight: '900' },

  otherMetadata: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 24 },
  otherHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  otherTitle: { fontSize: 16, fontWeight: '800', color: '#64748B' },
  otherDivider: { flex: 1, height: 1, backgroundColor: '#F1F5F9' },
  otherRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 16, 
    backgroundColor: '#F8FAFC', 
    padding: 16, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  otherLabelBox: { width: 100 },
  otherLabel: { fontSize: 13, color: '#64748B', fontWeight: '700' },
  otherValue: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600', lineHeight: 22 },

  detailSection: { padding: 24, marginTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  daycareStatsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginTop: 12 },
  statBox: { alignItems: 'center', flex: 1, minWidth: '22%' },
  statLabel: { fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  statValue: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  statStarRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewCenterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, paddingVertical: 8, gap: 4 },
  viewCenterBtnText: { fontSize: 14, color: '#75BA57', fontWeight: 'bold' },
  
  dotLine: { flex: 1, height: 1, borderStyle: 'dotted', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 1 },
  contentCard: { backgroundColor: '#F8FAFC', padding: 24, borderRadius: 24, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  contentText: { fontSize: 16, color: '#1E293B', lineHeight: 28, letterSpacing: -0.3 },
  
  originalBtn: { margin: 24, backgroundColor: '#0F172A', padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  originalBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
