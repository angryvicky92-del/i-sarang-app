import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Map, List, Star, PenTool, CheckCircle, ChevronRight, Info } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { profile } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>
            <Text style={{color:'#75BA57'}}>얼집</Text>체크
          </Text>
          <Text style={styles.subtitle}>우리 동네 어린이집 똑똑하게 찾기</Text>
        </View>

        {profile ? (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>환영합니다, {profile.nickname || '사용자'}님!</Text>
            {profile.role === 'teacher' && !profile.is_approved && (
              <View style={styles.alertBox}>
                <Info size={16} color="#EAB308" />
                <Text style={styles.alertText}>선생님 인증이 대기 중입니다. 마이페이지를 확인하세요.</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('MyPageTab')}>
            <Text style={styles.loginBtnText}>로그인하고 맞춤 리뷰 보기</Text>
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('MapTab')}>
            <View style={[styles.iconBox, {backgroundColor:'#F0FDF4'}]}><Map size={24} color="#16A34A" /></View>
            <Text style={styles.gridTitle}>내 주변 어린이집 찾기</Text>
            <Text style={styles.gridDesc}>지도에서 한눈에 확인하세요</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('ListTab')}>
            <View style={[styles.iconBox, {backgroundColor:'#EFF6FF'}]}><List size={24} color="#2563EB" /></View>
            <Text style={styles.gridTitle}>보육 정보 모아보기</Text>
            <Text style={styles.gridDesc}>가까운 어린이집 상세 현황</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('CommunityTab')}>
            <View style={[styles.iconBox, {backgroundColor:'#FEF2F2'}]}><Star size={24} color="#DC2626" /></View>
            <Text style={styles.gridTitle}>우리 동네 평점 비교</Text>
            <Text style={styles.gridDesc}>선생님/학부모 생생 리뷰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <CheckCircle size={18} color="#75BA57" style={{marginRight: 8}}/>
            <Text style={styles.infoText}>아이사랑 포털 정식 데이터 연동</Text>
          </View>
          <View style={styles.infoRow}>
            <PenTool size={18} color="#75BA57" style={{marginRight: 8}}/>
            <Text style={styles.infoText}>익명 리뷰로 안전한 의견 공유</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20 },
  header: { marginBottom: 30, marginTop: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B' },
  welcomeCard: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 16, marginBottom: 24 },
  welcomeText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', padding: 10, borderRadius: 8, marginTop: 10 },
  alertText: { fontSize: 12, color: '#854D0E', marginLeft: 6 },
  loginBtn: { backgroundColor: '#75BA57', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  grid: { gap: 16, marginBottom: 30 },
  gridItem: { backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:4}, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  gridTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  gridDesc: { fontSize: 14, color: '#64748B' },
  infoSection: { backgroundColor: '#F8F9FA', padding: 20, borderRadius: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#475569', fontWeight: '500' }
});
