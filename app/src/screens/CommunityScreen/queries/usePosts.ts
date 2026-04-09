import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';

export const usePosts = (searchQuery: string) => {
  return useQuery({
    queryKey: ['posts', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('is_notice', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
