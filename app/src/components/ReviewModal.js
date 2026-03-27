import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { X, Star } from 'lucide-react-native';
import { createReview } from '../services/reviewService';

export default function ReviewModal({ visible, onClose, daycare, user, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '후기 내용을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewData = {
        user_id: user.id,
        center_id: daycare.stcode,
        center_name: daycare.name,
        rating: rating,
        content: content,
        created_at: new Date().toISOString()
      };

      const result = await createReview(reviewData);
      if (result) {
        Alert.alert('성공', '후기가 등록되었습니다.');
        onSuccess && onSuccess(result);
        onClose();
        setContent('');
        setRating(5);
      } else {
        Alert.alert('오류', '후기 등록에 실패했습니다.');
      }
    } catch (e) {
      console.error('Submit review error:', e);
      Alert.alert('오류', '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalBody}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>후기 작성하기</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.daycareInfo}>
                <Text style={styles.daycareName}>{daycare?.name || '정보 없음'}</Text>
                <Text style={styles.daycareDesc}>이곳에서의 경험은 어떠셨나요?</Text>
              </View>

               <View style={styles.ratingSection}>
                 <Text style={styles.label}>별점 선택</Text>
                 <View style={styles.starsRow}>
                   {[1, 2, 3, 4, 5].map(num => (
                     <TouchableOpacity key={num} onPress={() => setRating(num)}>
                       <Star 
                         size={40} 
                         color={num <= rating ? '#FACC15' : '#E2E8F0'} 
                         fill={num <= rating ? '#FACC15' : 'transparent'} 
                       />
                     </TouchableOpacity>
                   ))}
                 </View>
                 <Text style={styles.ratingText}>{rating}점 / 5점</Text>
               </View>

               <View style={styles.contentSection}>
                 <Text style={styles.label}>내용 작성</Text>
                 <TextInput
                   style={styles.textInput}
                   placeholder="어린이집에 대한 솔직한 후기를 남겨주세요. (최소 10자 이상)"
                   placeholderTextColor="#94A3B8"
                   multiline
                   numberOfLines={6}
                   textAlignVertical="top"
                   value={content}
                   onChangeText={setContent}
                 />
               </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                style={[styles.submitBtn, (!content.trim() || isSubmitting) && styles.submitBtnDisabled]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>후기 등록하기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  keyboardView: { width: '100%' },
  modalBody: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  closeBtn: { padding: 4 },
  
  scrollContent: { padding: 24 },
  daycareInfo: { marginBottom: 32, alignItems: 'center' },
  daycareName: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 6 },
  daycareDesc: { fontSize: 14, color: '#64748B' },
  
  ratingSection: { marginBottom: 32, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '800', color: '#1E293B', alignSelf: 'flex-start', marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ratingText: { fontSize: 14, fontWeight: 'bold', color: '#FACC15' },
  
  contentSection: { marginBottom: 24 },
  textInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, height: 160, borderWidth: 1, borderColor: '#F1F5F9', color: '#1E293B', fontSize: 16 },
  
  footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  submitBtn: { height: 56, backgroundColor: '#75BA57', borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#75BA57', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  submitBtnDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
