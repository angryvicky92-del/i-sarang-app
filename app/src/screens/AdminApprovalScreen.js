import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { ChevronLeft, Check, X, ShieldCheck } from 'lucide-react-native';
import { getPendingVerifications, processVerification } from '../services/authService';

export default function AdminApprovalScreen({ navigation }) {
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.nickname}>{item.nickname}</Text>
          <Text style={styles.dateText}>신청일: {new Date(item.updated_at).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.imageWrapper}>
        {item.verification_image ? (
          <Image 
            source={{ uri: item.verification_image }} 
            style={styles.verificationImage} 
            resizeMode="contain"
          />
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>이미지가 없습니다.</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.approveBtn]} 
          onPress={() => handleProcess(item.id, 'approved')}
        >
          <Check size={20} color="#fff" />
          <Text style={styles.btnText}>승인하기</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.rejectBtn]} 
          onPress={() => handleProcess(item.id, 'rejected')}
        >
          <X size={20} color="#EF4444" />
          <Text style={[styles.btnText, { color: '#EF4444' }]}>거절하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>선생님 자격 승인 관리</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#75BA57" />
        </View>
      ) : (
        <FlatList
          data={pendingList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ShieldCheck size={20} color="#75BA57" />
              <Text style={styles.listHeaderText}>대기 중인 신청: {pendingList.length}건</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>대기 중인 인증 신청이 없습니다. ✨</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    height: 60, 
    backgroundColor: '#fff', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginLeft: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 100 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  listHeaderText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#75BA57' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { marginBottom: 15 },
  nickname: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  dateText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  imageWrapper: { width: '100%', height: 250, backgroundColor: '#F8F9FA', borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  verificationImage: { width: '100%', height: '100%' },
  noImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#94A3B8' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveBtn: { backgroundColor: '#75BA57' },
  rejectBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { padding: 60, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 15 }
});
