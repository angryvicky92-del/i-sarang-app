import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { getDaycares, SIDO_LIST, getKakaoRegionCode } from '../services/dataService';
import { SIGUNGU_LIST } from '../services/sigungu';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [region, setRegion] = useState({
    sido: '서울특별시',
    sigungu: '강남구',
    arcode: '11680',
    center: { lat: 37.5145, lng: 127.0396 },
    daycares: [], // Global cache for fetched daycares
    isLoading: false,
    animateTick: 0
  });

  const updateRegion = (sido, sigungu, arcode, center, animate = false, manualDaycares = null) => {
    setRegion(prev => ({
      ...prev,
      sido: sido,
      sigungu: sigungu,
      arcode: arcode,
      center: center || prev.center,
      daycares: manualDaycares || prev.daycares,
      isLoading: manualDaycares ? false : true,
      isManual: !!manualDaycares,
      animateTick: animate ? Date.now() : prev.animateTick
    }));
  };

  // 앱 로드 시 한 번만 현재 위치로 자동 설정 시도
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted:', status);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          maximumAge: 5000
        });
        const { latitude, longitude } = location.coords;
        // This setRegion was for updating center only, but the instruction implies
        // a different flow for daycares. Reverting to original center update.
        // The provided snippet for this part seems to be misplaced or incomplete.
        // I will keep the original center update here, as the main updateRegion
        // call at the end of this useEffect will handle the full state.
        const kakaoAddr = await getKakaoRegionCode(latitude, longitude);
        
        let matchedArcode = '11680'; // fallback
        let matchedSido = '서울특별시';
        let matchedSigungu = '강남구';

        if (kakaoAddr) {
          const sidoObj = SIDO_LIST.find(s => s.name === kakaoAddr.sido || kakaoAddr.sido.includes(s.name));
          if (sidoObj) {
            matchedSido = sidoObj.name;
            const districts = SIGUNGU_LIST[sidoObj.code] || [];
            if (districts.length > 0) {
              const foundDistrict = districts.find(d => d.name === kakaoAddr.sigungu);
              if (foundDistrict) {
                matchedSigungu = foundDistrict.name;
                matchedArcode = foundDistrict.code;
              } else {
                matchedSigungu = districts[0].name;
                matchedArcode = districts[0].code;
              }
            }
          }
        }
        
        updateRegion(matchedSido, matchedSigungu, matchedArcode, { lat: latitude, lng: longitude }, true); // Animate to GPS
      } catch (e) {
        console.error('Geolocation logic error:', e);
      }
    })();
  }, []);

  // Fetch daycares automatically whenever arcode changes
  useEffect(() => {
    if (!region.arcode || region.isManual) return;
    setRegion(prev => ({ ...prev, isLoading: true }));
    getDaycares(region.arcode).then(data => {
      setRegion(prev => ({ ...prev, daycares: data, isLoading: false }));
    });
  }, [region.arcode, region.isManual]);

  const [filters, setFilters] = useState({
    minRating: 0,
    minTeacherRating: 0,
    types: [], // Empty means all
    busOnly: false,
    hiringOnly: false,
    services: []
  });

  const [jobCounts, setJobCounts] = useState({});

  // Fetch job counts periodically or on region change
  const fetchJobCounts = async () => {
    try {
      const { data } = await supabase.from('job_offers').select('center_name');
      if (data) {
        const counts = {};
        const normalize = (name) => name.replace(/\s/g, '').replace(/\(.*\)/g, '');
        data.forEach(job => {
          const norm = normalize(job.center_name);
          counts[norm] = (counts[norm] || 0) + 1;
        });
        setJobCounts(counts);
      }
    } catch (e) {
      console.warn('Job counts fetch fail', e);
    }
  };

  useEffect(() => {
    fetchJobCounts();
  }, [region.arcode]);

  const resetFilters = () => {
    setFilters({
      minRating: 0,
      minTeacherRating: 0,
      types: [],
      busOnly: false,
      hiringOnly: false,
      services: []
    });
  };

  const [favorites, setFavorites] = useState([]); // Array of daycare objects or IDs

  // Load favorites on mount or auth change
  useEffect(() => {
    fetchFavorites();
  }, [region.arcode]); // Also refresh on region change maybe? Or just once.

  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('daycare_favorites')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (data) setFavorites(data);
    } catch (e) {
      console.warn('Fetch favorites fail', e);
    }
  };

  const toggleFavorite = async (daycare) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('알림', '로그인이 필요한 기능입니다.');
        return;
      }

      const isFav = favorites.find(f => f.daycare_id === daycare.stcode);
      
      if (isFav) {
        // Remove
        const { error } = await supabase
          .from('daycare_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('daycare_id', daycare.stcode);
        
        if (!error) {
          setFavorites(prev => prev.filter(f => f.daycare_id !== daycare.stcode));
        } else {
          console.error('Delete favorite fail:', error.message);
          Alert.alert('오류', '즐겨찾기 해제에 실패했습니다.');
        }
      } else {
        // Add
        const newFav = {
          user_id: session.user.id,
          daycare_id: daycare.stcode,
          daycare_name: daycare.name,
          metadata: daycare // Store full object for easy list display without refetching
        };
        const { error } = await supabase
          .from('daycare_favorites')
          .insert([newFav]);
        
        if (!error) {
          setFavorites(prev => [...prev, newFav]);
        } else {
          console.error('Insert favorite fail:', error.message);
          if (error.message.includes('relation "daycare_favorites" does not exist')) {
            Alert.alert('시스템 설정 필요', '즐겨찾기 테이블이 아직 생성되지 않았습니다. 관리자에게 문의하거나 SQL 스크립트를 실행해 주세요.');
          } else {
            Alert.alert('오류', '즐겨찾기 등록에 실패했습니다.');
          }
        }
      }
    } catch (e) {
      console.warn('Toggle favorite fail', e);
    }
  };

  const isFavorited = (stcode) => favorites.some(f => f.daycare_id === stcode);

  const getFilteredDaycares = () => {
    const normalize = (name) => name.replace(/\s/g, '').replace(/\(.*\)/g, '');
    
    return region.daycares.filter(dc => {
      // 1. Rating
      const rating = parseFloat(dc.parentRating) || 0;
      if (rating < filters.minRating) return false;

      // 1.2 Teacher Rating
      const tRating = parseFloat(dc.teacherRating) || 0;
      if (tRating < filters.minTeacherRating) return false;

      // 2. Type
      if (filters.types.length > 0 && !filters.types.includes(dc.type)) return false;

      // 3. School Bus
      if (filters.busOnly && (!dc.schoolbus || dc.schoolbus === '미운영')) return false;

      // 4. Hiring
      if (filters.hiringOnly) {
        const count = jobCounts[normalize(dc.name)] || 0;
        if (count === 0) return false;
      }

      // 5. Services
      if (filters.services.length > 0) {
        const daycareServices = (dc.spec || '').split(',').map(s => s.trim());
        const matchesAll = filters.services.every(svc => 
          daycareServices.some(ds => ds.includes(svc) || svc.includes(ds))
        );
        if (!matchesAll) return false;
      }

      return true;
    });
  };

  const filteredDaycares = getFilteredDaycares();

  return (
    <SearchContext.Provider value={{ 
      region, 
      updateRegion, 
      filters, 
      setFilters, 
      resetFilters, 
      filteredDaycares,
      jobCounts,
      favorites,
      toggleFavorite,
      isFavorited
    }}>
      {children}
    </SearchContext.Provider>
  );
};
