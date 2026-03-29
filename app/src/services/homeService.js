import { supabase } from './supabaseClient';

export const getHomeData = async () => {
  try {
    const [posts, reviews, jobs] = await Promise.all([
      // 1. 인기글 (추천순)
      supabase
        .from('posts')
        .select('*')
        .order('upvotes', { ascending: false })
        .limit(5),
      
      // 2. 실시간 후기 (최신순)
      supabase
        .from('reviews')
        .select('*, profiles(nickname, user_type)')
        .order('created_at', { ascending: false })
        .limit(5),
      
      // 3. 실시간 구인정보 (최신순)
      supabase
        .from('job_offers')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(5)
    ]);

    return {
      popularPosts: posts.data || [],
      recentReviews: reviews.data || [],
      recentJobs: jobs.data || []
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {
      popularPosts: [],
      recentReviews: [],
      recentJobs: []
    };
  }
};
