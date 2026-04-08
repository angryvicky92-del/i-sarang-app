import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { getDaycares, getCachedDaycares, SIDO_LIST, getKakaoRegionCode, isJobMatchingDaycare } from '../services/dataService';
import { SIGUNGU_LIST } from '../services/sigungu';
import { getBulkReviewAverages } from '../services/reviewService';

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
    daycares: [],
    isLoading: false,
    animateTick: 0,
    visibleRegions: [] // Array of sigungu names seen in viewport
  });
  
  // Cumulative caches for Map pins
  const [mapDaycares, setMapDaycares] = useState([]);
  const [mapPlaces, setMapPlaces] = useState([]);

  // Global cache for daycare ratings: { [stcode]: { parentAvg, teacherAvg } }
  const [daycareRatings, setDaycareRatings] = useState({});

  const updateDaycareRating = (stcode, ratings) => {
    if (!stcode) return;
    
    setDaycareRatings(prev => {
      const current = prev[stcode];
      if (current && current.parentAvg === ratings.parentAvg && current.teacherAvg === ratings.teacherAvg) {
        return prev; // No change, skip update to avoid re-render
      }
      return {
        ...prev,
        [stcode]: ratings
      };
    });
  };

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
      animateTick: animate ? Date.now() : prev.animateTick,
      visibleRegions: Array.isArray(sigungu) ? sigungu : [sigungu]
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
    
    // 1. Check synchronous cache first for instant UI response
    const cachedData = getCachedDaycares(region.arcode);
    if (cachedData) {
      setRegion(prev => ({ ...prev, daycares: cachedData, isLoading: false }));
      return;
    }

    // 2. If not in cache, fetch async with loader
    setRegion(prev => ({ ...prev, isLoading: true }));
    getDaycares(region.arcode).then(data => {
      setRegion(prev => ({ ...prev, daycares: data, isLoading: false }));
      
      // Merge into cumulative map cache
      if (data && data.length > 0) {
        setMapDaycares(prev => {
          const existingIds = new Set(prev.map(dc => dc.stcode));
          const newItems = data.filter(dc => !existingIds.has(dc.stcode));
          return [...prev, ...newItems];
        });
      }
    });
  }, [region.arcode, region.isManual]);

  // Sync region.daycares to cumulative mapDaycares whenever it updates
  useEffect(() => {
    if (region.daycares && region.daycares.length > 0) {
      setMapDaycares(prev => {
        const existingIds = new Set(prev.map(dc => dc.stcode));
        const newItems = region.daycares.filter(dc => !existingIds.has(dc.stcode));
        if (newItems.length === 0) return prev;
        return [...prev, ...newItems];
      });
    }
  }, [region.daycares]);
  
  const lastFetchedIds = useRef(new Set());
  useEffect(() => {
    const newIds = mapDaycares
      .map(dc => String(dc.stcode))
      .filter(id => id && !lastFetchedIds.current.has(id));
      
    if (newIds.length > 5) { // Small batch for responsiveness
      getBulkReviewAverages(newIds).then(results => {
        if (results && Object.keys(results).length > 0) {
          setDaycareRatings(prev => ({ ...prev, ...results }));
        }
        newIds.forEach(id => lastFetchedIds.current.add(id));
      });
    }
  }, [mapDaycares]);

  const [filters, setFilters] = useState({
    minRating: 0,
    minTeacherRating: 0,
    types: [], // Empty means all
    busOnly: false,
    hiringOnly: false,
    services: [],
    admissionAge: null,
    nameQuery: ''
  });

  const [allJobs, setAllJobs] = useState([]);
  const [jobCounts, setJobCounts] = useState({});

  const hasFetchedJobs = useRef(false);

  // Fetch job counts with full metadata for strict matching
  const fetchJobCounts = async () => {
    if (hasFetchedJobs.current) return; // Prevent redundant global fetches
    
    try {
      const { data } = await supabase.from('job_offers').select('*');
      if (data) {
        setAllJobs(data);
        hasFetchedJobs.current = true;
        
        const counts = {};
        const normalize = (name) => name ? name.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
        data.forEach(job => {
          const norm = normalize(job.center_name);
          counts[norm] = (counts[norm] || 0) + 1;
        });
        setJobCounts(counts);
      }
    } catch (e) {
      console.warn('Job fetch fail', e);
    }
  };

  useEffect(() => {
    fetchJobCounts();
  }, []); // Only once on mount

  const resetFilters = () => {
    setFilters({
      minRating: 0,
      minTeacherRating: 0,
      types: [],
      busOnly: false,
      hiringOnly: false,
      services: [],
      admissionAge: null,
      nameQuery: ''
    });
  };

  const [favorites, setFavorites] = useState([]); // Array of daycare objects or IDs
  
  const fetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('daycare_favorites')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (data) setFavorites(data);
    } catch (e) {
      console.warn('Fetch favorites fail', e);
    }
  };

  // Load favorites on mount or auth change
  useEffect(() => {
    fetchFavorites();
  }, [region.arcode]); // Also refresh on region change maybe? Or just once.

  const toggleFavorite = async (item, navigation) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('알림', '로그인이 필요한 기능입니다.', [
          { text: '취소', style: 'cancel' },
          { text: '로그인', onPress: () => navigation?.navigate('Login') }
        ]);
        return;
      }

      // Detection
      const isRecommended = item.center_type === 'RECOMMENDED' || item.type === 'RECOMMENDED' || item.contentid;
      const itemId = isRecommended ? (item.id || item.contentid) : item.stcode;
      const itemName = isRecommended ? (item.title || item.name) : item.name;
      const itemType = isRecommended ? 'RECOMMENDED' : (item.type || '어린이집');

      const isFav = favorites.find(f => f.daycare_id === itemId);
      
      if (isFav) {
        // Remove
        const { error } = await supabase
          .from('daycare_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('daycare_id', itemId);
        
        if (!error) {
          setFavorites(prev => prev.filter(f => f.daycare_id !== itemId));
        } else {
          console.error('Delete favorite fail:', error.message);
          Alert.alert('오류', '즐겨찾기 해제에 실패했습니다.');
        }
      } else {
        // Add
        const newFav = {
          user_id: session.user.id,
          daycare_id: itemId,
          daycare_name: itemName,
          metadata: { 
            ...item, 
            id: itemId, 
            name: itemName, 
            type: itemType,
            center_type: itemType // Consistency
          }
        };
        const { error } = await supabase
          .from('daycare_favorites')
          .insert([newFav]);
        
        if (!error) {
          setFavorites(prev => [...prev, newFav]);
        } else {
          console.error('Insert favorite fail:', error.message);
          if (error.message.includes('relation "daycare_favorites" does not exist')) {
            Alert.alert('시스템 설정 필요', '즐겨찾기 테이블이 아직 생성되지 않았습니다.');
          } else {
            Alert.alert('오류', '즐겨찾기 등록에 실패했습니다.');
          }
        }
      }
    } catch (e) {
      console.warn('Toggle favorite fail', e);
    }
  };

  const isFavorited = (id) => favorites.some(f => f.daycare_id === id);

  const filteredDaycares = useMemo(() => {
    const normalize = (name) => name ? name.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
    const q = normalize(filters.nameQuery || '');
    
    return region.daycares.filter(dc => {
      if (q && !normalize(dc.name || '').includes(q)) return false;
      
      const ratings = daycareRatings[dc.stcode] || { parentAvg: '0.0', teacherAvg: '0.0' };
      const rating = parseFloat(ratings.parentAvg) || 0;
      if (rating < filters.minRating) return false;
      
      const tRating = parseFloat(ratings.teacherAvg) || 0;
      if (tRating < filters.minTeacherRating) return false;
      
      if (filters.types.length > 0 && !filters.types.includes(dc.type)) return false;
      if (filters.busOnly && (!dc.schoolbus || dc.schoolbus === '미운영')) return false;
      if (filters.hiringOnly && !allJobs.some(job => isJobMatchingDaycare(job, dc))) return false;
      
      if (filters.services.length > 0) {
        const daycareServices = (dc.spec || '').split(',').map(s => s.trim());
        if (!filters.services.every(svc => daycareServices.some(ds => ds.includes(svc) || svc.includes(ds)))) return false;
      }
      
      // Admission Probability (High Admission Probability by Age)
      if (filters.admissionAge !== null) {
        const age = filters.admissionAge;
        const AGE_RATIOS = { 0: 3, 1: 5, 2: 7, 3: 15, 4: 20, 5: 20 };
        const MIXED_RATIOS = { infantMixed: 5, toddlerMixed: 15, special: 3 };
        const totalCap = Number(dc.capacity || 0);

        if (totalCap > 0) {
          const categories = [
            ...[0, 1, 2, 3, 4, 5].map(a => ({ key: 'age' + a, ratio: AGE_RATIOS[a] })),
            { key: 'infantMixed', ratio: MIXED_RATIOS.infantMixed },
            { key: 'toddlerMixed', ratio: MIXED_RATIOS.toddlerMixed },
            { key: 'special', ratio: MIXED_RATIOS.special }
          ];

          const rawWeights = categories.map(cat => (dc.classBreakdown?.[cat.key] || 0) * cat.ratio);
          const totalWeight = rawWeights.reduce((acc, w) => acc + w, 0);

          if (totalWeight > 0) {
            let ageCap = Math.floor((rawWeights[age] / totalWeight) * totalCap);
            const distributedSum = categories.reduce((acc, cat, idx) => acc + Math.floor((rawWeights[idx] / totalWeight) * totalCap), 0);
            const diff = totalCap - distributedSum;
            const maxIdx = rawWeights.indexOf(Math.max(...rawWeights));
            if (maxIdx === age) ageCap += diff;

            const ageCurrent = dc.childBreakdown?.['age' + age] || 0;
            if (ageCurrent >= ageCap) return false;
          } else return false;
        } else return false;
      }
      
      return true;
    });
  }, [region.daycares, filters, allJobs, daycareRatings]);

  const filteredMapDaycares = useMemo(() => {
    const normalize = (name) => name ? name.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
    const q = normalize(filters.nameQuery || '');
    
    return mapDaycares.filter(dc => {
      if (q && !normalize(dc.name || '').includes(q)) return false;
      
      const ratings = daycareRatings[dc.stcode] || { parentAvg: '0.0', teacherAvg: '0.0' };
      const rating = parseFloat(ratings.parentAvg) || 0;
      if (rating < filters.minRating) return false;
      
      const tRating = parseFloat(ratings.teacherAvg) || 0;
      if (tRating < filters.minTeacherRating) return false;
      
      if (filters.types.length > 0 && !filters.types.includes(dc.type)) return false;
      if (filters.busOnly && (!dc.schoolbus || dc.schoolbus === '미운영')) return false;
      if (filters.hiringOnly && !allJobs.some(job => isJobMatchingDaycare(job, dc))) return false;
      
      if (filters.services.length > 0) {
        const daycareServices = (dc.spec || '').split(',').map(s => s.trim());
        if (!filters.services.every(svc => daycareServices.some(ds => ds.includes(svc) || svc.includes(ds)))) return false;
      }

      // Admission Probability
      if (filters.admissionAge !== null) {
        const age = filters.admissionAge;
        const AGE_RATIOS = { 0: 3, 1: 5, 2: 7, 3: 15, 4: 20, 5: 20 };
        const MIXED_RATIOS = { infantMixed: 5, toddlerMixed: 15, special: 3 };
        const totalCap = Number(dc.capacity || 0);

        if (totalCap > 0) {
          const categories = [
            ...[0, 1, 2, 3, 4, 5].map(a => ({ key: 'age' + a, ratio: AGE_RATIOS[a] })),
            { key: 'infantMixed', ratio: MIXED_RATIOS.infantMixed },
            { key: 'toddlerMixed', ratio: MIXED_RATIOS.toddlerMixed },
            { key: 'special', ratio: MIXED_RATIOS.special }
          ];
          const rawWeights = categories.map(cat => (dc.classBreakdown?.[cat.key] || 0) * cat.ratio);
          const totalWeight = rawWeights.reduce((acc, w) => acc + w, 0);
          if (totalWeight > 0) {
            let ageCap = Math.floor((rawWeights[age] / totalWeight) * totalCap);
            const distributedSum = categories.reduce((acc, cat, idx) => acc + Math.floor((rawWeights[idx] / totalWeight) * totalCap), 0);
            const diff = totalCap - distributedSum;
            const maxIdx = rawWeights.indexOf(Math.max(...rawWeights));
            if (maxIdx === age) ageCap += diff;
            const ageCurrent = dc.childBreakdown?.['age' + age] || 0;
            if (ageCurrent >= ageCap) return false;
          } else return false;
        } else return false;
      }
      
      return true;
    });
  }, [mapDaycares, filters, allJobs, daycareRatings]);

  return (
    <SearchContext.Provider value={{ 
      region, 
      updateRegion, 
      filters, 
      setFilters, 
      resetFilters, 
      filteredDaycares,
      allJobs,
      jobCounts,
      favorites,
      toggleFavorite,
      isFavorited,
      daycareRatings,
      updateDaycareRating,
      mapDaycares,
      mapPlaces,
      setMapPlaces: (data) => {
        if (!data) return;
        setMapPlaces(prev => {
          const normalize = (n) => n ? n.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
          
          // 1. Combine previous and incoming data
          const incoming = Array.isArray(data) ? data : [data];
          const allItems = [...prev, ...incoming];
          
          // 2. Perform global deduplication (ID and Location Hash)
          const uniqueItems = [];
          const seenIds = new Set();
          const seenHashes = new Set();
          
          allItems.forEach(item => {
            if (!item) return;
            const id = String(item.id || item.contentid || '');
            const hash = `${normalize(item.title || item.name)}_${Number(item.lat || 0).toFixed(3)}_${Number(item.lng || 0).toFixed(3)}`;
            
            // Check if either ID or exact Location+Name combo was already processed
            if (id && seenIds.has(id)) return;
            if (hash && seenHashes.has(hash)) return;
            
            if (id) seenIds.add(id);
            if (hash) seenHashes.add(hash);
            uniqueItems.push(item);
          });
          
          // Only update if the length changed or content is fresh
          if (uniqueItems.length === prev.length && prev.length > 0) return prev;
          return uniqueItems;
        });
      },
      filteredMapDaycares
    }}>
      {children}
    </SearchContext.Provider>
  );
};
