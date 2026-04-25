import Toast from 'react-native-toast-message';
import { supabase } from './supabaseClient';

/**
 * 콘텐츠(게시글, 댓글, 후기)에 대한 투표(추천/비추천)를 처리하는 통합 서비스
 * @param {string} targetType - 'post', 'comment', 'review'
 * @param {string|number} targetId - 콘텐츠 ID
 * @param {string} userId - 사용자 ID
 * @param {number} voteType - 1 (추천), -1 (비추천)
 */
export const toggleVote = async (targetType, targetId, userId, voteType) => {
  if (!['post', 'comment', 'review'].includes(targetType)) return null;

  try {
    // Use RPC to handle both the vote record and the count update atomically
    // This also bypasses RLS issues on the content tables (posts, reviews, etc.)
    const { data, error } = await supabase.rpc('toggle_vote_rpc', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_user_id: userId,
      p_vote_type: voteType
    });

    if (error) throw error;

    // The RPC returns { data: { ...row }, userVote: N }
    return {
      ...data.data,
      userVote: data.userVote
    };

  } catch (error) {
    console.error(`Voting failed for ${targetType}:`, error.message);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    return null;
  }
};

/**
 * 특정 콘텐츠들에 대한 현재 사용자의 투표 상태를 한꺼번에 가져옴
 */
export const getMyVotes = async (targetType, targetIds, userId) => {
  if (!userId || !targetIds || targetIds.length === 0) return {};
  
  const isReview = targetType === 'review';
  const voteTable = isReview ? 'review_likes' : `${targetType}_votes`;
  const idField = `${targetType}_id`;

  try {
    const { data, error } = await supabase
      .from(voteTable)
      .select(`${idField}, vote_type`)
      .eq('user_id', userId)
      .in(idField, targetIds);
    
    if (error) throw error;

    const voteMap = {};
    data.forEach(v => {
      voteMap[v[idField]] = v.vote_type;
    });
    return voteMap;
  } catch (e) {
    console.warn(`Fetch my votes failed for ${targetType}:`, e.message);
    return {};
  }
};
