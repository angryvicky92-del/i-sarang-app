import Toast from 'react-native-toast-message';
import { supabase } from './supabaseClient';

const REVIEW_FIELDS = 'id, user_id, center_id, center_name, center_addr, center_type, rating, content, created_at';
const POST_FIELDS = 'id, user_id, title, author, type, category_type, views, upvotes, created_at, post_comments(count)';
const JOB_FIELDS = 'id, center_name, title, location, job_type, deadline, posted_at';
const PROFILE_FIELDS = 'id, nickname, user_type';

const attachProfiles = async (rows) => {
  if (!rows?.length) return [];

  const userIds = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
  if (!userIds.length) return rows;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .in('id', userIds);

  if (error) throw error;

  const profileMap = new Map((profiles || []).map(profile => [profile.id, profile]));
  return rows.map(row => ({ ...row, profiles: profileMap.get(row.user_id) }));
};

const fetchRecentReviews = async (userType) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(REVIEW_FIELDS)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    let reviews = await attachProfiles(data || []);
    reviews = reviews.filter(review => review.center_type !== 'RECOMMENDED');

    if (userType === '선생님') {
      reviews = reviews.filter(review => review.profiles?.user_type === '선생님');
    } else if (userType !== '관리자') {
      reviews = reviews.filter(review => (review.profiles?.user_type || '학부모') === '학부모');
    }

    return reviews.slice(0, 6);
  } catch (error) {
    console.warn('Review fetch failed', error);
    return [];
  }
};

const fetchRecommendedPlaces = async () => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('center_id, center_name, center_addr, center_type, rating, created_at')
      .eq('center_type', 'RECOMMENDED')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const uniquePlaces = [];
    const seen = new Set();
    for (const place of data || []) {
      if (!seen.has(place.center_id)) {
        seen.add(place.center_id);
        uniquePlaces.push(place);
      }
      if (uniquePlaces.length === 5) break;
    }
    return uniquePlaces;
  } catch (error) {
    console.warn('Recommended places fetch failed', error);
    return [];
  }
};

const fetchPopularPosts = async (userType) => {
  try {
    let postQuery = supabase.from('posts').select(POST_FIELDS);
    if (userType !== '선생님' && userType !== '관리자') {
      postQuery = postQuery.eq('type', '자유');
    }

    const { data, error } = await postQuery
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const rankedPosts = [...(data || [])].sort((a, b) => {
      const score = post => (post.views || 0)
        + (post.upvotes || 0) * 3
        + (post.post_comments?.[0]?.count || 0) * 2;
      return score(b) - score(a);
    });

    let posts = rankedPosts;
    if (posts.length < 10) {
      const existingIds = posts.map(post => post.id);
      let fallbackQuery = supabase.from('posts').select(POST_FIELDS);
      if (existingIds.length) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${existingIds.join(',')})`);
      }

      const { data: fallbackPosts, error: fallbackError } = await fallbackQuery
        .order('created_at', { ascending: false })
        .limit(10 - posts.length);
      if (fallbackError) throw fallbackError;
      posts = [...posts, ...(fallbackPosts || [])];
    }

    return attachProfiles(posts);
  } catch (error) {
    console.warn('Post fetch failed', error);
    return [];
  }
};

const fetchRecentJobs = async () => {
  try {
    const kstOffset = 9 * 60 * 60 * 1000;
    const today = new Date(Date.now() + kstOffset).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('job_offers')
      .select(JOB_FIELDS)
      .gte('deadline', today)
      .order('posted_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Job fetch failed', error);
    return [];
  }
};

const fetchStats = async () => {
  try {
    const [reviews, users, posts] = await Promise.all([
      supabase.from('reviews').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true })
    ]);

    const countError = reviews.error || users.error || posts.error;
    if (countError) throw countError;

    return {
      reviewCount: reviews.count || 0,
      userCount: (users.count || 0) + 1240,
      postCount: posts.count || 0
    };
  } catch (error) {
    console.warn('Stats fetch failed', error);
    return { reviewCount: 0, userCount: 1240, postCount: 0 };
  }
};

export const getHomeData = async (userType) => {
  try {
    const [recentReviews, recommendedPlaces, popularPosts, recentJobs, stats] = await Promise.all([
      fetchRecentReviews(userType),
      fetchRecommendedPlaces(),
      fetchPopularPosts(userType),
      fetchRecentJobs(),
      fetchStats()
    ]);

    return { popularPosts, recentReviews, recentJobs, recommendedPlaces, stats };
  } catch (error) {
    console.error('getHomeData fatal failure:', error);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    return {
      popularPosts: [],
      recentReviews: [],
      recentJobs: [],
      recommendedPlaces: [],
      stats: { reviewCount: 0, userCount: 1240, postCount: 0 }
    };
  }
};
