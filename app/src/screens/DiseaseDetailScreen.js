import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Info, AlertTriangle, CheckCircle, Shield, Clock, Calendar, FileText } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { diseaseService } from '../services/diseaseService';

const { width } = Dimensions.get('window');

const DISEASE_GUIDES = {
  '수족구병': {
    symptoms: ['손·발의 물집성 발진', '입안의 수포와 궤양', '발열', '식욕 부진'],
    incubation: '3~7일',
    isolation: '발병 후 7~10일 (수포가 마를 때까지)',
    attendance: '해열제 복용 없이 24시간 동안 열이 없고, 모든 수포가 딱지로 가라앉은 후 의사 소견서 지참 시 등원 가능',
    prevention: ['비누로 30초 이상 손 씻기', '장난감, 집기 등 소독하기', '배설물이 묻은 의류 철저히 세탁'],
    color: '#EF4444'
  },
  '독감': {
    symptoms: ['38도 이상의 갑작스러운 고열', '근육통', '두통', '기침 및 인후통'],
    incubation: '1~4일 (평균 2일)',
    isolation: '해열 후 24시간이 경과할 때까지',
    attendance: '해열제 없이 열이 내린 후 24시간이 지나고, 증상이 호전된 경우 등원 가능',
    prevention: ['매년 예방접종 필수', '마스크 착용', '기침 예절 준수'],
    color: '#10B981'
  },
  '수두': {
    symptoms: ['급성 미열', '신체 전반의 가려움증을 동반한 수포', '딱지 형성'],
    incubation: '10~21일 (평균 14~16일)',
    isolation: '모든 수포에 딱지가 앉을 때까지',
    attendance: '모든 발진에 딱지가 생기고 새로운 발진이 나타나지 않을 때 등원 가능 (보통 5~7일)',
    prevention: ['수두 예방접종', '환자와의 접촉 피하기', '비누로 손 씻기'],
    color: '#F59E0B'
  },
  '백일해': {
    symptoms: ['발작적인 기침', '기침 후 "흡" 하는 소리', '구토', '안면 홍조'],
    incubation: '7~10일 (4~21일)',
    isolation: '적절한 항생제 치료 시작 후 5일까지',
    attendance: '항생제 복용 시작 후 5일이 경과하거나, 치료를 받지 않은 경우 기침 시작 후 3주간 격리 권장',
    prevention: ['DTaP 예방접종 필수', '임신부 및 고령자 추가 접종 권장'],
    color: '#6366F1'
  },
  '홍역': {
    symptoms: ['고열', '기침', '콧물', '결막염', '특징적인 홍반성 구진상 발진'],
    incubation: '7~21일 (평균 10~12일)',
    isolation: '발진 발생 후 4일까지',
    attendance: '발진이 나타난 후 4일이 경과할 때까지 등원 중지',
    prevention: ['MMR 예방접종 2회 완료', '손 씻기 및 기침 예절'],
    color: '#EF4444'
  },
  '유행성이하선염': {
    symptoms: ['귀밑샘 부종 및 통증', '발열', '두통', '근육통'],
    incubation: '12~25일 (평균 16~18일)',
    isolation: '증상 발현 후 5일까지',
    attendance: '종창(부종) 발생 후 5일까지 등원 중지',
    prevention: ['MMR 예방접종', '환자와의 접촉 피하기'],
    color: '#F59E0B'
  },
  '풍진': {
    symptoms: ['미열', '림프절 종대', '발진'],
    incubation: '14~23일',
    isolation: '발진 발생 후 7일까지',
    attendance: '발진이 나타난 후 7일까지 등원 중지',
    prevention: ['MMR 예방접종', '임신부 접촉 주의'],
    color: '#10B981'
  },
  '성홍열': {
    symptoms: ['고열', '인후통', '딸기 모양의 혀', '전신 발진'],
    incubation: '1~7일',
    isolation: '항생제 치료 시작 후 24시간까지',
    attendance: '적절한 항생제 치료 시작 후 24시간이 경과할 때까지 등원 중지',
    prevention: ['손 씻기', '장난감 소독', '기침 예절'],
    color: '#EF4444'
  },
  '아데노바이러스': {
    symptoms: ['고열', '인후통', '결막염', '구토 또는 설사'],
    incubation: '2~14일',
    isolation: '증상 소실 시까지',
    attendance: '주요 증상이 호전되고 전염력이 없다고 의사가 판단할 때까지 등원 중지',
    prevention: ['개인위생 철저', '수영장 등 다중이용시설 주의'],
    color: '#3B82F6'
  },
  '마이코플라즈마': {
    symptoms: ['38도 이상의 발열', '심하고 오래가는 기침', '가래'],
    incubation: '1~4주',
    isolation: '증상 완화 시까지',
    attendance: '해열 후 전신 상태가 호전될 때까지 등원 중지 권고 (의사 소견 중요)',
    prevention: ['마크스 착용', '기침 예절'],
    color: '#6366F1'
  },
  '노로바이러스': {
    symptoms: ['메스꺼움 및 구토', '설사', '복통', '근육통'],
    incubation: '12~48시간',
    isolation: '증상 소실 후 48시간까지',
    attendance: '구토 및 설사 증상이 완전히 멈춘 후 48시간이 경과할 때까지 등원 중지',
    prevention: ['음식 익혀 먹기', '물 끓여 마시기', '비누로 손 씻기'],
    color: '#10B981'
  },
  '로타바이러스': {
    symptoms: ['심한 설사', '구토', '발열', '복통'],
    incubation: '1~3일',
    isolation: '증상 소실 시까지',
    attendance: '설사 증상이 멈추고 전신 상태가 회복될 때까지 등원 중지',
    prevention: ['로타바이러스 예방접종', '기저귀 교체 후 손 씻기'],
    color: '#F59E0B'
  },
  '유행성결막염': {
    symptoms: ['눈의 충혈', '인두통', '눈곱', '눈물 흘림'],
    incubation: '수일~1주일',
    isolation: '약 1~2주 (전염 기간)',
    attendance: '전염력이 없어졌다는 의사의 판단이 있을 때까지 등원 중지',
    prevention: ['눈 비비지 않기', '수건 등 개인용품 따로 쓰기'],
    color: '#3B82F6'
  }
};

