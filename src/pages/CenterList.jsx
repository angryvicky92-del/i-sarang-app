import React, { useEffect, useState } from 'react'
import { getDaycares } from '../services/dataService'
import { ChevronRight, Users, Clock, Search, MapPin, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import AdBanner from '../components/AdBanner'
import { useSearch } from '../contexts/SearchContext'
import LocationSelector from '../components/LocationSelector'
import { AnimatePresence, motion } from 'framer-motion'

export default function CenterList() {
  const { region } = useSearch()
  
  // Use global daycares and loading state from SearchContext
  const daycares = region.daycares || []
  const loading = region.isLoading || false
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('전체')
  const [selectedService, setSelectedService] = useState(['전체'])
  
  const [showFilter, setShowFilter] = useState(false)
  const [tempType, setTempType] = useState('전체')
  const [tempService, setTempService] = useState(['전체'])

  const TYPES = ['전체', '국공립', '가정', '민간', '직장', '기타']
  const SERVICES = ['전체', '일반', '영아전담', '장애아통합', '야간연장', '24시간', '시간제보육']

  const filteredDaycares = daycares.filter(dc => {
    const matchesSearch = dc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dc.addr.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 유형 매칭 (기타 처리)
    let matchesType = false;
    if (selectedType === '전체') {
      matchesType = true;
    } else if (selectedType === '기타') {
      matchesType = !['국공립', '가정', '민간', '직장'].some(t => dc.type.includes(t));
    } else {
      matchesType = dc.type.includes(selectedType);
    }

    const matchesService = selectedService.includes('전체') || 
                          (dc.services && dc.services.some(s => 
                            selectedService.some(sel => s.includes(sel))
                          ));
    
    return matchesSearch && matchesType && matchesService;
  })

  const openFilter = () => {
    setTempType(selectedType);
    setTempService(selectedService);
    setShowFilter(true);
  };

  const applyFilter = () => {
    setSelectedType(tempType);
    setSelectedService(tempService);
    setShowFilter(false);
  };

  const [displayCount, setDisplayCount] = useState(10);
  const loaderRef = React.useRef(null);

  // 필터나 검색어가 변하면 항상 처음 10개로 리셋
  useEffect(() => {
    setDisplayCount(10);
  }, [searchTerm, selectedType, selectedService]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setDisplayCount(prev => prev + 10);
      }
    }, { rootMargin: '200px' });
    
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [filteredDaycares]);

  const displayedDaycares = filteredDaycares.slice(0, displayCount);

  const FilterChip = ({ label, isSelected, onClick, icon }) => (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        border: '1px solid',
        borderColor: isSelected ? 'var(--primary)' : '#E9ECEF',
        background: isSelected ? 'rgba(117,186,87,0.08)' : 'white',
        color: isSelected ? 'var(--primary)' : '#495057',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="animate-fade" style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: 80 }}>
      {/* 필터 모달 패널 */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000 }} 
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', 
                borderRadius: '24px 24px 0 0', padding: '30px 20px', zIndex: 2001,
                boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1E293B' }}>검색 필터</h3>
                <button onClick={() => setShowFilter(false)} style={{ border: 'none', background: 'none', fontSize: '20px', color: '#94A3B8' }}>✕</button>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#64748B', marginBottom: 16 }}>어린이집 유형</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTempType(t)}
                      style={{
                        padding: '10px 16px', borderRadius: 12, fontSize: '13px', fontWeight: '700',
                        border: '1px solid',
                        borderColor: tempType === t ? 'var(--primary)' : '#F1F3F5',
                        background: tempType === t ? 'rgba(117,186,87,0.1)' : '#F8F9FA',
                        color: tempType === t ? 'var(--primary)' : '#64748B',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#64748B', marginBottom: 16 }}>제공 서비스</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SERVICES.map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        if (s === '전체') {
                          setTempService(['전체']);
                        } else {
                          let next = tempService.filter(item => item !== '전체');
                          if (next.includes(s)) {
                            next = next.filter(item => item !== s);
                            if (next.length === 0) next = ['전체'];
                          } else {
                            next.push(s);
                          }
                          setTempService(next);
                        }
                      }}
                      style={{
                        padding: '10px 16px', borderRadius: 12, fontSize: '13px', fontWeight: '700',
                        border: '1px solid',
                        borderColor: tempService.includes(s) ? 'var(--primary)' : '#F1F3F5',
                        background: tempService.includes(s) ? 'rgba(117,186,87,0.1)' : '#F8F9FA',
                        color: tempService.includes(s) ? 'var(--primary)' : '#64748B',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => { setTempType('전체'); setTempService('전체'); }}
                  style={{ flex: 1, padding: '16px', borderRadius: 16, background: '#F1F3F5', border: 'none', color: '#64748B', fontWeight: '800' }}
                >
                  초기화
                </button>
                <button 
                  onClick={applyFilter}
                  style={{ flex: 2, padding: '16px', borderRadius: 16, background: 'var(--primary)', border: 'none', color: 'white', fontWeight: '800' }}
                >
                  필터 적용하기
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ padding: '20px' }}>
        {/* 키워드 검색 및 필터 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ 
            background: 'white', borderRadius: 20, padding: '14px 20px', 
            display: 'flex', alignItems: 'center', gap: 12, flex: 1,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)'
          }}>
            <Search size={20} color="#ADB5BD" strokeWidth={2.5} />
            <input 
              placeholder="이름 또는 주소"
              style={{ border: 'none', outline: 'none', fontSize: '15px', flex: 1, fontWeight: '600', color: '#1E293B' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div 
            style={{ 
              width: 52, height: 52, borderRadius: 20, background: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)',
            }}
          >
            <Search size={20} color="#64748B" strokeWidth={2.5} />
          </div>
        </div>


        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'nowrap', gap: 12 }}>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {region.sigungu} <span style={{ color: 'var(--primary)' }}>{filteredDaycares.length}</span>곳
          </h2>
          {(() => {
            const serviceCount = selectedService.includes('전체') ? 0 : selectedService.length;
            const filterCount = (selectedType !== '전체' ? 1 : 0) + serviceCount;
            return (
              <button 
                onClick={openFilter}
                style={{ 
                  border: 'none', background: 'var(--primary)', color: 'white', fontSize: '14px', 
                  fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 16px', borderRadius: '14px',
                  boxShadow: '0 6px 16px rgba(117,186,87,0.25)',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                <Filter size={15} fill="white" />
                <span>필터</span>
                {filterCount > 0 && (
                  <span style={{ 
                    background: 'rgba(255,255,255,0.25)', padding: '1px 5px', 
                    borderRadius: '6px', fontSize: '11px', fontWeight: '900',
                    marginLeft: -2,
                    display: 'inline-block'
                  }}>
                    {filterCount}
                  </span>
                )}
              </button>
            );
          })()}
        </div>
        
        <AdBanner adSlot="list-top-banner" />
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#ADB5BD' }}>
            <p>데이터를 불러오는 중입니다...</p>
          </div>
        ) : filteredDaycares.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: '#ADB5BD' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p style={{ fontWeight: '600' }}>검색 결과가 없습니다.<br/>주소나 이름을 다시 확인해주세요.</p>
          </div>
        ) : (
          <div>
            {displayedDaycares.map(dc => (
              <Link 
                key={dc.id} 
                to={`/detail/${dc.id}`}
                state={{ daycare: dc }}
                style={{ 
                  textDecoration: 'none', color: 'inherit', display: 'flex',
                  padding: '20px', backgroundColor: 'white', borderRadius: 24, 
                  marginBottom: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
                  justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.01)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: '900', 
                      color: dc.color || 'var(--primary)', 
                      backgroundColor: `${dc.color || 'var(--primary)'}15`, 
                      padding: '4px 10px', 
                      borderRadius: '8px'
                    }}>
                      {dc.type}
                    </span>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#2D3436' }}>{dc.name}</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: '#636E72', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} strokeWidth={2.5} /> {dc.addr}
                  </p>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: 'var(--primary)', fontWeight: '700' }}>
                      <Users size={14} />
                      <span>대기 {dc.waitingCount}명</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px', color: '#ADB5BD', fontWeight: '600' }}>
                      <Clock size={14} />
                      <span>자세히 보기</span>
                    </div>
                  </div>
                </div>
                <div style={{ background: '#F8F9FA', padding: 8, borderRadius: 12 }}>
                  <ChevronRight size={18} color="#ADB5BD" />
                </div>
              </Link>
            ))}
            
            {displayCount < filteredDaycares.length && (
              <div 
                ref={loaderRef} 
                style={{ padding: '30px 0', textAlign: 'center', color: '#ADB5BD', fontSize: '14px', fontWeight: 'bold' }}
              >
                더 가져오는 중...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
