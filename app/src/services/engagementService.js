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

  const voteTable = `${targetType}_votes`;
  const mainTable = targetType === 'review' ? 'reviews' : (targetType === 'comment' ? 'post_comments' : 'posts');
  const idField = `${targetType}_id`;

  try {
    // 1. 기존 투표 확인
    const { data: existingVote, error: fetchError } = await supabase
      .from(voteTable)
      .select('*')
      .eq('user_id', userId)
      .eq(idField, targetId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error(`Error fetching existing vote for ${targetType}:`, fetchError);
      return null;
    }

    let diffUp = 0;
    let diffDown = 0;

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // 같은 버튼을 또 누름 -> 투표 취소
        const { error: deleteError } = await supabase
          .from(voteTable)
          .delete()
          .eq('id', existingVote.id);
        
        if (deleteError) throw deleteError;
        
        if (voteType === 1) diffUp = -1;
        else diffDown = -1;
      } else {
        // 반대 버튼을 누름 -> 투표 변경
        const { error: updateError } = await supabase
          .from(voteTable)
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);
        
        if (updateError) throw updateError;
        
        if (voteType === 1) { // -1 -> 1
          diffUp = 1;
          diffDown = -1;
        } else { // 1 -> -1
          diffUp = -1;
          diffDown = 1;
        }
      }
    } else {
      // 신규 투표
      const { error: insertError } = await supabase
        .from(voteTable)
        .insert([{
          user_id: userId,
          [idField]: targetId,
          vote_type: voteType
        }]);
      
      if (insertError) throw insertError;
      
      if (voteType === 1) diffUp = 1;
      else diffDown = 1;
    }

    // 2. 메인 테이블의 카운트 업데이트
    // Note: 'reviews' uses 'likes' instead of 'upvotes' for historical reasons (from reviewService.js)
    const upField = targetType === 'review' ? 'likes' : 'upvotes';
    const downField = targetType === 'review' ? 'dislikes' : 'downvotes';

    const { data: current, error: getError } = await supabase
      .from(mainTable)
      .select(`${upField}, ${downField}`)
      .eq('id', targetId)
      .single();

    if (getError) throw getError;

    const newUp = Math.max(0, (current[upField] || 0) + diffUp);
    const newDown = Math.max(0, (current[downField] || 0) + diffDown);

    const { data: updated, error: finalError } = await supabase
      .from(mainTable)
      .update({ [upField]: newUp, [downField]: newDown })
      .eq('id', targetId)
      .select()
      .single();

    if (finalError) throw finalError;

    return { 
      ...updated, 
      userVote: diffUp + diffDown === 0 ? voteType : (diffUp > 0 || diffDown > 0 ? voteType : 0) 
    };

  } catch (error) {
    console.error(`Voting failed for ${targetType}:`, error.message);
    return null;
  }
};

/**
 * 특정 콘텐츠들에 대한 현재 사용자의 투표 상태를 한꺼번에 가져옴
 */
export const getMyVotes = async (targetType, targetIds, userId) => {
  if (!userId || !targetIds || targetIds.length === 0) return {};
  
  const voteTable = `${targetType}_votes`;
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
