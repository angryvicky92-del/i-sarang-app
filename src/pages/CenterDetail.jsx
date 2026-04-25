import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Map, Roadview } from 'react-kakao-maps-sdk'
import { getDaycareById, getDaycareStatus, SIDO_LIST } from '../services/dataService'
import { getReviews, createReview, toggleReviewLike, deleteReview, updateReview } from '../services/reviewService'
import { useAuth } from '../contexts/AuthContext'
import { useSearch } from '../contexts/SearchContext'
import { 
  MapPin, Phone, Users, User, Clock, Briefcase, Bus, AlertTriangle, Loader2, ChevronLeft, Building, 
  Star, MessageCircle, MoreHorizontal, ThumbsUp, Trash2, Edit2, X, Send, Camera,
  CheckCircle2, AlertCircle, Sparkles, BadgeCheck, Heart, ExternalLink
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Star Rating Display Component
const StarRatingDisplay = ({ rating, size = 16 }) => {
  const safeRating = typeof rating === 'number' ? rating : 0;
  const fullStars = Math.floor(safeRating);
  
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= fullStars ? "#FFD700" : "none"}
          color={star <= fullStars ? "#FFD700" : "#E2E8F0"}
          strokeWidth={star <= fullStars ? 0 : 2}
        />
      ))}
    </div>
  )
}

// Interactive Star Rating for Review Writing
const InteractiveStarRating = ({ rating, onChange, size = 20 }) => {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          onClick={() => onChange(star)}
          fill={star <= rating ? "#FFD700" : "none"}
          color={star <= rating ? "#FFD700" : "#E2E8F0"}
          strokeWidth={star <= rating ? 0 : 2}
          style={{ cursor: 'pointer' }}
        />
      ))}
    </div>
  )
}

// Service Checkbox Item
const ServiceCheckbox = ({ label, isOn }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isOn ? 1 : 0.3 }}>
      <div style={{ 
        width: 18, height: 18, borderRadius: 4, border: '1.5px solid #CBD5E1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isOn ? 'var(--primary)' : '#F1F5F9',
        borderColor: isOn ? 'var(--primary)' : '#CBD5E1'
      }}>
        {isOn && <CheckCircle2 size={12} color="white" />}
      </div>
      <span style={{ fontSize: '12px', fontWeight: isOn ? '800' : '500', color: isOn ? '#1E293B' : '#94A3B8' }}>
        {label}
      </span>
    </div>
  )
}

// Custom Toast
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? '#FF4D4D' : '#4CAF50',
      color: 'white', padding: '12px 24px', borderRadius: '50px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)', zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: '8px',
      fontSize: '14px', fontWeight: 'bold'
    }}>
      {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      {message}
    </div>
  )
}

