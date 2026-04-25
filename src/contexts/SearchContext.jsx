import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getDaycares } from '../services/dataService';

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
    center: { lat: 37.5145, lng: 127.0607 },
    daycares: [], // Global cache for fetched daycares
    isLoading: false,
  });

  const updateRegion = (sido, sigungu, arcode, center) => {
    setRegion(prev => ({ 
      sido: sido || prev.sido, 
      sigungu: sigungu || prev.sigungu, 
      arcode: arcode || prev.arcode, 
      center: center || prev.center,
      daycares: prev.daycares,
      isLoading: true // Will be set to false after fetch
    }));
  };

  // 앱 로드 시 한 번만 현재 위치로 자동 설정 시도
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            const geocoder = new window.kakao.maps.services.Geocoder();
            geocoder.coord2RegionCode(lng, lat, (result, status) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const r1 = result[0].region_1depth_name;
                const r2 = result[0].region_2depth_name;
                const code = result[0].code.substring(0, 5);
                updateRegion(r1, r2, code, { lat, lng });
              } else {
                setRegion(prev => ({ ...prev, center: { lat, lng } }));
              }
            });
          } else {
            setRegion(prev => ({ ...prev, center: { lat, lng } }));
          }
        },
        (error) => {
          console.warn("[SearchContext] Geolocation failed:", error.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // arcode 변경 시에만 fetch (메모이제이션으로 불필요한 재요청 방지)
  const arcodeRef = useRef(null)
  useEffect(() => {
    if (!region.arcode) return;
    if (arcodeRef.current === region.arcode) return; // 동일 지역 중복 요청 방지
    arcodeRef.current = region.arcode;
    setRegion(prev => ({ ...prev, isLoading: true }));
    getDaycares(region.arcode).then(data => {
      setRegion(prev => ({ ...prev, daycares: data, isLoading: false }));
    }).catch(() => {
      setRegion(prev => ({ ...prev, isLoading: false }));
    });
  }, [region.arcode]);

  return (
    <SearchContext.Provider value={{ region, updateRegion }}>
      {children}
    </SearchContext.Provider>
  );
};
