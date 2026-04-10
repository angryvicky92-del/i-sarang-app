import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';

export const usePosts = (searchQuery: string, activeTab: string) => {
  return useQuery({
    queryKey: ['posts', searchQuery, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('is_notice', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      // POLICY: Notices (is_notice: true) must appear in ALL tabs (All, Free, Teacher).
      if (activeTab && activeTab !== '전체') {
        query = query.or(`type.eq.${activeTab},is_notice.eq.true`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
