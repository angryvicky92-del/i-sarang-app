import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPopularPosts } from '../services/communityService'
import { getPopularReviews, getRecentReviews } from '../services/reviewService'
import { getCurrentUser } from '../services/authService'
import { Star, ThumbsUp, MessageCircle, ChevronRight, TrendingUp, Award, Clock, Eye, BadgeCheck, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import AdBanner from '../components/AdBanner'

// Display-only Rating Component (Handled any float value)
const StarRatingDisplay = ({ rating, size = 12 }) => {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const fillAmount = Math.max(0, Math.min(1, rating - (star - 1)))
        return (
          <div key={star} style={{ position: 'relative' }}>
            <Star size={size} color="#DDD" fill="none" />
            <div style={{ 
              position: 'absolute', top: 0, left: 0, width: `${fillAmount * 100}%`, 
              height: '100%', overflow: 'hidden' 
            }}>
              <Star size={size} fill="#FFD700" color="#FFD700" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [popularPosts, setPopularPosts] = useState([])
  const [popularReviews, setPopularReviews] = useState([])
  const [recentReviews, setRecentReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const userData = await getCurrentUser()
    const userType = userData?.profile?.user_type || '학부모'
    setUser(userData)

    const [posts, bestReviews, newReviews] = await Promise.all([
      getPopularPosts(userType),
      getPopularReviews(userType),
      getRecentReviews(userType)
    ])

    setPopularPosts(posts)
    setPopularReviews(bestReviews)
    setRecentReviews(newReviews)
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
        대시보드 로딩 중...
      </div>
    )
  }

  const userTypeName = user?.profile?.user_type || '학부모'

  return (
    <div className="animate-fade" style={{ background: '#FDFBFA', position: 'relative', padding: '0 20px 20px 20px' }}>
      {/* Welcome Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--primary), #8BC34A)', 
        padding: '50px 24px', color: 'white',
        borderRadius: '0 0 40px 40px',
        boxShadow: '0 10px 30px rgba(117,186,87,0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 150, height: 150, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: '26px', fontWeight: '800', marginBottom: 10, letterSpacing: '-0.5px' }}
          >
            {user?.profile?.nickname ? `${user.profile.nickname}님, 반가워요! 👋` : '얼집체크에 오신걸 환영해요'}
          </motion.h2>
          <p style={{ opacity: 0.9, fontSize: '15px', fontWeight: '500' }}>
            {userTypeName === '관리자' ? '대시보드에서 전반적인 운영 현황을 관리해보세요.' : `${userTypeName}님을 위해 준비한 오늘의 소식이에요.`}
          </p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Popular Posts Section */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'rgba(117,186,87,0.1)', padding: 8, borderRadius: 12 }}>
                <TrendingUp size={20} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#2D3436' }}>금주의 인기글</h3>
            </div>
            <Link to="/community" style={{ textDecoration: 'none', color: '#ADB5BD', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 2 }}>
              전체보기 <ChevronRight size={16} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {popularPosts.length > 0 ? popularPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link 
                  to={`/post/${post.id}`}
                  style={{ 
                    textDecoration: 'none', color: 'inherit', background: 'white', 
                    padding: '20px', borderRadius: 24, display: 'flex', justifyContent: 'space-between',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: 15 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', background: 'rgba(117,186,87,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                        BEST
                      </span>
                      <p style={{ fontWeight: '700', fontSize: '16px', color: '#2D3436', letterSpacing: '-0.3px' }}>{post.title}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontSize: '13px', color: '#999', fontWeight: '500' }}>{post.author}</p>
                      {post.profiles && post.profiles.is_verified && <BadgeCheck size={14} color="#4A6CF7" fill="#E3F2FD" />}
                      <span style={{ fontSize: '12px', color: '#E9ECEF' }}>|</span>
                      <p style={{ fontSize: '13px', color: '#999' }}>{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8F9FA', padding: '4px 10px', borderRadius: 10 }}>
                      <ThumbsUp size={12} color="var(--primary)" fill="var(--primary)" style={{ opacity: 0.8 }} />
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{post.likes}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ADB5BD', fontSize: '12px', fontWeight: '600' }}>
                      <MessageCircle size={12} /> {post.comments_count}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#ADB5BD', background: 'white', borderRadius: 24 }}>인기글이 아직 없습니다.</div>
            )}
          </div>
        </div>

        {/* Best Reviews Section */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '0 4px' }}>
            <div style={{ background: 'rgba(255,215,0,0.1)', padding: 8, borderRadius: 12 }}>
              <Award size={20} color="#FFD700" />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#2D3436' }}>베스트 후기</h3>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20, paddingLeft: 4, scrollbarWidth: 'none' }}>
            {popularReviews.length > 0 ? popularReviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link 
                  to={`/detail/${review.center_id}`}
                  style={{ 
                    textDecoration: 'none', color: 'inherit', minWidth: 280, 
                    background: 'white', padding: '24px', borderRadius: 32,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(0,0,0,0.01)'
                  }}
                >
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <StarRatingDisplay rating={review.rating} size={14} />
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#FFD700', background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p style={{ 
                      fontSize: '15px', lineHeight: '1.6', height: '4.8em', color: '#444',
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      fontWeight: '500'
                    }}>
                      "{review.content}"
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTop: '1px solid #F8F9FA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>👤</div>
                      <span style={{ fontWeight: '700', fontSize: '13px', color: '#2D3436' }}>{review.author_nickname}</span>
                      {review.profiles && review.profiles.is_verified && <BadgeCheck size={14} color="#4A6CF7" fill="#E3F2FD" />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>
                      <ThumbsUp size={14} fill="var(--primary)" style={{ opacity: 0.8 }} /> {review.likes}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )) : (
              <div style={{ textAlign: 'center', width: '100%', padding: 40, color: '#ADB5BD', background: 'white', borderRadius: 24 }}>베스트 후기가 아직 없습니다.</div>
            )}
          </div>
        </div>

        {/* Ad Banner */}
      <AdBanner adSlot="home-middle-banner" />

        {/* Recent Reviews Section */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '0 4px' }}>
            <div style={{ background: 'rgba(99,110,114,0.1)', padding: 8, borderRadius: 12 }}>
              <Clock size={20} color="#636E72" />
            </div>
            <h3 style={{ fontSize: '19px', fontWeight: '800', color: '#2D3436' }}>실시간 리뷰</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {recentReviews.length > 0 ? recentReviews.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Link 
                  to={`/detail/${review.center_id}`}
                  style={{ 
                    textDecoration: 'none', color: 'inherit', background: 'white', 
                    padding: '20px', borderRadius: 24, 
                    display: 'flex', flexDirection: 'column', gap: 12,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                    border: '1px solid rgba(0,0,0,0.01)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', background: 'var(--primary)', opacity: 0.6 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StarRatingDisplay rating={review.rating} size={10} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>{review.rating.toFixed(1)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ADB5BD', fontSize: '11px', fontWeight: 'bold' }}>
                      <Clock size={10} /> {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', fontWeight: '500' }}>
                    {review.content.length > 60 ? `${review.content.substring(0, 60)}...` : review.content}
                  </p>
                </Link>
              </motion.div>
            )) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#ADB5BD', background: 'white', borderRadius: 24 }}>등록된 리뷰가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
