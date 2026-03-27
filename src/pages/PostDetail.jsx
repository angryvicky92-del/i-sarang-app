import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPostDetail, likePost, getComments, createComment, deletePost, deleteComment, updatePost, updateComment, incrementViewCount } from '../services/communityService'
import { getCurrentUser } from '../services/authService'
import { ChevronLeft, ThumbsUp as ThumbsUpIcon, MessageCircle, Send, CheckCircle2, AlertCircle, Trash2, Edit2, Eye, BadgeCheck, Clock, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AdBanner from '../components/AdBanner'

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
      fontSize: '14px', fontWeight: 'bold', minWidth: '200px', justifyContent: 'center'
    }} className="animate-fade-in">
      {type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      {message}
    </div>
  )
}

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState(null)

  // Edit States
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentContent, setEditCommentContent] = useState('')

  useEffect(() => {
    fetchData()
    checkUser()
  }, [id])

  const checkUser = async () => {
    const userData = await getCurrentUser()
    setUser(userData)
  }

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // 조회수 증가 (비동기로 실행하되 상세 데이터를 가져오기 전에 실행하여 최신값 반영 가능성 높임)
      incrementViewCount(id)

      const [postData, commentData] = await Promise.all([
        getPostDetail(id),
        getComments(id)
      ])
      
      // 권한 체크: 사용자가 관리자가 아니고, 본인의 회원 유형과 게시글 카테고리가 다른 경우 접근 차단
      const userData = await getCurrentUser()
      if (userData && userData.profile && userData.profile.user_type !== '관리자' && postData) {
        if (postData.category_type && postData.category_type !== userData.profile.user_type) {
          showToast('해당 게시판에 접근 권한이 없습니다.', 'error')
          setTimeout(() => navigate('/community'), 1500)
          return
        }
      }

      setPost(postData)
      setComments(commentData)
    } catch (e) {
      showToast('데이터를 불러오는데 실패했습니다.')
    }
    setLoading(false)
  }

  const handleLike = async () => {
    if (!user) {
      showToast('로그인 후 추천할 수 있습니다.')
      setTimeout(() => navigate('/login'), 1500)
      return
    }
    if (!post) return
    const updatedPost = await likePost(post.id, post.likes)
    if (updatedPost) {
      setPost(updatedPost)
      showToast('추천이 반영되었습니다!', 'success')
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      showToast('로그인 후 댓글을 남길 수 있습니다.')
      setTimeout(() => navigate('/login'), 1500)
      return
    }
    if (!newComment.trim()) return

    const comment = await createComment({
      post_id: id,
      content: newComment,
      author: user.profile?.nickname || '회원님'
    })

    if (comment) {
      setComments([...comments, comment])
      setNewComment('')
      showToast('댓글이 등록되었습니다!', 'success')
    }
  }

  const handleDeletePost = async () => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return
    const success = await deletePost(id)
    if (success) {
      showToast('게시글이 삭제되었습니다.', 'success')
      setTimeout(() => navigate('/community'), 1500)
    } else {
      showToast('삭제에 실패했습니다.')
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    const success = await deleteComment(commentId)
    if (success) {
      setComments(comments.filter(c => c.id !== commentId))
      showToast('댓글을 삭제했습니다.', 'success')
    } else {
      showToast('삭제에 실패했습니다.')
    }
  }

  const handleUpdatePost = async () => {
    if (!editTitle.trim() || !editContent.trim()) return
    const updated = await updatePost(id, { title: editTitle, content: editContent })
    if (updated) {
      setPost(updated)
      setIsEditingPost(false)
      showToast('게시글이 수정되었습니다.', 'success')
    }
  }

  const handleUpdateComment = async (commentId) => {
    if (!editCommentContent.trim()) return
    const updated = await updateComment(commentId, editCommentContent)
    if (updated) {
      setComments(comments.map(c => c.id === commentId ? updated : c))
      setEditingCommentId(null)
      showToast('댓글이 수정되었습니다.', 'success')
    }
  }

  if (loading) return <div style={{ padding: 20 }}>게시글 로딩 중...</div>
  if (!post) return <div style={{ padding: 20 }}>게시글을 찾을 수 없습니다.</div>

  return (
    <div className="animate-fade" style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: 80, position: 'relative' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Detail Header */}
      <div style={{ 
        height: 60, background: 'white', display: 'flex', alignItems: 'center', 
        padding: '0 20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none' }}>
          <ChevronLeft size={24} />
        </button>
        <h3 style={{ marginLeft: 15, fontSize: '18px', fontWeight: 'bold' }}>상세보기</h3>
      </div>

      <div style={{ background: 'white', padding: '30px 24px', borderRadius: '0 0 32px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: 16 }}>
        {isEditingPost ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}
          >
            <input 
              style={{ padding: '16px', borderRadius: 16, border: '1px solid #E9ECEF', fontSize: '18px', fontWeight: '800', outline: 'none', background: '#F8F9FA' }}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="제목을 입력하세요"
            />
            <textarea 
              style={{ padding: '16px', borderRadius: 16, border: '1px solid #E9ECEF', fontSize: '15px', minHeight: 200, outline: 'none', resize: 'none', background: '#F8F9FA', lineHeight: '1.6' }}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="내용을 입력하세요"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={handleUpdatePost}
                style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '15px', borderRadius: 16, fontWeight: '800', fontSize: '15px' }}
              >수정 완료</button>
              <button 
                onClick={() => setIsEditingPost(false)}
                style={{ flex: 1, background: '#E9ECEF', color: '#495057', border: 'none', padding: '15px', borderRadius: 16, fontWeight: '800', fontSize: '15px' }}
              >취소</button>
            </div>
          </motion.div>
        ) : (
          <>
            <div style={{ marginBottom: 25 }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', background: 'rgba(117,186,87,0.1)', padding: '4px 12px', borderRadius: 10 }}>
                {post.category_type} 게시판
              </span>
              <h2 style={{ fontSize: '24px', marginTop: 15, lineHeight: '1.4', fontWeight: '800', color: '#2D3436', letterSpacing: '-0.5px' }}>{post.title}</h2>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, padding: '15px', background: '#FDFBFA', borderRadius: 20, border: '1px solid rgba(0,0,0,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: post.category_type === '선생님' ? '#E3F2FD' : 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '2px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  {post.category_type === '선생님' ? '🎓' : '👶'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontWeight: '800', fontSize: '15px', color: '#2D3436' }}>{post.author || '익명'}</p>
                    {post.profiles && post.profiles.is_verified && <BadgeCheck size={16} color="#4A6CF7" fill="#E3F2FD" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ADB5BD', fontSize: '12px', fontWeight: '600' }}>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={12} /> {post.views || 0}
                    </span>
                  </div>
                </div>
              </div>
              
              {(user?.profile?.user_type === '관리자' || user?.id === post.user_id) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => {
                      setEditTitle(post.title)
                      setEditContent(post.content)
                      setIsEditingPost(true)
                    }}
                    style={{ border: 'none', background: 'none', color: '#ADB5BD', padding: 8 }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={handleDeletePost}
                    style={{ border: 'none', background: 'none', color: '#FFDADA', padding: 8 }}
                  >
                    <Trash2 size={18} color="#FF4D4D" />
                  </button>
                </div>
              )}
            </div>

            <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#444', whiteSpace: 'pre-wrap', marginBottom: 30, fontWeight: '500', minHeight: 100 }}>
              {post.content}
            </div>
            
            {post.image_url && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginBottom: 30, borderRadius: 24, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
              >
                <img src={post.image_url} alt="첨부 이미지" style={{ width: '100%', display: 'block' }} loading="lazy" />
              </motion.div>
            )}
            
            <AdBanner adSlot="post-bottom-banner" />
          </>
        )}

        {(user?.profile?.user_type === '관리자' || user?.id === post.user_id) && !isEditingPost && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 15 }}>
            <button 
              onClick={() => {
                setEditTitle(post.title)
                setEditContent(post.content)
                setIsEditingPost(true)
              }}
              style={{ border: 'none', background: '#F0F3FF', color: '#4A6CF7', padding: '8px 16px', borderRadius: 10, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}
            >
              <Edit2 size={14} /> 수정
            </button>
            <button 
              onClick={handleDeletePost}
              style={{ border: 'none', background: '#FFF5F5', color: '#FF4D4D', padding: '8px 16px', borderRadius: 10, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}
            >
              <Trash2 size={14} /> 삭제
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 16, paddingTop: 20, borderTop: '1px solid #F8F9FA' }}>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, border: 'none', 
              background: 'rgba(117,186,87,0.1)', color: 'var(--primary)', padding: '12px 24px', borderRadius: 20,
              fontWeight: '800', fontSize: '14px', transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(117,186,87,0.1)'
            }}
          >
            <ThumbsUpIcon size={18} fill="var(--primary)" style={{ opacity: 0.8 }} />
            추천 {post.likes || 0}
          </motion.button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ADB5BD', padding: '10px 0', fontSize: '14px', fontWeight: '700' }}>
            <MessageCircle size={18} />
            댓글 {comments.length}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '30px 24px', borderRadius: 32, boxShadow: '0 -10px 30px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '18px', marginBottom: 24, fontWeight: '800', color: '#2D3436' }}>댓글 <span style={{ color: 'var(--primary)' }}>{comments.length}</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ADB5BD' }}>
              <MessageCircle size={40} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: '14px', fontWeight: '600' }}>첫 댓글의 주인공이 되어보세요! ✨</p>
            </div>
          ) : (
            comments.map((c, idx) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                style={{ borderBottom: '1px solid #F8F9FA', paddingBottom: 20 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: '#F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>👤</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontWeight: '800', fontSize: '14px', color: '#2D3436' }}>{c.author}</p>
                      {c.profiles && c.profiles.is_verified && <BadgeCheck size={14} color="#4A6CF7" fill="#E3F2FD" />}
                    </div>
                    <span style={{ fontSize: '12px', color: '#ADB5BD', fontWeight: '500' }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {(user?.profile?.user_type === '관리자' || user?.id === c.user_id) && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        onClick={() => {
                          setEditingCommentId(c.id)
                          setEditCommentContent(c.content)
                        }}
                        style={{ border: 'none', background: 'none', color: '#ADB5BD', padding: 4 }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteComment(c.id)}
                        style={{ border: 'none', background: 'none', color: '#FFDADA', padding: 4 }}
                      >
                        <Trash2 size={14} color="#FF4D4D" />
                      </button>
                    </div>
                  )}
                </div>
                {editingCommentId === c.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F8F9FA', padding: 15, borderRadius: 16 }}>
                    <textarea 
                      style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #E9ECEF', fontSize: '14px', outline: 'none', resize: 'none', background: 'white' }}
                      value={editCommentContent}
                      onChange={e => setEditCommentContent(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => handleUpdateComment(c.id)} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, fontSize: '13px', fontWeight: 'bold' }}>수정</button>
                      <button onClick={() => setEditingCommentId(null)} style={{ padding: '8px 16px', background: '#E9ECEF', color: '#495057', border: 'none', borderRadius: 10, fontSize: '13px', fontWeight: 'bold' }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#444', fontWeight: '500', paddingLeft: 36 }}>{c.content}</p>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Comment Input */}
      <div style={{ 
        position: 'fixed', bottom: 0, width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.95)', padding: '15px 20px 30px 20px', borderTop: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', gap: 12, alignItems: 'center', zIndex: 100,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 -10px 30px rgba(0,0,0,0.05)'
      }}>
        <input 
          placeholder={user ? "따뜻한 댓글을 남겨주세요" : "로그인 후 소통에 참여해보세요"}
          style={{ 
            flex: 1, padding: '16px 20px', background: '#F1F3F5', 
            border: 'none', borderRadius: 20, outline: 'none', fontSize: '15px',
            fontWeight: '600'
          }}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          disabled={!user}
        />
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={handleCommentSubmit}
          style={{ 
            border: 'none', background: 'var(--primary)', color: 'white', 
            width: 52, height: 52, borderRadius: 20, display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            opacity: newComment.trim() ? 1 : 0.5,
            boxShadow: '0 8px 20px rgba(117,186,87,0.3)'
          }}>
          <Send size={22} />
        </motion.button>
      </div>
    </div>
  )
}
