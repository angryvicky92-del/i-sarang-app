import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, resetPassword } from '../services/authService'
import { ChevronLeft, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../components/Logo'

// Custom Toast Component (Shared logic style)
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

export default function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      showToast('이메일과 비밀번호를 모두 입력해 주세요.')
      return
    }

    setLoading(true)
    // admin86 아이디인 경우 내부적으로 이메일 형식으로 변환 (Supabase Auth 대응)
    const loginEmail = formData.email === 'admin86' ? 'admin86@admin.com' : formData.email
    const { data, error } = await signIn({ ...formData, email: loginEmail })
    setLoading(false)

    if (error) {
      showToast('이메일 또는 비밀번호가 일치하지 않습니다.')
    } else {
      localStorage.setItem('isLoggedIn', 'true')
      showToast('로그인 성공! 환영합니다 😊', 'success')
      setTimeout(() => navigate('/profile'), 1500)
    }
  }

  const handleResetPassword = async () => {
    if (!formData.email) {
      showToast('가입하신 이메일 주소를 먼저 입력해 주세요.')
      return
    }
    const resetEmail = formData.email === 'admin86' ? 'admin86@admin.com' : formData.email
    const { error } = await resetPassword(resetEmail)
    if (error) {
      showToast('요청 중 오류가 발생했습니다.')
    } else {
      showToast('비밀번호 재설정 이메일이 발송되었습니다.', 'success')
    }
  }

  return (
    <div className="animate-fade" style={{ 
      background: 'linear-gradient(135deg, #FDFBFA 0%, #F5F7F4 100%)', 
      minHeight: '100vh', 
      padding: '20px', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ border: 'none', background: 'white', borderRadius: '50%', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: '60px' }}
      >
        <div style={{ marginBottom: 50, textAlign: 'center' }}>
          <Logo width={180} height={60} style={{ marginBottom: 15 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', letterSpacing: '-0.3px' }}>
            우리 아이와 선생님을 위한 따뜻한 연결, <br/> 
            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>얼집체크</span>에 오신 것을 환영합니다.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: 8, display: 'block' }}>로그인 계정</label>
              <div style={{ 
                display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E9ECEF', 
                borderRadius: 16, padding: '0 20px', transition: 'all 0.3s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
              }}>
                <Mail size={18} color="var(--primary)" style={{ opacity: 0.6 }} />
                <input 
                  type="text" placeholder="이메일 주소를 입력해주세요."
                  style={{ flex: 1, border: 'none', background: 'none', padding: '18px 12px', outline: 'none', fontSize: '15px' }}
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </motion.div>
            <motion.div whileFocus={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: 8, display: 'block' }}>비밀번호</label>
              <div style={{ 
                display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E9ECEF', 
                borderRadius: 16, padding: '0 20px', transition: 'all 0.3s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
              }}>
                <Lock size={18} color="var(--primary)" style={{ opacity: 0.6 }} />
                <input 
                  type="password" placeholder="비밀번호"
                  style={{ flex: 1, border: 'none', background: 'none', padding: '18px 12px', outline: 'none', fontSize: '15px' }}
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </motion.div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', padding: '18px', marginTop: 40, borderRadius: 20, 
              fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: 10, border: 'none'
            }}
            disabled={loading}
          >
            {loading ? '인증 중...' : (
              <>
                로그인하기 <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <button 
            onClick={handleResetPassword}
            style={{ background: 'none', border: 'none', color: '#adb5bd', fontSize: '13px', textDecoration: 'underline' }}
          >
            비밀번호를 재설정하시겠어요?
          </button>
          
          <div style={{ height: '1px', background: '#E9ECEF', width: '100px', margin: '10px auto' }} />

          <p style={{ fontSize: '14px', color: '#666' }}>
            계정이 없으신가요? <br/>
            <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>
              얼집체크가 처음이에요 ➔
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
