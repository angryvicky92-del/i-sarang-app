import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, signOut, requestVerification } from '../services/authService'
import { uploadFile } from '../services/storageService'
import { CheckCircle2, AlertCircle, Camera, BadgeCheck } from 'lucide-react'

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

export default function MyPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState(null)
  
  const handleLogout = async () => {
    await signOut()
    localStorage.removeItem('isLoggedIn')
    navigate('/login')
  }

  const fetchUser = async () => {
    const userData = await getCurrentUser()
    if (!userData) {
      navigate('/login')
    } else {
      setUser(userData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUser()
  }, [navigate])

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const { url, error } = await uploadFile('verifications', file, user.id)
    
    if (error) {
      setToast({ message: '이미지 업로드에 실패했습니다.', type: 'error' })
      setUploading(false)
      return
    }

    const { error: reqError } = await requestVerification(user.id, url)
    if (reqError) {
      setToast({ message: '인증 신청에 실패했습니다.', type: 'error' })
    } else {
      setToast({ message: '인증 신청이 접수되었습니다! 관리자 승인 후 배지가 부여됩니다.', type: 'success' })
      fetchUser() // 상태 갱신
    }
    setUploading(false)
  }

  if (loading) return <div style={{ padding: '100px 20px', textAlign: 'center', color: '#999' }}>프로필 정보를 불러오는 중...</div>
  if (!user) return null

  const isTeacher = user.profile?.user_type === '선생님'
  const verificationStatus = user.profile?.verification_status || 'none'

  return (
    <div className="animate-fade" style={{ padding: '20px 20px 100px 20px', background: '#F8F9FA', minHeight: '100vh' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ 
        padding: 24, background: 'white', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', 
        marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 
      }}>
        <div style={{ 
          width: 64, height: 64, borderRadius: 32, 
          background: isTeacher ? '#E3F2FD' : 'var(--primary-light)', border: '4px solid white', 
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
        }}>
          {isTeacher ? '🎓' : (user.profile?.child_gender === '남' ? '👦' : '👧')}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{user.profile?.nickname || '회원님'}</h3>
            {user.profile?.is_verified && <BadgeCheck size={18} color="#4A6CF7" fill="#E3F2FD" />}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 4 }}>
            {isTeacher ? '전문 보육교사 회원' : `${user.profile?.child_gender === '남' ? '왕자님' : '공주님'} 학부모`}
          </p>
        </div>
      </div>

      {/* Teacher Verification Section */}
      {isTeacher && !user.profile?.is_verified && (
        <div style={{ 
          padding: 20, background: 'white', borderRadius: 24, marginBottom: 20,
          border: '1px solid #E3F2FD', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.1 }}>
            <BadgeCheck size={80} color="#4A6CF7" />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: 8, color: '#1A1A1B' }}>선생님 자격 인증</h4>
          
          {verificationStatus === 'pending' ? (
            <div style={{ padding: '12px', background: '#FFF9DB', borderRadius: 12, color: '#F59F00', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
              인증 심사 중입니다. 잠시만 기다려주세요! ⏳
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#636E72', lineHeight: '1.5', marginBottom: 15 }}>
                자격증 사진을 업로드하시면 확인 후 <br/><strong>'인증 선생님' 배지</strong>를 부여해 드립니다.
              </p>
              <label style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px', background: '#4A6CF7', color: 'white', borderRadius: 12,
                cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'opacity 0.2'
              }}>
                <Camera size={18} />
                {uploading ? '업로드 중...' : '자격증 사진 올리기'}
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {verificationStatus === 'rejected' && (
                <p style={{ marginTop: 10, fontSize: '12px', color: '#FF4D4D', textAlign: 'center' }}>
                  ❌ 인증이 거절되었습니다. 다시 시도해 주세요.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 16, background: 'white', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>관심 어린이집</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>0</p>
        </div>
        <div style={{ padding: 16, background: 'white', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>내가 쓴 글</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>0</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 20 }}>
        {[
          { label: '알림 설정' },
          { label: '고객 센터' },
          ...(user?.profile?.user_type === '관리자' ? [{ label: '선생님 자격 승인', path: '/admin/verify' }] : [])
        ].map((item, i, arr) => (
          <div 
            key={item.label} 
            onClick={() => item.path && navigate(item.path)}
            style={{ 
              padding: 20, borderBottom: i === arr.length - 1 ? 'none' : '1px solid #f8f9fa',
              display: 'flex', justifyContent: 'space-between', fontSize: '15px',
              cursor: item.path ? 'pointer' : 'default'
            }}
          >
            {item.label}
            <span style={{ color: '#ccc' }}>&gt;</span>
          </div>
        ))}
      </div>

      <button onClick={handleLogout} style={{ 
        width: '100%', marginTop: 30, background: 'none', border: 'none', 
        color: '#ccc', fontSize: '13px', textDecoration: 'underline' 
      }}>
        로그아웃
      </button>
    </div>
  )
}
