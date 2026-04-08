import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, MessageSquare, Briefcase, Info, Moon, Sun, MapPin, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import RegionSelectionModal from '../components/RegionSelectionModal';

const SettingRow = ({ label, subLabel, value, onValueChange, icon: Icon, isSwitch = true, colors, isDarkMode }) => (
  <View style={[styles.settingRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
    <View style={styles.settingInfo}>
      <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}>{Icon}</View>
      <View style={styles.textColumn}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
        {subLabel && <Text style={[styles.settingSubLabel, { color: colors.textMuted }]}>{subLabel}</Text>}
      </View>
    </View>
    {isSwitch && (
      <Switch
        trackColor={{ false: colors.border, true: isDarkMode ? `${colors.primary}80` : '#DCFCE7' }}
        thumbColor={value ? colors.primary : (isDarkMode ? '#64748B' : '#94A3B8')}
        ios_backgroundColor={colors.border}
        onValueChange={onValueChange}
        value={value}
      />
    )}
  </View>
);

export default function SettingsScreen({ navigation }) {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { settings, updateSetting, toggleSetting } = useSettings();
  const [showRegionModal, setShowRegionModal] = React.useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>디자인 설정</Text>
        </View>
        
        <SettingRow 
          label="다크 모드"
          subLabel={isDarkMode ? "어두운 테마를 사용 중입니다." : "밝은 테마를 사용 중입니다."}
          value={isDarkMode}
          onValueChange={toggleTheme}
          icon={isDarkMode ? <Moon size={20} color={colors.primary} /> : <Sun size={20} color={colors.primary} />}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>알림 설정</Text>
        </View>
        
        <SettingRow 
          label="전체 푸시 알림"
          subLabel="앱에서 보내는 모든 알림을 허용합니다."
          value={settings.push}
          onValueChange={() => toggleSetting('push')}
          icon={<Bell size={20} color={colors.textSecondary} />}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        <SettingRow 
          label="커뮤니티 활동"
          subLabel="댓글, 답글, 추천 알림을 받습니다."
          value={settings.community}
          onValueChange={() => toggleSetting('community')}
          icon={<MessageSquare size={20} color={colors.textSecondary} />}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        <SettingRow 
          label="실시간 채팅 알림"
          subLabel="새로운 채팅 메시지가 올 때 알림을 받습니다."
          value={settings.chats}
          onValueChange={() => toggleSetting('chats')}
          icon={<MessageSquare size={20} color={colors.primary} />}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        <SettingRow 
          label="새로운 구인 소식"
          subLabel="관심 지역의 구인 정보를 실시간으로 받습니다."
          value={settings.jobs}
          onValueChange={() => toggleSetting('jobs')}
          icon={<Briefcase size={20} color={colors.textSecondary} />}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        {settings.jobs && (
          <TouchableOpacity 
            style={[styles.regionManageRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
            onPress={() => setShowRegionModal(true)}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}>
                <MapPin size={18} color={isDarkMode ? colors.primary : colors.textSecondary} />
              </View>
              <View style={styles.textColumn}>
                <Text style={[styles.regionLabel, { color: colors.text }]}>관심 지역 관리</Text>
              </View>
            </View>
            <View style={styles.regionRight}>
              <Text style={[styles.regionCount, { color: colors.primary }]}>
                {settings.interestedRegions?.length || 0}개
              </Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}

        <SettingRow 
          label="마케팅 및 혜택"
          subLabel="이벤트 및 할인 정보를 받습니다."
          value={settings.marketing}
          onValueChange={() => toggleSetting('marketing')}
          icon={<Info size={20} color={colors.textSecondary} />}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        <View style={styles.footerInfo}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>버전 정보 1.0.4 (최신)</Text>
        </View>
      </ScrollView>

      <RegionSelectionModal 
        visible={showRegionModal} 
        onClose={() => setShowRegionModal(false)}
        selectedRegions={settings.interestedRegions || []}
        onUpdate={(regions) => updateSetting('interestedRegions', regions)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    height: 64, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1 },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  settingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 0.5,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  textColumn: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  settingSubLabel: { fontSize: 13, lineHeight: 18 },
  footerInfo: { paddingVertical: 40, alignItems: 'center' },
  versionText: { fontSize: 12, fontWeight: '500' },
  regionManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  regionLabel: { fontSize: 16, fontWeight: '600' },
  regionRight: { flexDirection: 'row', alignItems: 'center' },
  regionCount: { fontSize: 14, fontWeight: '700', marginRight: 4 }
});
