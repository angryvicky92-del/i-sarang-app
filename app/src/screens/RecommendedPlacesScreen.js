import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useSearch } from '../contexts/SearchContext';
import { getRecommendedPlaces } from '../services/tourismService';
import { PLACE_TYPE_COLORS } from '../services/dataService';
import { MapPin, Navigation, Star } from 'lucide-react-native';
import * as Location from 'expo-location';

export default function RecommendedPlacesScreen({ navigation }) {
  const { colors, isDarkMode } = useTheme();
  const { region } = useSearch();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    fetchPlaces();
  }, []);

  const fetchPlaces = async () => {
    setLoading(true);
    let lat = region?.center?.lat || 37.5145;
    let lng = region?.center?.lng || 127.0607;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
        setUserLocation({ lat, lng });
      }
    } catch (e) {
      console.warn('Location fetch fail', e);
    }

    const results = await getRecommendedPlaces(lat, lng, 10000, region?.sido, region?.sigungu); // 10km radius
    setPlaces(results);
    setLoading(false);
  };

  const filteredPlaces = places.filter(p => p.isKidsFriendly);

  const renderItem = ({ item }) => {
    const distanceMeter = parseFloat(item.dist) || 0;
    const distanceStr = distanceMeter > 1000 
      ? (distanceMeter / 1000).toFixed(1) + 'km' 
      : Math.round(distanceMeter) + 'm';


    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => {
          navigation.navigate('PlaceDetail', { place: item });
        }}
      >
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.cardImage} 
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.cardContent}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={[styles.typeBadge, { backgroundColor: (item.type in PLACE_TYPE_COLORS ? PLACE_TYPE_COLORS[item.type] : colors.primary) }]}>
                <Text style={[styles.typeText, { color: '#FFF' }]}>{item.type}</Text>
              </View>
              {item.isKidsFriendly && !['키즈카페', '공원/자연', '문화/전시', '놀이/레저'].includes(item.type) && (
                <View style={[styles.typeBadge, { backgroundColor: '#FCE7F3' }]}>
                  <Text style={[styles.typeText, { color: '#DB2777' }]}>🍭 아이 추천</Text>
                </View>
              )}
            </View>
            <Text style={[styles.distText, { color: '#EF4444' }]}>{distanceStr}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>{item.addr}</Text>
          {item.tel ? (
            <Text style={[styles.tel, { color: colors.textMuted }]} numberOfLines={1}>📞 {item.tel}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Star color={colors.primary} size={24} fill={colors.primary} />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>장소 추천</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>이번 주말, 아이랑 어디로 가볼까? 🎈</Text>
          </View>
        </View>
      </View>



      {loading ? (
        <View style={styles.centerBox}>
          <Text style={{ color: colors.textSecondary }}>주변 추천 장소를 찾는 중입니다...</Text>
        </View>
      ) : filteredPlaces.length === 0 ? (
        <View style={styles.centerBox}>
          <MapPin size={48} color={colors.border} style={{ marginBottom: 16 }} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>주변에 일치하는 장소가 없습니다.</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>반경 10km 이내</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.1, shadowRadius: 8 },
  cardImage: { width: '100%', height: 160, backgroundColor: '#E2E8F0' },
  cardContent: { padding: 16 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  typeText: { fontSize: 11, fontWeight: '900' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  address: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  tel: { fontSize: 12, fontWeight: '600' },
  distText: { fontSize: 13, fontWeight: '800' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: 'transparent' },
  filterChipActive: { borderColor: 'rgba(0,0,0,0.1)' },
  filterChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterChipTextActive: { color: '#ffffff' }
});
