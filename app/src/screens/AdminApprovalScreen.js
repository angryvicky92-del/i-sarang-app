import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, X, ShieldCheck } from 'lucide-react-native';
import { getPendingVerifications, processVerification } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';

export default function AdminApprovalScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    const { data, error } = await getPendingVerifications();
    if (error) {
      Alert.alert('에러', '목록을 불러오지 못했습니다.');
    } else {
      setPendingList(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleProcess = (userId, status) => {
    const action = status === 'approved' ? '승인' : '거절';
    Alert.alert(
      '인증 처리',
      `정말로 ${action}하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: action, 
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            const { error } = await processVerification(userId, status);
            if (!error) {
              Alert.alert('완료', `${action} 처리가 완료되었습니다.`);
              fetchList();
            } else {
              Alert.alert('에러', '처리 중 오류가 발생했습니다.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.nickname, { color: colors.text }]}>{item.nickname}</Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>신청일: {new Date(item.updated_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={[styles.imageWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {item.verification_image ? (
          <Image 
            source={{ uri: item.verification_image }} 
            style={styles.verificationImage} 
            resizeMode="contain"
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={[styles.noImageText, { color: colors.textMuted }]}>이미지가 없습니다.</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.approveBtn, { backgroundColor: colors.primary }]} 
          onPress={() => handleProcess(item.id, 'approved')}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.btnText}>승인하기</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.rejectBtn, { backgroundColor: isDarkMode ? `${colors.error}20` : '#FEF2F2', borderColor: isDarkMode ? colors.error : '#FEE2E2' }]} 
          onPress={() => handleProcess(item.id, 'rejected')}
        >
          <X size={20} color="#EF4444" />
          <Text style={[styles.btnText, { color: '#EF4444' }]}>거절하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>선생님 자격 승인 관리</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={pendingList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ShieldCheck size={20} color={colors.primary} />
              <Text style={[styles.listHeaderText, { color: colors.primary }]}>대기 중인 신청: {pendingList.length}건</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>대기 중인 인증 신청이 없습니다. ✨</Text>
            </View>
          }
        />
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 100 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  listHeaderText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold' },
  card: { borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1 },
  cardHeader: { marginBottom: 15 },
  nickname: { fontSize: 18, fontWeight: 'bold' },
  dateText: { fontSize: 12, marginTop: 4 },
  imageWrapper: { width: '100%', height: 250, borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1 },
  verificationImage: { width: '100%', height: '100%' },
  noImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noImageText: { },
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveBtn: { },
  rejectBtn: { borderWidth: 1 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 15 }
});
