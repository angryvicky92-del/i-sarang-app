import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Calendar } from 'lucide-react-native';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TYPE_COLORS, TYPE_GOK } from '../services/dataService';
import { useTheme } from '../contexts/ThemeContext';

export default function FavoriteJobsScreen({ navigation }) {
  const { session } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!session) return;
      
      try {
        const { data, error } = await supabase
          .from('job_favorites')
          .select(`
            id,
            job_id,
            job_snapshot,
            job_offers (
              id,
              center_type,
              title,
              center_name,
              location,
              deadline,
              posted_at
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching favorites:', error);
          return;
        }

        const validFavorites = data
          .map(item => item.job_snapshot || item.job_offers)
          .filter(Boolean);

        setFavorites(validFavorites);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchFavorites();
    });

    return unsubscribe;
  }, [navigation, session]);

  const renderJobCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <View style={styles.jobCardHeader}>
        <View style={[styles.jobBadge, { backgroundColor: TYPE_COLORS[item.center_type] || colors.primary }]}>
          <Text style={[styles.jobBadgeText, { color: item.center_type === TYPE_GOK ? '#1E293B' : '#fff' }]}>{item.center_type}</Text>
        </View>
        <Text style={[styles.jobDate, { color: colors.textMuted }]}>{item.posted_at || '최근'}</Text>
      </View>
      <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.centerName, { color: colors.textSecondary }]}>{item.center_name}</Text>
      <View style={[styles.jobFooter, { borderTopColor: colors.border }]}>
        <View style={styles.infoRow}>
          <MapPin size={12} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={12} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>{item.deadline}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>스크랩한 구인공고</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={renderJobCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>스크랩한 구인공고가 없습니다.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderBottomWidth: 1, 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  listContainer: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16 },
  jobCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12 },
  jobBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  jobBadgeText: { fontSize: 12, fontWeight: 'bold' },
  jobDate: { fontSize: 12 },
  jobTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  centerName: { fontSize: 14, marginBottom: 16 },
  jobFooter: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13 }
});
