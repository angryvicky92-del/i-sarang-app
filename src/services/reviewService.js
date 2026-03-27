import { supabase } from './supabaseClient'

export const getReviews = async (centerId, userId = null, sortBy = 'newest') => {
  let query = supabase
    .from('reviews')
    .select('*, profiles(is_verified, user_type)')
    .eq('center_id', centerId)

  if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
  else if (sortBy === 'likes') query = query.order('likes', { ascending: false })

  const { data: reviews, error } = await query
  
  if (error) {
    console.warn(`[ReviewService] Primary fetch failed (${error.code}): ${error.message}`);
    // If join fails (common with relationship issues), or any 400 error, try simple fetch
    let fallbackQuery = supabase
      .from('reviews')
      .select('*')
      .eq('center_id', centerId)
    
    if (sortBy === 'newest') fallbackQuery = fallbackQuery.order('created_at', { ascending: false })
    else if (sortBy === 'likes') fallbackQuery = fallbackQuery.order('likes', { ascending: false })
    
    const { data: fallbackData, error: fallbackError } = await fallbackQuery
    if (fallbackError) {
      console.error('[ReviewService] Fallback fetch also failed:', fallbackError);
      return [];
    }

    if (userId && fallbackData && fallbackData.length > 0) {
      try {
        const { data: userLikes } = await supabase
          .from('review_likes')
          .select('review_id')
          .eq('user_id', userId)
          .in('review_id', fallbackData.map(r => r.id))
        const likedReviewIds = new Set(userLikes?.map(l => l.review_id))
        return fallbackData.map(r => ({ ...r, is_liked: likedReviewIds.has(r.id) }))
      } catch (e) {
        return fallbackData.map(r => ({ ...r, is_liked: false }))
      }
    }
    return (fallbackData || []).map(r => ({ ...r, is_liked: false }))
  }

  // 현재 유저가 추천한 리뷰 목록 가져오기
  if (userId && reviews.length > 0) {
    const { data: userLikes } = await supabase
      .from('review_likes')
      .select('review_id')
      .eq('user_id', userId)
      .in('review_id', reviews.map(r => r.id))

    const likedReviewIds = new Set(userLikes?.map(l => l.review_id))
    return reviews.map(r => ({ ...r, is_liked: likedReviewIds.has(r.id) }))
  }

  return reviews
}

export const createReview = async (review) => {
  const { data, error } = await supabase
    .from('reviews')
    .insert([review])
    .select('*')

  if (error) {
    console.error('Error creating review:', error)
    return null
  }

  // Fetch profiles separately if the join is problematic during insert
  const novelReview = data[0]
  if (novelReview) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_verified, user_type')
      .eq('id', novelReview.user_id)
      .single()
    return { ...novelReview, profiles: profile }
  }
  
  return data[0]
}

export const toggleReviewLike = async (reviewId, userId, isLiked) => {
  if (isLiked) {
    // 추천 취소
    const { error: deleteError } = await supabase
      .from('review_likes')
      .delete()
      .match({ review_id: reviewId, user_id: userId })

    if (deleteError) return null

    // 추천 취소 (추천수 -1)
    const { data: current } = await supabase.from('reviews').select('likes').eq('id', reviewId).single()
    const { data: final } = await supabase.from('reviews').update({ likes: Math.max(0, (current.likes || 1) - 1) }).eq('id', reviewId).select().single()
    return { ...final, is_liked: false }
  } else {
    // 추천 추가
    const { error: insertError } = await supabase
      .from('review_likes')
      .insert([{ review_id: reviewId, user_id: userId }])

    if (insertError) return null

    const { data: current } = await supabase.from('reviews').select('likes').eq('id', reviewId).single()
    const { data: final } = await supabase.from('reviews').update({ likes: (current.likes || 0) + 1 }).eq('id', reviewId).select().single()
    return { ...final, is_liked: true }
  }
}
export const deleteReview = async (id) => {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting review:', error)
    return false
  }
  return true
}

export const updateReview = async (id, review) => {
  const { data, error } = await supabase
    .from('reviews')
    .update(review)
    .eq('id', id)
    .select()
  
  if (error) {
    console.error('Error updating review:', error)
    return null
  }
  return data[0]
}

export const getPopularReviews = async (userType = '학부모') => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(user_type, is_verified)')
    .eq('profiles.user_type', userType)
    .order('likes', { ascending: false })
    .limit(5)

  if (error) {
    if (error.code === 'PGRST200' || error.message.includes('relationship')) {
      const { data: fallbackData } = await supabase
        .from('reviews')
        .select('*')
        .order('likes', { ascending: false })
        .limit(5)
      return fallbackData || []
    }
    console.error('Error fetching popular reviews:', error)
    return []
  }
  return data
}

export const getRecentReviews = async (userType = '학부모') => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles(user_type, is_verified)')
    .eq('profiles.user_type', userType)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    if (error.code === 'PGRST200' || error.message.includes('relationship')) {
      const { data: fallbackData } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      return fallbackData || []
    }
    console.error('Error fetching recent reviews:', error)
    return []
  }
  return data
}
