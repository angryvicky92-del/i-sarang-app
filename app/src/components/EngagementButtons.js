import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { toggleVote } from '../services/engagementService';
import { useNavigation } from '@react-navigation/native';

/**
 * 추천/비추천 버튼 컴포넌트
 * @param {string} targetType - 'post', 'comment', 'review'
 * @param {string|number} targetId - 콘텐츠 ID
 * @param {object} item - 콘텐츠 데이터 (upvotes, downvotes 포함)
 * @param {number} userVote - 사용자의 현재 투표 상태 (1, -1, 0)
 * @param {string} userId - 사용자 ID
 * @param {function} onUpdate - 투표 후 업데이트 콜백
 */
export default function EngagementButtons({ targetType, targetId, item, userVote, userId, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  // Note: review uses 'likes' instead of 'upvotes'
  const upCount = targetType === 'review' ? (item.likes || 0) : (item.upvotes || 0);
  const downCount = targetType === 'review' ? (item.dislikes || 0) : (item.downvotes || 0);

  const handleVote = async (voteType) => {
    if (!userId) {
      Alert.alert('알림', '로그인이 필요한 기능입니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    // [OPTIMISTIC UPDATE] 
    // Calculate new state immediately
    const isRemoving = userVote === voteType;
    const isChanging = userVote !== 0 && !isRemoving;
    
    let newUp = upCount;
    let newDown = downCount;
    let newUserVote = isRemoving ? 0 : voteType;

    if (voteType === 1) {
      if (isRemoving) newUp = Math.max(0, newUp - 1);
      else {
        newUp++;
        if (isChanging) newDown = Math.max(0, newDown - 1);
      }
    } else {
      if (isRemoving) newDown = Math.max(0, newDown - 1);
      else {
        newDown++;
        if (isChanging) newUp = Math.max(0, newUp - 1);
      }
    }

    // Call update with optimistic values
    onUpdate && onUpdate({
      ...(targetType === 'review' ? { likes: newUp, dislikes: newDown } : { upvotes: newUp, downvotes: newDown }),
      userVote: newUserVote
    });

    setLoading(true);
    try {
      const result = await toggleVote(targetType, targetId, userId, voteType);
      if (!result) {
        // Rollback on failure
        onUpdate && onUpdate({
          ...(targetType === 'review' ? { likes: upCount, dislikes: downCount } : { upvotes: upCount, downvotes: downCount }),
          userVote: userVote
        });
        Alert.alert('오류', '투표 처리에 실패했습니다.');
      }
    } catch (e) {
      console.error('Vote action error:', e);
      // Rollback on error
      onUpdate && onUpdate({
          ...(targetType === 'review' ? { likes: upCount, dislikes: downCount } : { upvotes: upCount, downvotes: downCount }),
          userVote: userVote
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.btn, userVote === 1 && styles.activeUp]} 
        onPress={() => handleVote(1)}
        disabled={loading}
      >
        <ThumbsUp size={16} color={userVote === 1 ? '#fff' : '#64748B'} fill={userVote === 1 ? '#fff' : 'transparent'} />
        <Text style={[styles.countText, userVote === 1 && styles.activeText]}>{upCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.btn, userVote === -1 && styles.activeDown]} 
        onPress={() => handleVote(-1)}
        disabled={loading}
      >
        <ThumbsDown size={16} color={userVote === -1 ? '#fff' : '#64748B'} fill={userVote === -1 ? '#fff' : 'transparent'} />
        <Text style={[styles.countText, userVote === -1 && styles.activeText]}>{downCount}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="small" color="#75BA57" style={{ marginLeft: 8 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 20, 
    backgroundColor: '#F1F5F9' 
  },
  activeUp: { backgroundColor: '#75BA57' },
  activeDown: { backgroundColor: '#F87171' },
  countText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  activeText: { color: '#fff' }
});