export default function DiseaseDetailScreen({ navigation, route }) {
  const { colors, isDarkMode } = useTheme();
  const initialDisease = route.params?.diseaseName || '수족구병';
  const initialAdvisories = route.params?.initialAdvisories || [];
  const [selectedDisease, setSelectedDisease] = React.useState(initialDisease);
  const [advisories, setAdvisories] = React.useState(initialAdvisories);

  React.useEffect(() => {
    const fetchAdvisories = async () => {
      // Background update
      const data = await diseaseService.getLatestAdvisories();
      if (data) setAdvisories(data);
    };
    // Only fetch if we don't have initial data, or always fetch in background
    fetchAdvisories();
  }, []);

  const currentAdvisory = advisories.find(a => a.disease_name === selectedDisease) || { status: 'safe', disease_name: selectedDisease };
  const guide = DISEASE_GUIDES[selectedDisease] || DISEASE_GUIDES['수족구병'];

  const statusConfig = {
    danger: { label: '경보', color: '#EF4444', icon: AlertTriangle, sub: '현재 매우 광범위하게 유행하고 있습니다.' },
    caution: { label: '주의', color: '#F59E0B', icon: Info, sub: '유행의 조짐이 보여 주의가 필요합니다.' },
    safe: { label: '안전', color: '#10B981', icon: CheckCircle, sub: '현재 유행 수준이 낮아 비교적 안전한 상태입니다.' }
  };
  const config = statusConfig[currentAdvisory.status] || statusConfig.safe;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>감염병 등원 가이드</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {Object.keys(DISEASE_GUIDES).map(name => {
            const adv = advisories.find(a => a.disease_name === name);
            const isSelected = selectedDisease === name;
            const hasAlert = adv && adv.status !== 'safe';
            return (
              <TouchableOpacity 
                key={name} 
                onPress={() => setSelectedDisease(name)}
                style={[styles.tabItem, isSelected && { borderBottomColor: colors.primary }]}
              >
                <Text style={[styles.tabText, { color: isSelected ? colors.primary : colors.textSecondary }, isSelected && { fontWeight: '900' }]}>{name}</Text>
                {hasAlert && <View style={[styles.alertDot, { backgroundColor: adv.status === 'danger' ? '#EF4444' : '#F59E0B' }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: config.color + '15', borderColor: config.color + '30', borderWidth: 1 }]}>
          <config.icon size={48} color={config.color} style={{ marginBottom: 16 }} />
          <View style={[styles.heroBadge, { backgroundColor: config.color }]}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>유행 {config.label}</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{selectedDisease}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{config.sub}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>주요 증상</Text>
          </View>
          <View style={styles.symptomGrid}>
            {guide.symptoms.map((s, idx) => (
              <View key={idx} style={[styles.symptomItem, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}>
                <Text style={[styles.symptomText, { color: colors.text }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Clock size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>잠복기</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{guide.incubation}</Text>
          </View>
          <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Calendar size={20} color="#EF4444" />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>격리 기간</Text>
            <Text style={[styles.infoValue, { color: '#EF4444' }]}>{guide.isolation}</Text>
          </View>
        </View>

        <View style={[styles.guideCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <View style={styles.sectionHeader}>
            <FileText size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>어린이집 등원 기준</Text>
          </View>
          <Text style={[styles.guideText, { color: colors.text }]}>{guide.attendance}</Text>
          <View style={styles.tipBox}>
             <CheckCircle size={14} color={colors.primary} />
             <Text style={[styles.tipText, { color: colors.textSecondary }]}>완치 확인서 또는 의사 소견서가 필요할 수 있습니다.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={18} color="#4A6CF7" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>예방 수칙</Text>
          </View>
          {guide.prevention.map((p, idx) => (
            <View key={idx} style={styles.preventionItem}>
              <View style={[styles.preventionDot, { backgroundColor: '#4A6CF7' }]} />
              <Text style={[styles.preventionText, { color: colors.textSecondary }]}>{p}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 56 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  
  tabBar: { height: 48, borderBottomWidth: 1 },
  tabItem: { paddingHorizontal: 16, height: 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', position: 'relative' },
  tabText: { fontSize: 14, fontWeight: '600' },
  alertDot: { position: 'absolute', top: 10, right: 6, width: 6, height: 6, borderRadius: 3 },

  scroll: { padding: 24 },
  
  heroCard: { alignItems: 'center', padding: 32, borderRadius: 32, marginBottom: 32 },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, fontWeight: '600' },
  
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  
  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  symptomItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  symptomText: { fontSize: 14, fontWeight: '600' },
  
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  infoBox: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: '800' },
  
  guideCard: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 32 },
  guideText: { fontSize: 15, lineHeight: 24, fontWeight: '600', marginBottom: 16 },
  tipBox: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  tipText: { fontSize: 12, fontWeight: '500' },
  
  preventionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  preventionDot: { width: 6, height: 6, borderRadius: 3 },
  preventionText: { fontSize: 14, fontWeight: '500' }
});
