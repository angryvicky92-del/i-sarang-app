import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserCheck, Briefcase, Star, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getReviews } from '../services/reviewService';
import { getDaycaresDetailed } from '../services/dataService';

const CenterBottomSheet = ({ center, onClose }) => {
  const navigate = useNavigate();
  const [realRatings, setRealRatings] = useState({ parent: '0.0', teacher: '0.0', loading: false });
  const [detailedInfo, setDetailedInfo] = useState({ 
    loading: false, capacity: 0, current: 0, waiting: 0, teachers: 0, avgTenure: 'None' 
  });

  useEffect(() => {
    let isMounted = true;
    if (!center) return;

    const setInfo = () => {
      const t = center.tenureBreakdown || {};
      const total = (Number(t.y0)||0) + (Number(t.y1)||0) + (Number(t.y2)||0) + (Number(t.y4)||0) + (Number(t.y6)||0);
      let avg = 'None';
      if (total > 0) {
        avg = `${(((t.y0||0)*0.5 + (t.y1||0)*1.5 + (t.y2||0)*3 + (t.y4||0)*5 + (t.y6||0)*8) / total).toFixed(1)}년`; 
      }
      setDetailedInfo({
        loading: false,
        capacity: center.capacity || 0,
        current: center.current || 0,
        waiting: center.waitingCount || (center.waitingBreakdown ? center.waitingBreakdown.total : 0),
        teachers: center.teacherCount || 0,
        avgTenure: avg
      });
    };

    setInfo();

    const fetchData = async () => {
      try {
        const reviewData = await getReviews(center.id);
        
        if (!isMounted) return;

        if (reviewData) {
          const validReviews = reviewData.filter(r => r.rating_parent || r.rating_teacher);
          if (validReviews.length > 0) {
            const sumP = validReviews.reduce((acc, r) => acc + (r.rating_parent || 0), 0);
            const sumT = validReviews.reduce((acc, r) => acc + (r.rating_teacher || 0), 0);
            setRealRatings({
              parent: (sumP / validReviews.length).toFixed(1),
              teacher: (sumT / validReviews.length).toFixed(1),
              loading: false
            });
          }
        }
      } catch (e) {
        if (isMounted) setDetailedInfo(prev => ({ ...prev, loading: false }));
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [center]);

  if (!center) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          background: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '0 auto 24px' }} onClick={onClose} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ 
                padding: '2px 8px', borderRadius: 4, fontSize: '10px', 
                fontWeight: '800', color: 'white', background: center.color 
              }}>
                {center.type}
              </span>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0, lineHeight: 1.2 }}>
                {center.name}
              </h2>
            </div>
            <p style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500', margin: 0 }}>{center.addr}</p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              padding: 8, marginLeft: 8, background: 'none', border: 'none', 
              borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center' 
            }}
          >
            <X size={20} color="#9CA3AF" />
          </button>
        </div>

        {/* 평점 카드 - 전화기 버튼 없이 전체 너비 활용 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 16, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
            <div style={{ fontSize: '10px', color: '#3B82F6', fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              학부모 평점
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={18} fill="#3B82F6" color="#3B82F6" />
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#1E3A8A' }}>{realRatings.parent}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: 16, borderRadius: 16, border: '1px solid rgba(34, 197, 94, 0.1)' }}>
            <div style={{ fontSize: '10px', color: '#22C55E', fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              선생님 평점
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={18} fill="#22C55E" color="#22C55E" />
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#14532D' }}>{realRatings.teacher}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32, background: 'rgba(249, 250, 251, 0.5)', padding: 16, borderRadius: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Users size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '800', marginBottom: 2 }}>현원/정원</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#1F2937' }}>{detailedInfo.current}/{detailedInfo.capacity}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Clock size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '800', marginBottom: 2 }}>대기인원</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#1F2937' }}>{detailedInfo.waiting}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <UserCheck size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '800', marginBottom: 2 }}>교사수</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#1F2937' }}>{detailedInfo.teachers}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Briefcase size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
            <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '800', marginBottom: 2 }}>평균근속</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#1F2937' }}>{detailedInfo.avgTenure}</span>
          </div>
        </div>

        <button
          onClick={() => navigate(`/detail/${center.id}`, { state: { arcode: center.arcode } })}
          style={{ 
            width: '100%', padding: '18px', background: '#111827', color: 'white', 
            borderRadius: 16, fontWeight: '900', fontSize: '16px', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
            border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
          }}
        >
          상세 정보 보기
          <ChevronRight size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default CenterBottomSheet;
