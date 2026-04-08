import { supabase } from './supabaseClient';

export const getHomeData = async (userType) => {
  const result = {
    popularPosts: [],
    recentReviews: [],
    recentJobs: [],
    recommendedPlaces: []
  };

  try {
    // 1. Fetch Reviews (Resilient)
    try {
      const { data: rawReviews, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!reviewError && rawReviews && rawReviews.length > 0) {
        const userIds = [...new Set(rawReviews.map(r => r.user_id))];
        const { data: profileList } = await supabase
          .from('profiles')
          .select('id, nickname, user_type')
          .in('id', userIds);
        
        const profileMap = {};
        profileList?.forEach(p => { profileMap[p.id] = p; });
        rawReviews.forEach(r => { r.profiles = profileMap[r.user_id]; });

        let filteredReviews = rawReviews;
        // 1.1 Exclude Recommended Place reviews from live reviews
        filteredReviews = filteredReviews.filter(r => r.center_type !== 'RECOMMENDED');

        if (userType === '선생님') {
          filteredReviews = filteredReviews.filter(r => r.profiles?.user_type === '선생님');
        } else if (userType !== '관리자') {
          filteredReviews = filteredReviews.filter(r => (r.profiles?.user_type || '학부모') === '학부모');
        }
        result.recentReviews = filteredReviews.slice(0, 6); // More reviews filtered later
      }
    } catch (e) { console.warn('Review fetch failed', e); }

    // 1.2 Fetch Recommended Places (Special for Parents/Guests)
    try {
      const { data: recReviews } = await supabase
        .from('reviews')
        .select('center_id, center_name, center_addr, center_type, rating')
        .eq('center_type', 'RECOMMENDED')
        .order('created_at', { ascending: false })
        .limit(20);

      const uniquePlaces = [];
      const seen = new Set();
      recReviews?.forEach(rp => {
        if (!seen.has(rp.center_id)) {
          seen.add(rp.center_id);
          uniquePlaces.push(rp);
        }
      });
      result.recommendedPlaces = uniquePlaces.slice(0, 5);
    } catch (e) { console.warn('Recommended places fetch failed', e); }

    // 2. Fetch Popular Posts (Resilient & Permissions)
    try {
      let postQuery = supabase
        .from('posts')
        .select('*, post_comments(count)');
      
      // 학부모(Parent) or 비회원(Guest)은 '학부모' 게시글만 (선생님 게시글 제외)
      if (userType === '선생님' || userType === '관리자') {
        // 필터링 없음
      } else {
        postQuery = postQuery.eq('type', '학부모');
      }

      const { data: posts, error: postError } = await postQuery
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!postError && posts) {
        // 인기가 높은게 있다면 상단으로 재정렬
        const sortedPosts = [...posts].sort((a, b) => {
          const aPop = (a.views || 0) + (a.upvotes || 0) * 3 + (a.post_comments?.[0]?.count || 0) * 2;
          const bPop = (b.views || 0) + (b.upvotes || 0) * 3 + (b.post_comments?.[0]?.count || 0) * 2;
          return bPop - aPop;
        });
        result.popularPosts = sortedPosts;
      } else if (postError) {
        // Fallback if join fails
        const { data: simplePosts } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(5);
        if (simplePosts) result.popularPosts = simplePosts;
      }
    } catch (e) { console.warn('Post fetch failed', e); }

    // 3. Fetch Jobs (Resilient)
    try {
      const { data: jobs, error: jobError } = await supabase
        .from('job_offers')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(5);
      
      if (!jobError && jobs) result.recentJobs = jobs;
    } catch (e) { console.warn('Job fetch failed', e); }

    // 4. Fetch Stats (New)
    try {
      const { count: reviewCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      result.stats = { 
        reviewCount: reviewCount || 0, 
        userCount: (userCount || 0) + 1240, // Baseline + actual
        postCount: postCount || 0 
      };
    } catch (e) { console.warn('Stats fetch failed', e); }

    return result;
  } catch (error) {
    console.error('getHomeData fatal failure:', error);
    return result;
  }
};
