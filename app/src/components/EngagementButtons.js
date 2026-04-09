import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { toggleVote } from '../services/engagementService';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors, isDarkMode } = useTheme();

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
        style={[
          styles.btn, 
          { backgroundColor: isDarkMode ? colors.cardSecondary : '#F1F5F9' },
          userVote === 1 && { backgroundColor: colors.primary }
        ]} 
        onPress={() => handleVote(1)}
        disabled={loading}
        accessibilityLabel={`추천, 현재 ${upCount}개`}
        accessibilityRole="button"
        accessibilityState={{ selected: userVote === 1 }}
      >
        <ThumbsUp size={14} color={userVote === 1 ? '#fff' : colors.textSecondary} fill={userVote === 1 ? '#fff' : 'transparent'} />
        <Text style={[styles.countText, { color: colors.textSecondary }, userVote === 1 && styles.activeText]}>{upCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.btn, 
          { backgroundColor: isDarkMode ? colors.cardSecondary : '#F1F5F9' },
          userVote === -1 && { backgroundColor: colors.error }
        ]} 
        onPress={() => handleVote(-1)}
        disabled={loading}
        accessibilityLabel={`비추천, 현재 ${downCount}개`}
        accessibilityRole="button"
        accessibilityState={{ selected: userVote === -1 }}
      >
        <ThumbsDown size={14} color={userVote === -1 ? '#fff' : colors.textSecondary} fill={userVote === -1 ? '#fff' : 'transparent'} />
        <Text style={[styles.countText, { color: colors.textSecondary }, userVote === -1 && styles.activeText]}>{downCount}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    paddingHorizontal: 12, 
    paddingVertical: 5, 
    borderRadius: 14, 
  },
  countText: { fontSize: 13, fontWeight: '700' },
  activeText: { color: '#fff' }
});
