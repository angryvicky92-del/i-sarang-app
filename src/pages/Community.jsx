import React, { useState, useEffect } from 'react'
import { getPosts, createPost, deletePost } from '../services/communityService'
import { useAuth } from '../contexts/AuthContext'
import PostModal from '../components/PostModal'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Trash2, Eye, BadgeCheck, MessageCircle, ThumbsUp as ThumbsUpIcon } from 'lucide-react'
import { motion } from 'framer-motion'

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
    }} className="animate-fade-in">
      {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      {message}
    </div>
  )
}

export default function Community() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('학부모') // '학부모' 또는 '선생님'
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCheckingUser, setIsCheckingUser] = useState(true)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchPosts()
    checkUser()
  }, [activeTab]) // 탭 변경 시 다시 로드

  const checkUser = async () => {
    const userData = await getCurrentUser()
    setUser(userData)
    
    // 사용자의 회원 유형에 따라 기본 탭 설정
    if (userData?.profile?.user_type === '선생님') {
      setActiveTab('선생님')
    } else if (userData?.profile?.user_type === '학부모') {
      setActiveTab('학부모')
    }
    
    setIsCheckingUser(false)
  }

  const handleWriteClick = () => {
    if (!user) {
      setToast({ message: '로그인 후 이용 가능합니다.', type: 'error' })
      setTimeout(() => navigate('/login'), 1500)
      return
    }
    setIsModalOpen(true)
  }

  const fetchPosts = async () => {
    setLoading(true)
    const data = await getPosts(activeTab)
    setPosts(data)
    setLoading(false)
  }

  const handleCreatePost = async (newPost) => {
    const result = await createPost(newPost)
    if (result) {
      await fetchPosts()
      return true
    }
    return false
  }

  const handleDeleteQuick = async (e, postId) => {
    e.preventDefault() // Link 클릭 방지
    e.stopPropagation()
    if (!window.confirm('관리자 권한으로 이 게시글을 즉시 삭제하시겠습니까?')) return
    const success = await deletePost(postId)
    if (success) {
      setPosts(posts.filter(p => p.id !== postId))
      setToast({ message: '게시글이 삭제되었습니다.', type: 'success' })
    } else {
      setToast({ message: '삭제에 실패했습니다.', type: 'error' })
    }
  }

  return (
    <div className="animate-fade" style={{ background: '#FDFBFA', position: 'relative', padding: '0 20px 20px 20px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* 메인 탭 전환 - 관리자이거나 완전히 로그아웃된 상태가 확인된 경우에만 전환 버튼 노출 */}
      {!isCheckingUser && (profile?.user_type === '관리자' || !user) && (
        <div className="animate-fade-in" style={{ 
          display: 'flex', background: '#F1F3F5', borderRadius: 20, padding: 4, marginBottom: 24,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
        }}>
          {['학부모', '선생님'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '12px 0', border: 'none', borderRadius: 16, fontSize: '15px', fontWeight: 'bold',
                background: activeTab === tab ? 'white' : 'transparent',
                color: activeTab === tab ? 'var(--primary)' : '#748089',
                boxShadow: activeTab === tab ? '0 4px 10px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s', cursor: 'pointer'
              }}
            >
              {tab} 게시판
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: 6 }}>
            {activeTab === '학부모' ? '아이들 정보 공유 🥰' : '선생님들의 리얼 토크 🎓'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {activeTab === '학부모' ? '어린이집 소식과 질문을 자유롭게 나누세요.' : '근무 환경, 조직 문화 등 우리들만의 이야기를 나눠요.'}
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ padding: '10px 20px', borderRadius: 14, fontSize: '14px', fontWeight: 'bold' }}
          onClick={handleWriteClick}
        >
          글쓰기
        </button>
      </div>

      <PostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreatePost}
        user={user}
        activeCategory={activeTab}
      />

    
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#ADB5BD' }}>
            <div className="spinner" style={{ marginBottom: 15 }}></div>
            게시글을 불러오는 중...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 24, 
            border: '1px dashed #E9ECEF', color: '#ADB5BD' 
          }}>
            <div style={{ fontSize: '40px', marginBottom: 15 }}>📝</div>
            {activeTab === '학부모' ? '학부모 게시판의 첫 주인공이 되어보세요!' : '선생님들의 소중한 이야기를 들려주세요.'}
          </div>
        ) : (
          posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link 
                to={`/post/${post.id}`}
                style={{ 
                  textDecoration: 'none', color: 'inherit', padding: '24px', background: 'white', 
                  borderRadius: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)', display: 'block',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <h3 style={{ 
                        fontSize: '17px', lineHeight: '1.5', fontWeight: '700', color: '#2D3436',
                        flex: 1, paddingRight: profile?.user_type === '관리자' ? 40 : 0, 
                        whiteSpace: 'normal', wordBreak: 'break-word', letterSpacing: '-0.3px'
                      }}>
                        {post.title}
                      </h3>
                      {profile?.user_type === '관리자' && (
                        <button 
                          onClick={(e) => handleDeleteQuick(e, post.id)}
                          style={{ border: 'none', background: 'none', color: '#FFDADA', cursor: 'pointer', padding: '4px 8px' }}
                        >
                          <Trash2 size={16} color="#FF4D4D" />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: '13px', color: '#636E72', fontWeight: '700' }}>{post.author}</p>
                        {post.profiles && post.profiles.is_verified && <BadgeCheck size={14} color="#4A6CF7" fill="#E3F2FD" />}
                        <span style={{ fontSize: '12px', color: '#E9ECEF' }}>|</span>
                        <span style={{ fontSize: '13px', color: '#ADB5BD', fontWeight: '500' }}>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '13px', display: 'flex', gap: 12, fontWeight: 'bold' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ADB5BD' }}>
                          <Eye size={14} /> {post.views || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
                          <ThumbsUpIcon size={14} fill="var(--primary)" style={{ opacity: 0.8 }} /> {post.likes || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
                          <MessageCircle size={14} /> {post.comments_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {post.image_url && (
                    <div style={{ 
                      width: 80, height: 80, borderRadius: 18, overflow: 'hidden', 
                      flexShrink: 0, background: '#F8F9FA', border: '1px solid #F1F3F5'
                    }}>
                      <img src={post.image_url} alt="썸네일" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
