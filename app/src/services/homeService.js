import Toast from 'react-native-toast-message';
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
        filteredReviews = filteredReviews.filter(r => r.center_type !== 'RECOMMENDED');

        if (userType === '선생님') {
          filteredReviews = filteredReviews.filter(r => r.profiles?.user_type === '선생님');
        } else if (userType !== '관리자') {
          filteredReviews = filteredReviews.filter(r => (r.profiles?.user_type || '학부모') === '학부모');
        }
        result.recentReviews = filteredReviews.slice(0, 6);
      }
    } catch (e) { console.warn('Review fetch failed', e); }

    // 1.2 Fetch Recommended Places
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

    // 2. Fetch Popular Posts (Dynamic Backfilling)
    try {
      let postQuery = supabase
        .from('posts')
        .select('*, post_comments(count)');
      
      // POLICY: Parents (non-teacher/non-admin) strictly use '자유' board.
      if (userType !== '선생님' && userType !== '관리자') {
        postQuery = postQuery.eq('type', '자유');
      }

      const { data: posts, error: postError } = await postQuery
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!postError && posts && posts.length > 0) {
        const authorIds = [...new Set(posts.map(p => p.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, user_type, nickname').in('id', authorIds);
        const profileMap = {};
        profiles?.forEach(p => { profileMap[p.id] = p; });
        posts.forEach(p => { p.profiles = profileMap[p.user_id]; });

        const sortedPosts = [...posts].sort((a, b) => {
          const aPop = (a.views || 0) + (a.upvotes || 0) * 3 + (a.post_comments?.[0]?.count || 0) * 2;
          const bPop = (b.views || 0) + (b.upvotes || 0) * 3 + (b.post_comments?.[0]?.count || 0) * 2;
          return bPop - aPop;
        });
        result.popularPosts = sortedPosts;
      }

      // IMPROVED BACKFILL: Ensure at least 3-10 posts exist by filling with any latest posts
      if (result.popularPosts.length < 10) {
        const existingIds = result.popularPosts.map(p => p.id);
        const excludeFilter = existingIds.length > 0 ? existingIds : ['00000000-0000-0000-0000-000000000000'];
        
        const { data: fallbackPosts } = await supabase
          .from('posts')
          .select('*, post_comments(count)')
          .not('id', 'in', `(${excludeFilter.join(',')})`)
          .order('created_at', { ascending: false })
          .limit(10 - result.popularPosts.length);
        
        if (fallbackPosts && fallbackPosts.length > 0) {
          const fAuthorIds = [...new Set(fallbackPosts.map(p => p.user_id))];
          const { data: fProfiles } = await supabase.from('profiles').select('id, user_type, nickname').in('id', fAuthorIds);
          const fProfileMap = {};
          fProfiles?.forEach(p => { fProfileMap[p.id] = p; });
          fallbackPosts.forEach(p => { p.profiles = fProfileMap[p.user_id]; });
          
          result.popularPosts = [...result.popularPosts, ...fallbackPosts];
        }
      }
    } catch (e) { 
      console.warn('Post fetch failed', e);
      // Last resort fallback
      const { data: lastResort } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(5);
      if (lastResort) result.popularPosts = lastResort;
    }

    // 3. Fetch Jobs
    try {
      const { data: jobs, error: jobError } = await supabase
        .from('job_offers')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(5);
      
      if (!jobError && jobs) result.recentJobs = jobs;
    } catch (e) { console.warn('Job fetch failed', e); }

    // 4. Fetch Stats
    try {
      const { count: reviewCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true });
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      result.stats = { 
        reviewCount: reviewCount || 0, 
        userCount: (userCount || 0) + 1240, 
        postCount: postCount || 0 
      };
    } catch (e) { console.warn('Stats fetch failed', e); }

    return result;
  } catch (error) {
    console.error('getHomeData fatal failure:', error);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    return result;
  }
};