// Donut Chart Component for Staff Tenure
const DonutChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + Math.round(item.value || 0), 0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let currentPos = 0;
  
  if (total === 0) return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '13px' }}>데이터 없음</div>

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {data.map((item, i) => {
            const val = item.percent || 0;
            if (val <= 0) return null;
            
            const ratio = val / 100;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -(currentPos / 100) * circumference;
            currentPos += val;
            
            return (
              <motion.circle
                key={i}
                cx="50" cy="50" r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeDashoffset }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              />
            );
          })}
          <circle cx="50" cy="50" r={34} fill="white" />
        </svg>
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '600' }}>보육교사</div>
          <div style={{ fontSize: '18px', fontWeight: '900', color: '#1E293B' }}>{total}<span style={{ fontSize: '12px' }}>명</span></div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 170 }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>{item.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '15px', fontWeight: '900', color: '#1E293B', minWidth: '35px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(item.value || 0)}
              </span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E293B', minWidth: '20px' }}>명</span>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '500', marginLeft: 4, minWidth: '45px' }}>
                ({item.percent || 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function CenterDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { region } = useSearch()
  
  const [daycare, setDaycare] = useState(location.state?.daycare || null)
  const [detailedStatus, setDetailedStatus] = useState(null)
  const [isStatusLoading, setIsStatusLoading] = useState(!location.state?.daycare)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(!location.state?.daycare)
  const { user, profile } = useAuth()
  const [_user, setUser] = useState(null) // legacy compat
  const [activeTab, setActiveTab] = useState('기본정보')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [toast, setToast] = useState(null)
  const [sortBy, setSortBy] = useState('newest')
  const [hasRoadview, setHasRoadview] = useState(true)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editReviewContent, setEditReviewContent] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)

  const reviewsRef = useRef(null)

  // 즐겨찾기 로드
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    setIsFavorite(favorites.includes(id))
  }, [id])

  useEffect(() => {
    fetchData()
  }, [id, sortBy])

  useEffect(() => {
    if (daycare?.lat && daycare?.lng && window.kakao && window.kakao.maps) {
      try {
        const roadviewClient = new window.kakao.maps.RoadviewClient();
        const position = new window.kakao.maps.LatLng(daycare.lat, daycare.lng);
        
        roadviewClient.getNearestPanoId(position, 50, (panoId) => {
          setHasRoadview(panoId !== null);
        });
      } catch (e) {
        console.warn("[CenterDetail] Roadview check failed:", e);
      }
    }
  }, [daycare]);

  const fetchData = async () => {
    if (!daycare) setLoading(true)
    try {
      // user from AuthContext
      
      const stcode = daycare?.stcode || id;
      const [daycareData, statusData, reviewData] = await Promise.all([
        getDaycareById(id, region?.arcode),
        getDaycareStatus(stcode, region?.arcode),
        getReviews(id, userData?.id, sortBy)
      ])
      if (daycareData) setDaycare(daycareData)
      if (statusData) {
        setDetailedStatus(statusData)
        // 상세 데이터가 있으면 상세 데이터의 정보로 daycare 객체 업데이트 (정원, 근속연수 등 포함)
        setDaycare(prev => ({ ...prev, ...statusData }));
      }
      setReviews(reviewData || [])
    } catch (err) {
      console.error("[CenterDetail] fetchData failed:", err);
    } finally {
      setLoading(false)
      setIsStatusLoading(false)
    }
  }

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    let newFavorites
    if (isFavorite) {
      newFavorites = favorites.filter(favId => favId !== id)
      setToast({ message: '즐겨찾기에서 해제되었습니다.', type: 'success' })
    } else {
      newFavorites = [...favorites, id]
      setToast({ message: '즐겨찾기에 추가되었습니다!', type: 'success' })
    }
    localStorage.setItem('favorites', JSON.stringify(newFavorites))
    setIsFavorite(!isFavorite)
  }

  const getWaitingAppUrl = () => {
    if (!daycare) return '#'
    const sidoName = daycare.addr.split(' ')[0]
    const sidoInfo = SIDO_LIST.find(s => sidoName.includes(s.name.substring(0, 2)))
    const sidoCode = sidoInfo ? `${sidoInfo.code}000` : '28000'
    return `https://www.childcare.go.kr/?menuno=166&sido=${sidoCode}&sidoText=${encodeURIComponent(sidoName)}&searchText=${encodeURIComponent(daycare.name)}`
  }

  const handleReviewSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    if (!user) {
      setToast({ message: '로그인 후 후기를 남길 수 있습니다.', type: 'error' })
      setTimeout(() => navigate('/login'), 1500)
      return
    }
    const isTeacher = user.profile?.user_type === '선생님'
    if (isTeacher && !user.profile?.is_verified) {
      setToast({ message: '인증된 선생님만 후기를 작성할 수 있습니다.', type: 'error' })
      return
    }
    if (!content.trim()) return

    const newReview = await createReview({
      center_id: id,
      user_id: user.id,
      rating: rating,
      content: content,
      author_nickname: user.profile?.nickname || '회원님',
      likes: 0
    })

    if (newReview) {
      setReviews([{ ...newReview, is_liked: false }, ...reviews])
      setContent('')
      setRating(5)
      setToast({ message: '후기가 등록되었습니다!', type: 'success' })
    } else {
      setToast({ message: '후기 등록에 실패했습니다.', type: 'error' })
    }
  }

  const handleLike = async (reviewId, isLiked) => {
    if (!user) {
      setToast({ message: '로그인 후 추천할 수 있습니다.', type: 'error' })
      return
    }
    const previousReviews = [...reviews]
    setReviews(reviews.map(r => 
      r.id === reviewId 
        ? { ...r, is_liked: !isLiked, likes: isLiked ? Math.max(0, (r.likes || 1) - 1) : (r.likes || 0) + 1 } 
        : r
    ))
    const result = await toggleReviewLike(reviewId, user.id, isLiked)
    if (!result) setReviews(previousReviews)
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('정말 후기를 삭제하시겠습니까?')) return
    const success = await deleteReview(reviewId)
    if (success) {
      setReviews(reviews.filter(r => r.id !== reviewId))
      setToast({ message: '후기가 삭제되었습니다.', type: 'success' })
    }
  }

  const handleUpdateReview = async (reviewId) => {
    if (!editReviewContent.trim()) return
    const updated = await updateReview(reviewId, { rating: editRating, content: editReviewContent })
    if (updated) {
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, ...updated } : r))
      setEditingReviewId(null)
      setToast({ message: '후기가 수정되었습니다.', type: 'success' })
    }
  }

  if (loading && !daycare) return (
    <div style={{ padding: '100px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <Loader2 size={40} className="animate-spin" color="var(--primary)" />
      <div style={{ fontWeight: '800', color: '#64748B' }}>정보를 불러오는 중...</div>
    </div>
  )
  
  if (!daycare) return (
    <div style={{ padding: '100px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <AlertTriangle size={60} color="#FFD700" />
      <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B' }}>정보를 찾을 수 없습니다</h3>
      <button 
        onClick={() => navigate(-1)}
        style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 50, fontWeight: '800' }}
      >
        이전 페이지로 돌아가기
      </button>
    </div>
  )

  const parentReviews = reviews.filter(r => r?.profiles?.user_type === '학부모' || !r?.profiles)
  const teacherReviews = reviews.filter(r => r?.profiles?.user_type === '선생님')
  const getAvg = (list) => {
    if (!list || list.length === 0) return '0.0'
    const validRatings = list.filter(r => typeof r.rating === 'number')
    if (validRatings.length === 0) return '0.0'
    return (validRatings.reduce((acc, curr) => acc + curr.rating, 0) / validRatings.length).toFixed(1)
  }
  const parentAvg = getAvg(parentReviews)
  const teacherAvg = getAvg(teacherReviews)
  const visibleReviews = user?.profile?.user_type === '선생님' ? teacherReviews : parentReviews

  return (
    <div className="animate-fade" style={{ background: '#FDFBFA', minHeight: '100vh', paddingBottom: 100, position: 'relative' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Roadview Header */}
      <div style={{ height: 220, position: 'relative', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', overflow: 'hidden' }}>
        {daycare?.lat && daycare?.lng && hasRoadview ? (
          <Roadview
            position={{ lat: daycare.lat, lng: daycare.lng, radius: 50 }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: 12 }}>
            <MapPin size={40} style={{ opacity: 0.6 }} />
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>로드뷰 지원 불가 지역</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <ChevronLeft size={24} color="var(--primary)" />
          </button>
          <button 
            onClick={toggleFavorite}
            style={{ background: 'white', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <Heart size={22} fill={isFavorite ? "#EF4444" : "none"} color={isFavorite ? "#EF4444" : "#94A3B8"} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: -20, background: 'white', borderRadius: '30px 30px 0 0', padding: '40px 20px 30px', boxShadow: '0 -10px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <span style={{ 
              fontSize: '12px', fontWeight: '900', color: daycare?.color || 'var(--primary)', 
              background: `${daycare?.color || 'var(--primary)'}15`, padding: '6px 12px', 
              borderRadius: '10px', display: 'inline-block', marginBottom: '16px'
            }}>
              {daycare?.type || '일반'} 어린이집
            </span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#1E293B', lineHeight: 1.3 }}>{daycare?.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: '14px', marginTop: 12 }}>
              <MapPin size={16} />
              <span>{daycare?.addr}</span>
            </div>
          </div>
          <a href={`tel:${daycare?.tel}`} style={{ 
            background: '#F8F9FA', width: 48, height: 48, borderRadius: 18, color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <Phone size={22} />
          </a>
        </div>

        {/* Rating Summary */}
        <div style={{ marginTop: 24, padding: 20, borderRadius: 24, background: '#F8FAFC', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <div style={{ textAlign: 'center', borderRight: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#F97316', marginBottom: 5 }}>학부모 평점</div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>{parentAvg}</div>
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
              <StarRatingDisplay rating={parseFloat(parentAvg)} size={10} />
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#4A6CF7', marginBottom: 5 }}>교직원 평점</div>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>{teacherAvg}</div>
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
              <StarRatingDisplay rating={parseFloat(teacherAvg)} size={10} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, borderBottom: '1px solid #F1F5F9' }}>
          {['기본정보', '후기'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                padding: '15px 5px', border: 'none', background: 'none', fontSize: '15px', 
                fontWeight: activeTab === tab ? '800' : '600', 
                color: activeTab === tab ? 'var(--primary)' : '#94A3B8', 
                borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent', 
                cursor: 'pointer'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ paddingTop: 24 }}>
          {activeTab === '기본정보' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {/* 기본 운영 정보 Section */}
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '800' }}>기본 운영 정보</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {(() => {
                    let totalCurrent = 0;
                    let totalCapacity = 0;
                    if (detailedStatus) {
                      totalCurrent = Object.values(detailedStatus.current || {}).reduce((a, b) => a + b, 0);
                      totalCapacity = Object.values(detailedStatus.capacity || {}).reduce((a, b) => a + b, 0);
                    }
                    if (totalCapacity === 0 && daycare?.capacity) totalCapacity = daycare.capacity;
                    if (totalCurrent === 0 && daycare?.current) totalCurrent = daycare.current;

                    return [
                      { label: '대표자', value: daycare?.directorName, icon: <User size={16} /> },
                      { label: '현원/정원', value: `${totalCurrent}/${totalCapacity}명`, icon: <Users size={16} /> },
                      { label: '교직원수', value: `${daycare?.teacherCount || 0}명`, icon: <Briefcase size={16} /> },
                      { label: '운영시간', value: daycare?.opertime || '07:30~19:30', icon: <Clock size={16} /> },
                      { label: '통학차량', value: daycare?.vehicle || '미운영', icon: <Bus size={16} /> },
                      { label: '관할기관', value: daycare?.office || '정보 없음', icon: <Building size={16} /> },
                    ];
                  })().map((item, i) => (
                    <div key={i} style={{ padding: 15, background: '#F8FAFC', borderRadius: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: '12px', marginBottom: 4 }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '14px' }}>{item.value || '정보 없음'}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 제공서비스 Section */}
              <div style={{ marginTop: -12, display: 'flex', border: '1px solid #F1F5F9', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ width: 100, background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, borderRight: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#64748B' }}>
                    <Sparkles size={20} />
                    <span style={{ fontSize: '12px', fontWeight: '800' }}>제공서비스</span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px 10px' }}>
                  {[
                    '일반', '영아전담', '장애아전문', '장애아통합', '방과후 전담', 
                    '방과후통합', '야간연장형', '휴일보육', '24시간', '시간제보육'
                  ].map((service) => {
                    const daycareServices = (daycare?.spec || '일반').split(/[(),]+/).map(s => s.trim());
                    const isOn = daycareServices.some(s => s.includes(service.replace('형', '')) || service.includes(s));
                    return <ServiceCheckbox key={service} label={service} isOn={isOn} />;
                  })}
                </div>
              </div>

              {/* 연령별 아동 현황 Section */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0 }}>연령별 아동 현황</h3>
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600' }}>* 정보공시 기준</span>
                </div>
                <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid #F1F5F9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '340px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          <th style={{ padding: '14px 10px', textAlign: 'left', fontWeight: '800', color: '#64748B', borderBottom: '2px solid #E2E8F0', width: '30%' }}>연령</th>
                          <th style={{ padding: '14px 10px', textAlign: 'center', fontWeight: '800', color: '#64748B', borderBottom: '2px solid #E2E8F0' }}>반수</th>
                          <th style={{ padding: '14px 10px', textAlign: 'center', fontWeight: '800', color: '#64748B', borderBottom: '2px solid #E2E8F0' }}>아동수</th>
                          <th style={{ padding: '14px 10px', textAlign: 'center', fontWeight: '800', color: '#64748B', borderBottom: '2px solid #E2E8F0' }}>대기</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rowsConfig = [
                            { label: '만0세', classKey: 'age0', childKey: 'age0', waitKey: 'age0' },
                            { label: '만1세', classKey: 'age1', childKey: 'age1', waitKey: 'age1' },
                            { label: '만2세', classKey: 'age2', childKey: 'age2', waitKey: 'age2' },
                            { label: '만3세', classKey: 'age3', childKey: 'age3', waitKey: 'age3' },
                            { label: '만4세', classKey: 'age4', childKey: 'age4', waitKey: 'age4' },
                            { label: '만5세', classKey: 'age5', childKey: 'age5', waitKey: 'age5' },
                            { label: '영아혼합', classKey: 'infantMixed', childKey: 'infantMixed', waitKey: 'mixed' },
                            { label: '영유아혼합', classKey: 'toddlerMixed', childKey: 'toddlerMixed', waitKey: 'mixed' },
                            { label: '유아혼합', classKey: 'childMixed', childKey: 'childMixed', waitKey: 'mixed' },
                            { label: '특수/장애', classKey: 'special', childKey: 'special', waitKey: 'special' },
                          ];
                          const displayStats = rowsConfig.map(item => {
                            const classCount = detailedStatus?.classes?.[item.classKey] || daycare?.classBreakdown?.[item.classKey] || 0;
                            const currentChild = detailedStatus?.current?.[item.childKey] || daycare?.childBreakdown?.[item.childKey] || 0;
                            const capacityChild = detailedStatus?.capacity?.[item.childKey] || daycare?.capacityBreakdown?.[item.childKey] || 0;
                            const waitCount = daycare?.waitingBreakdown?.[item.waitKey]?.count || 0;
                            const isMainAge = item.classKey.startsWith('age');
                            return { ...item, classCount, currentChild, capacityChild, waitCount, shouldShow: isMainAge || classCount > 0 || currentChild > 0 };
                          }).filter(s => s.shouldShow);
                          const totalClasses = displayStats.reduce((sum, s) => sum + s.classCount, 0);
                          const totalCurrent = displayStats.reduce((sum, s) => sum + s.currentChild, 0);
                          const totalCapacity = daycare?.capacity || displayStats.reduce((sum, s) => sum + s.capacityChild, 0);
                          const totalWaiting = daycare?.waitingBreakdown?.total || daycare?.waitingCount || displayStats.reduce((sum, s) => sum + s.waitCount, 0);
                          return (
                            <>
                              {displayStats.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '12px 10px', color: '#444', fontWeight: '600' }}>{item.label}</td>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#666' }}>{item.classCount}</td>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#111', fontWeight: '700' }}>{item.capacityChild > 0 ? `${item.currentChild}/${item.capacityChild}` : `${item.currentChild}`}</td>
                                  <td style={{ padding: '12px 10px', textAlign: 'center', color: '#EF4444', fontWeight: '700' }}>{item.waitCount}</td>
                                </tr>
                              ))}
                              <tr style={{ background: '#F8FAFC', fontWeight: '800', borderTop: '2px solid #E2E8F0' }}>
                                <td style={{ padding: '14px 10px', color: '#1E293B' }}>총계</td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#1E293B' }}>{totalClasses}</td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#1E293B' }}>{totalCapacity > 0 ? `${totalCurrent}/${totalCapacity}` : `${totalCurrent}`}</td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#EF4444' }}>{totalWaiting}</td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* 교직원 상세 정보 Section */}
              <section>
                <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: 16 }}>교직원 상세 정보</h3>
                <div style={{ background: 'white', border: '1px solid #F1F5F9', borderRadius: 24, padding: '24px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', marginBottom: 15 }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: 20, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color="#4A6CF7" /> 교사 근속 년수 비율
                  </div>
                  <DonutChart data={[
                    { label: '1년 미만', value: daycare?.nurseryTeacherCount > 0 ? ((daycare?.tenureBreakdown?.y0 / 100) * daycare.nurseryTeacherCount) : 0, percent: daycare?.tenureBreakdown?.y0, color: '#3B82F6' },
                    { label: '1~2년', value: daycare?.nurseryTeacherCount > 0 ? ((daycare?.tenureBreakdown?.y1 / 100) * daycare.nurseryTeacherCount) : 0, percent: daycare?.tenureBreakdown?.y1, color: '#10B981' },
                    { label: '2~4년', value: daycare?.nurseryTeacherCount > 0 ? ((daycare?.tenureBreakdown?.y2 / 100) * daycare.nurseryTeacherCount) : 0, percent: daycare?.tenureBreakdown?.y2, color: '#F59E0B' },
                    { label: '4~6년', value: daycare?.nurseryTeacherCount > 0 ? ((daycare?.tenureBreakdown?.y4 / 100) * daycare.nurseryTeacherCount) : 0, percent: daycare?.tenureBreakdown?.y4, color: '#EF4444' },
                    { label: '6년 이상', value: daycare?.nurseryTeacherCount > 0 ? ((daycare?.tenureBreakdown?.y6 / 100) * daycare.nurseryTeacherCount) : 0, percent: daycare?.tenureBreakdown?.y6, color: '#8B5CF6' },
                  ]} />
                </div>
                <div style={{ background: 'white', border: '1px solid #F1F5F9', borderRadius: 24, padding: '24px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: 20, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={16} color="#10B981" /> 교직원 구성 현황 (총 {daycare?.teacherCount || 0}명)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {[
                      { label: '원장', value: daycare?.staffBreakdown?.director },
                      { label: '보육교사', value: daycare?.staffBreakdown?.teacher },
                      { label: '특수교사', value: daycare?.staffBreakdown?.special },
                      { label: '조리원', value: daycare?.staffBreakdown?.cook },
                      { label: '간호/사무', value: daycare?.staffBreakdown?.nurse + daycare?.staffBreakdown?.other },
                    ].filter(item => item.value > 0).map((item, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', background: '#F8FAFC', borderRadius: 16 }}>
                        <span style={{ fontSize: '11px', color: '#64748B', marginBottom: 4 }}>{item.label}</span>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B' }}>{item.value || 0}명</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 시설 상세 Section */}
              <section>
                <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: 16 }}>시설 상세</h3>
                <div style={{ background: '#F8FAFC', borderRadius: 20, padding: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                    <div><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: 4 }}>CCTV 설치수</div><div style={{ fontWeight: '800' }}>{daycare?.cctv || 0}대</div></div>
                    <div><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: 4 }}>놀이터 수</div><div style={{ fontWeight: '800' }}>{daycare?.playground || 0}개</div></div>
                    <div><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: 4 }}>보육실 수</div><div style={{ fontWeight: '800' }}>{daycare?.roomCount || 0}개</div></div>
                    <div><div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: 4 }}>전용 면적</div><div style={{ fontWeight: '800' }}>{daycare?.roomSize || 0}㎡</div></div>
                  </div>
                </div>
              </section>

              {/* 대기신청 버튼 (탭의 가장 하단) */}
              <a 
                href={getWaitingAppUrl()} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  gap: 10, padding: '18px', background: 'var(--primary)', color: 'white', 
                  borderRadius: 20, textDecoration: 'none', fontSize: '16px', fontWeight: '800',
                  boxShadow: '0 8px 20px rgba(117,186,87,0.25)'
                }}
              >
                <ExternalLink size={20} />
                어린이집 대기신청하기
              </a>
            </div>
          )}
          {activeTab === '후기' && (
            <div>
              {/* 후기 작성 폼 통합 */}
              <div style={{ marginBottom: 32, padding: 24, background: '#F8FAFC', borderRadius: 24, border: '1px solid #F1F5F9' }}>
                <h4 style={{ fontSize: '15px', fontWeight: '900', color: '#1E293B', marginBottom: 16 }}>이곳에 대한 솔직한 후기를 들려주세요</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                   <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>별점 선택</div>
                   <InteractiveStarRating rating={rating} onChange={setRating} size={24} />
                </div>
                <textarea 
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="아이와 함께한 소중한 경험을 나누어주세요 (최소 10자 이상)"
                  style={{ width: '100%', height: 120, borderRadius: 16, border: '1px solid #E2E8F0', padding: 16, outline: 'none', resize: 'none', fontSize: '14px', background: 'white', marginBottom: 16 }}
                />
                <button 
                  onClick={handleReviewSubmit}
                  disabled={!content.trim()}
                  style={{ width: '100%', padding: '16px', background: content.trim() ? 'var(--primary)' : '#CBD5E1', color: 'white', border: 'none', borderRadius: 16, fontWeight: '800', fontSize: '15px', cursor: content.trim() ? 'pointer' : 'not-allowed' }}
                >
                  등록하기
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontWeight: '800' }}>전체 후기 ({visibleReviews.length})</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setSortBy('newest')} style={{ fontSize: '12px', background: 'none', border: 'none', color: sortBy === 'newest' ? 'var(--primary)' : '#999', cursor: 'pointer' }}>최신순</button>
                  <button onClick={() => setSortBy('likes')} style={{ fontSize: '12px', background: 'none', border: 'none', color: sortBy === 'likes' ? 'var(--primary)' : '#999', cursor: 'pointer' }}>추천순</button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {visibleReviews.length > 0 ? visibleReviews.map((review, i) => (
                  <div key={review.id || i} style={{ padding: 20, background: 'white', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <StarRatingDisplay rating={review.rating} size={12} />
                      <span style={{ fontSize: '11px', color: '#ADB5BD' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: 15 }}>{review.content}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '12px', fontWeight: '800' }}>{review.author_nickname}</span>
                        {review.profiles?.is_verified && <BadgeCheck size={14} color="#4A6CF7" />}
                      </div>
                      <button 
                        onClick={() => handleLike(review.id, review.is_liked)}
                        style={{ border: '1px solid #E2E8F0', background: review.is_liked ? '#F0FDF4' : 'white', padding: '6px 12px', borderRadius: 12, fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <ThumbsUp size={12} /> {review.likes || 0}
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
                    <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <p style={{ fontSize: '13px' }}>작성된 후기가 없습니다.<br/>첫 번째 후기를 남겨보세요!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
