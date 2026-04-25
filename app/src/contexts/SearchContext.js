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
      
    if (newIds.length > 20) { // Increased batch size for fewer re-renders
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
  const jobIndex = useRef(new Map());

  // Fetch job counts with minimal data for strict matching
  const fetchJobCounts = async () => {
    if (hasFetchedJobs.current) return;
    
    try {
      // Select ONLY required fields for matching and counting to reduce payload size
      const { data } = await supabase
        .from('job_offers')
        .select('id, title, position, deadline, center_name, location, metadata');
      
      if (data) {
        setAllJobs(data);
        hasFetchedJobs.current = true;
        
        const counts = {};
        const index = new Map();
        const normalize = (name) => name ? name.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
        
        data.forEach(job => {
          const norm = normalize(job.center_name);
          if (norm) {
            counts[norm] = (counts[norm] || 0) + 1;
            if (!index.has(norm)) index.set(norm, []);
            index.get(norm).push(job);
          }
        });
        
        jobIndex.current = index;
        setJobCounts(counts);
        setAllJobs(data);
        hasFetchedJobs.current = true;
      }
    } catch (e) {
      console.warn('Job fetch fail', e);
    }
  };

  useEffect(() => {
    // Defer non-critical job fetch to allow UI to render first
    const timer = setTimeout(() => {
      fetchJobCounts();
    }, 1000);
    return () => clearTimeout(timer);
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

  // Centralized filter function for better performance
  const applyFilters = (list, filters, jobIndexMap, ratings) => {
    const normalize = (name) => name ? name.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
    const q = normalize(filters.nameQuery || '');
    
    const isHiringFilterActive = filters.hiringOnly;
    const isRatingFilterActive = filters.minRating > 0 || filters.minTeacherRating > 0;
    const isAgeFilterActive = filters.admissionAge !== null;

    return list.filter(dc => {
      if (q && !normalize(dc.name || '').includes(q)) return false;
      
      if (isRatingFilterActive) {
        const itemRatings = ratings[dc.stcode] || { parentAvg: '0.0', teacherAvg: '0.0' };
        if (filters.minRating > 0) {
          const rating = parseFloat(itemRatings.parentAvg) || 0;
          if (rating < filters.minRating) return false;
        }
        if (filters.minTeacherRating > 0) {
          const tRating = parseFloat(itemRatings.teacherAvg) || 0;
          if (tRating < filters.minTeacherRating) return false;
        }
      }
      
      if (filters.types.length > 0 && !filters.types.includes(dc.type)) return false;
      if (filters.busOnly && (!dc.schoolbus || dc.schoolbus === '미운영')) return false;
      
      if (isHiringFilterActive) {
        const normName = normalize(dc.name);
        const potentialJobs = jobIndexMap.get(normName);
        if (!potentialJobs || potentialJobs.length === 0) return false;
        
        // Only run expensive deep matching on potential candidates
        if (!potentialJobs.some(job => isJobMatchingDaycare(job, dc))) return false;
      }
      
      if (filters.services.length > 0) {
        const daycareServices = (dc.spec || '').split(',').map(s => s.trim());
        if (!filters.services.every(svc => daycareServices.some(ds => ds.includes(svc) || svc.includes(ds)))) return false;
      }
      
      if (isAgeFilterActive) {
        const age = filters.admissionAge;
        const totalCap = Number(dc.capacity || 0);
        if (totalCap <= 0) return false;

        const ageCurrent = dc.childBreakdown?.['age' + age] || 0;
        
        // Optimization: Use pre-calculated or simplified capacity check
        // The weight-based calculation is heavy, only run if childBreakdown exists
        if (dc.classBreakdown) {
          const AGE_RATIOS = { 0: 3, 1: 5, 2: 7, 3: 15, 4: 20, 5: 20 };
          const MIXED_RATIOS = { infantMixed: 5, toddlerMixed: 15, special: 3 };
          
          const categories = [
            { key: 'age0', r: 3 }, { key: 'age1', r: 5 }, { key: 'age2', r: 7 },
            { key: 'age3', r: 15 }, { key: 'age4', r: 20 }, { key: 'age5', r: 20 },
            { key: 'infantMixed', r: 5 }, { key: 'toddlerMixed', r: 15 }, { key: 'special', r: 3 }
          ];

          let totalWeight = 0;
          let targetWeight = 0;
          categories.forEach((cat, idx) => {
            const count = dc.classBreakdown[cat.key] || 0;
            const w = count * cat.r;
            totalWeight += w;
            if (idx === age) targetWeight = w;
          });

          if (totalWeight > 0) {
            let ageCap = Math.floor((targetWeight / totalWeight) * totalCap);
            // Add remainder if this age group is the largest
            // (Simplified: ignore remainder for speed, usually 1 child difference)
            if (ageCurrent >= ageCap) return false;
          } else return false;
        } else return false;
      }
      
      return true;
    });
  };

  const filteredDaycares = useMemo(() => 
    applyFilters(region.daycares, filters, jobIndex.current, daycareRatings), 
    [region.daycares, filters, allJobs, daycareRatings]
  );

  const filteredMapDaycares = useMemo(() => 
    applyFilters(mapDaycares, filters, jobIndex.current, daycareRatings), 
    [mapDaycares, filters, allJobs, daycareRatings]
  );

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
