import React, { useState, useEffect } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { SIDO_LIST, getRegionalCodes } from '../services/dataService';
import { MapPin, ChevronDown, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LocationSelector() {
  const { region, updateRegion } = useSearch();
  const [selectedSido, setSelectedSido] = useState(null);
  const [sigunguList, setSigunguList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSido, setShowSido] = useState(false);
  const [showSigungu, setShowSigungu] = useState(false);

  // 초기 sido 설정
  useEffect(() => {
    const initialSido = SIDO_LIST.find(s => s.name === region.sido);
    if (initialSido) setSelectedSido(initialSido);
  }, []);

  const handleSidoSelect = async (sido) => {
    setSelectedSido(sido);
    setLoading(true);
    setShowSido(false);
    
    // 해당 시도의 시군구 목록 가져오기
    const data = await getRegionalCodes(sido.code);
    setSigunguList(data);
    setLoading(false);
    setShowSigungu(true);
  };

  const handleSigunguSelect = (sigungu) => {
    // 카카오 로컬 서비스를 이용해 해당 지역의 좌표를 구함
    if (window.kakao && window.kakao.maps) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      const addr = `${selectedSido.name} ${sigungu.name}`;
      
      geocoder.addressSearch(addr, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = { 
            lat: parseFloat(result[0].y), 
            lng: parseFloat(result[0].x) 
          };
          updateRegion(selectedSido.name, sigungu.name, sigungu.code, coords);
        } else {
          // 좌표 검색 실패 시 기본값 (기존 좌표 유지 또는 기본 서울 중심)
          updateRegion(selectedSido.name, sigungu.name, sigungu.code, region.center);
        }
      });
    } else {
      updateRegion(selectedSido.name, sigungu.name, sigungu.code, region.center);
    }
    
    setShowSigungu(false);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1000 }}>
      <button 
        onClick={() => setShowSido(true)}
        style={{
          background: 'rgba(117,186,87,0.1)', color: 'var(--primary)',
          borderRadius: 20, padding: '6px 12px', border: '1px solid rgba(117,186,87,0.2)',
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontWeight: '800', fontSize: '12px', transition: 'all 0.2s'
        }}
      >
        <MapPin size={14} color="var(--primary)" />
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {region.sido} {region.sigungu}
        </span>
        {loading ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={14} />}
      </button>

      {/* 시/도 선택 패널 */}
      <AnimatePresence>
        {showSido && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute', top: 40, right: 0, width: 320,
              background: 'white', borderRadius: 24, padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 110,
              maxHeight: '70vh', overflowY: 'auto', border: '1px solid #F1F3F5'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>시/도 선택</h3>
              <button onClick={() => setShowSido(false)} style={{ border: 'none', background: 'none', fontSize: '20px', color: '#ADB5BD', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SIDO_LIST.map(s => (
                <button
                  key={s.code}
                  onClick={() => handleSidoSelect(s)}
                  style={{
                    padding: '10px 8px', borderRadius: 12, border: '1px solid #F1F3F5',
                    background: selectedSido?.code === s.code ? 'rgba(117,186,87,0.1)' : 'white',
                    color: selectedSido?.code === s.code ? 'var(--primary)' : '#495057',
                    fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                    transition: 'all 0.2s', textAlign: 'center'
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 시/군/구 선택 패널 */}
      <AnimatePresence>
        {showSigungu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute', top: 40, right: 0, width: 320,
              background: 'white', borderRadius: 24, padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 110,
              maxHeight: '70vh', overflowY: 'auto', border: '1px solid #F1F3F5'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>{selectedSido?.name} 시/군/구</h3>
              <button onClick={() => setShowSigungu(false)} style={{ border: 'none', background: 'none', fontSize: '20px', color: '#ADB5BD', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {sigunguList.length > 0 ? (
                sigunguList.map(s => (
                  <button
                    key={s.code}
                    onClick={() => handleSigunguSelect(s)}
                    style={{
                      padding: '10px', borderRadius: 12, border: '1px solid #F1F3F5',
                      background: region.arcode === s.code ? 'rgba(117,186,87,0.1)' : 'white',
                      color: region.arcode === s.code ? 'var(--primary)' : '#495057',
                      fontWeight: '700', fontSize: '12px', textAlign: 'left',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {s.name}
                  </button>
                ))
              ) : (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '30px 0', color: '#ADB5BD' }}>
                  <p style={{ fontSize: '12px' }}>목록이 없습니다.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
