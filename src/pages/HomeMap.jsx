import React, { useState, useEffect } from 'react';
import { Map, MapMarker, MarkerClusterer, MapTypeControl, ZoomControl } from 'react-kakao-maps-sdk';
import { useNavigate } from 'react-router-dom';
import { List, X, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDaycares, TYPE_COLORS } from '../services/dataService';
import { useSearch } from '../contexts/SearchContext';
import CenterBottomSheet from '../components/CenterBottomSheet';

const HomeMap = () => {
  const { region } = useSearch();
  const navigate = useNavigate();
  const daycares = region.daycares || [];
  const [selectedId, setSelectedId] = useState(null);
  const [clusterList, setClusterList] = useState(null);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Map
        center={{ lat: daycares[0]?.lat || 37.5665, lng: daycares[0]?.lng || 126.9780 }}
        style={{ width: '100%', height: 'calc(100vh - 84px)' }}
        level={6}
      >
        <MapTypeControl position={"TOPRIGHT"} />
        <ZoomControl position={"RIGHT"} />
        <MarkerClusterer
          averageCenter={true}
          minLevel={5} // 클러스터링이 더 자주 일어나게 수정 (기존 10 -> 5)
          disableClickZoom={true} // 클릭 시 줌인 무시하고 레이어 띄우기
          styles={[{
            width: '56px', height: '56px',
            background: 'var(--primary)',
            borderRadius: '28px',
            color: '#fff',
            textAlign: 'center',
            fontWeight: '900',
            fontSize: '16px',
            lineHeight: '56px',
            boxShadow: '0 6px 16px rgba(117,186,87,0.4)',
            border: '3px solid white'
          }]}
          onClusterclick={(_, cluster) => {
            const markers = cluster.getMarkers().map(m => {
              const id = m.getTitle();
              return daycares.find(d => d.id === id);
            }).filter(Boolean);
            setClusterList(markers);
          }}
        >
          {daycares.map((daycare, index) => (
            <MapMarker
              key={daycare.id || index}
              position={{ lat: daycare.lat, lng: daycare.lng }}
              title={daycare.id} // 필수: cluster.getMarkers()에서 id를 찾기 위함
              image={{
                src: `/marker_${daycare.type === '국공립' ? 'yellow' : daycare.type === '가정' ? 'orange' : daycare.type === '민간' ? 'green' : daycare.type === '직장' ? 'blue' : 'gray'}.svg`,
                size: { width: 36, height: 44 }, // 핀 가시성 확보하되 너무 크지 않게 조절
              }}
              onClick={() => setSelectedId(daycare.id)}
            />
          ))}
        </MarkerClusterer>
      </Map>

      {/* 지역 정보 요약바 */}
      {region && (
        <div style={{ position: 'absolute', top: 20, left: 20, right: 20, background: 'white', borderRadius: 16, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 100 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
          <span style={{ fontWeight: '600', color: '#1F2937' }}>{region.sidoName} {region.name} 주변 어린이집</span>
        </div>
      )}

      {/* 범례 */}
      <div style={{ position: 'absolute', top: 80, right: 20, background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: 12, border: '1px solid #E5E7EB', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: '#4B5563' }}>{type}</span>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {clusterList && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'absolute', bottom: 100, left: 20, right: 20, background: 'white', borderRadius: 24, padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 120, maxHeight: '40vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><List size={20} /><b>이 지역 어린이집 ({clusterList.length})</b></div>
              <button onClick={() => setClusterList(null)} style={{ border: 'none', background: 'none' }}><X size={20} /></button>
            </div>
            {clusterList.map(item => (
              <div key={item.id} onClick={() => { setSelectedId(item.id); setClusterList(null); }} style={{ padding: '12px', background: '#F8F9FA', borderRadius: 12, display: 'flex', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, marginTop: 4 }} />
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{item.name}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 내비게이션 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #F3F4F6', zIndex: 110 }}>
        <div className="flex justify-around items-center py-4">
          <button className="flex flex-col items-center gap-1 text-blue-600">
            <MapIcon size={24} />
            <span className="text-xs font-medium">지도</span>
          </button>
          <button 
            onClick={() => navigate('/list')}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600"
          >
            <List size={24} />
            <span className="text-xs font-medium">목록</span>
          </button>
        </div>
      </div>

      <CenterBottomSheet 
        center={selectedId ? daycares.find(d => d.id === selectedId) : null} 
        onClose={() => setSelectedId(null)} 
      />
    </div>
  )
}

export default HomeMap;
