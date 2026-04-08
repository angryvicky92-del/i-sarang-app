import { supabase } from './supabaseClient';

export const diseaseService = {
  /**
   * Fetch latest disease advisories from DB
   */
  getLatestAdvisories: async () => {
    try {
      const { data, error } = await supabase
        .from('disease_advisories')
        .select('*')
        .order('status', { ascending: false }); // Suggests danger (🔴) first if alphabetized lucky but we'll sort manually

      if (error) throw error;
      
      // Custom sort: danger -> caution -> safe
      const statusOrder = { 'danger': 0, 'caution': 1, 'safe': 2 };
      return data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    } catch (e) {
      console.error('Error fetching disease advisories:', e.message);
      return [];
    }
  }
};
