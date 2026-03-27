import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

export default function WritePostScreen({ navigation }) {
  const { session, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진첩 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('알림', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    if (!session || !profile) {
      Alert.alert('알림', '로그인이 필요한 서비스입니다.');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      if (imageBase64 && imageUri) {
        const fileExt = imageUri.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('community')
          .upload(filePath, decode(imageBase64), { contentType: `image/${fileExt}` });

        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('community').getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('posts').insert([
        {
          author_id: session.user.id,
          author: profile.nickname || '익명',
          title: title.trim(),
          content: content.trim(),
          type: profile.role === 'teacher' ? '선생님' : '학부모',
          image_url: imageUrl
        }
      ]);

      if (error) throw error;

      Alert.alert('성공', '게시글이 등록되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('에러', error.message || '게시글 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>글쓰기</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.submitBtn}>
            <Text style={[styles.submitText, loading && styles.disabledText]}>
              {loading ? '등록중' : '등록'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.form}>
          <TextInput
            style={styles.inputTitle}
            placeholder="제목을 입력하세요."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            maxLength={50}
          />
          <TextInput
            style={styles.inputContent}
            placeholder="내용을 자유롭게 남겨주세요."
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
          
          <View style={styles.imageSection}>
            <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
              <ImageIcon size={24} color="#64748B" />
              <Text style={styles.imageBtnText}>사진 첨부하기</Text>
            </TouchableOpacity>
            
            {imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => { setImageUri(null); setImageBase64(null); }}>
                  <X size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  closeBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  submitBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#75BA57', borderRadius: 20 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  disabledText: { opacity: 0.7 },
  form: { padding: 20 },
  inputTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 12 },
  inputContent: { fontSize: 16, color: '#334155', minHeight: 200, lineHeight: 24, marginBottom: 20 },
  imageSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12, alignSelf: 'flex-start' },
  imageBtnText: { marginLeft: 8, color: '#64748B', fontWeight: 'bold' },
  imagePreviewContainer: { marginTop: 16, position: 'relative', width: 120, height: 120 },
  imagePreview: { width: 120, height: 120, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }
});
