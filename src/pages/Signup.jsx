import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../services/authService'
import { ChevronLeft, Mail, Lock, User, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Custom Toast Component
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

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: 유형선택, 2: 가입정보
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: '',
    userType: '학부모'
  })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const [validations, setValidations] = useState({
    email: false,
    passwordLength: false,
    passwordCase: false,
    passwordNumber: false,
    passwordSpecial: false,
    passwordMatch: false
  })

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // admin86은 이메일 형식이 아니어도 통과되도록 특수 허용
    const isSpecialAdmin = formData.email === 'admin86'
    
    const hasUpper = /[A-Z]/.test(formData.password)
    const hasLower = /[a-z]/.test(formData.password)
    const hasNumber = /[0-9]/.test(formData.password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
    const isLongEnough = formData.password.length >= 8

    setValidations({
      email: isSpecialAdmin || emailRegex.test(formData.email),
      passwordLength: isLongEnough,
      passwordCase: hasUpper && hasLower,
      passwordNumber: hasNumber,
      passwordSpecial: hasSpecial,
      passwordMatch: formData.password !== '' && formData.password === formData.passwordConfirm
    })
  }, [formData.email, formData.password, formData.passwordConfirm])

  const showToast = (message, type = 'error') => {
    setToast({ message, type })
  }

  const handleNext = (e) => {
    e.preventDefault()
    setStep(2)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!validations.email) {
      showToast('올바른 이메일 형식을 입력해 주세요.')
      return
    }
    if (!validations.passwordLength || !validations.passwordCase || !validations.passwordNumber || !validations.passwordSpecial) {
      showToast('비밀번호 보안 규칙을 확인해 주세요.')
      return
    }
    if (!validations.passwordMatch) {
      showToast('비밀번호가 서로 일치하지 않습니다.')
      return
    }
    if (!formData.nickname) {
      showToast('닉네임을 입력해 주세요.')
      return
    }

    setLoading(true)
    // admin86 아이디인 경우 내부적으로 이메일 형식으로 변환 및 관리자 유형 강제 지정
    const signupData = {
      ...formData,
      email: formData.email === 'admin86' ? 'admin86@admin.com' : formData.email,
      userType: formData.email === 'admin86' ? '관리자' : formData.userType
    }
    
    const { error: signupError } = await signUp(signupData)
    setLoading(false)

    if (error) {
      showToast(error.message || '가입 중 오류가 발생했습니다.')
    } else {
      showToast('회원가입 완료! 인증 이메일을 확인해 주세요.', 'success')
      setTimeout(() => navigate('/login'), 2000)
    }
  }

  const ValidationItem = ({ label, isValid }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', color: isValid ? '#4CAF50' : '#999' }}>
      {isValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {label}
    </div>
  )

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
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
        <button 
          onClick={() => step === 1 ? navigate(-1) : setStep(1)} 
          style={{ border: 'none', background: 'white', borderRadius: '50%', padding: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)', background: 'rgba(117,186,87,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
          STEP {step}/2
        </span>
      </div>

      <div style={{ marginBottom: 35 }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: 10, letterSpacing: '-0.5px', color: '#2D3436' }}>
          {step === 1 ? '어떻게 가입할까요? 🥰' : '가입 정보를 입력해 주세요'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.5' }}>
          {step === 1 ? '선택하신 유형에 맞는 맞춤 서비스를 제공합니다.' : '더 안전한 계정 관리를 위해 정보를 입력해 주세요.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.form 
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
          onSubmit={step === 1 ? handleNext : handleSignup}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { id: '학부모', label: '학부모 회원', desc: '아이를 보낼 어린이집을 찾고 실제 이용 후기를 확인해요', icon: '👪' },
                { id: '선생님', label: '선생님 회원', desc: '어린이집의 근무 환경과 문화를 솔직하게 평하고 공유해요', icon: '🎓' }
              ].map(type => (
                <motion.button 
                  key={type.id} type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData({...formData, userType: type.id})}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 20, padding: '24px', borderRadius: 24, border: '2px solid',
                    background: formData.userType === type.id ? 'var(--primary)' : 'white',
                    color: formData.userType === type.id ? 'white' : '#2D3436',
                    borderColor: formData.userType === type.id ? 'var(--primary)' : 'white',
                    textAlign: 'left', transition: 'all 0.2s',
                    boxShadow: formData.userType === type.id ? '0 12px 24px rgba(117,186,87,0.25)' : '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                >
                  <span style={{ fontSize: '36px' }}>{type.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 4 }}>{type.label}</div>
                    <div style={{ fontSize: '13px', opacity: 0.8, lineHeight: '1.4' }}>{type.desc}</div>
                  </div>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', border: '2px solid', 
                    borderColor: formData.userType === type.id ? 'white' : '#E9ECEF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: formData.userType === type.id ? 'white' : 'transparent'
                  }}>
                    {formData.userType === type.id && <CheckCircle2 size={16} color="var(--primary)" />}
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: 8, display: 'block' }}>이메일 주소</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E9ECEF', borderRadius: 16, padding: '0 20px' }}>
                    <Mail size={18} color={validations.email ? 'var(--primary)' : "#ABB5BE"} style={{ opacity: 0.7 }} />
                    <input 
                      type="text" placeholder="이메일 주소를 입력해주세요."
                      style={{ flex: 1, border: 'none', background: 'none', padding: '16px 12px', outline: 'none', fontSize: '15px' }}
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: 8, display: 'block' }}>비밀번호</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E9ECEF', borderRadius: 16, padding: '0 20px', marginBottom: 12 }}>
                    <Lock size={18} color={formData.password ? 'var(--primary)' : "#ABB5BE"} style={{ opacity: 0.7 }} />
                    <input 
                      type="password" placeholder="비밀번호 설정"
                      style={{ flex: 1, border: 'none', background: 'none', padding: '16px 12px', outline: 'none', fontSize: '15px' }}
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', padding: '0 8px' }}>
                    <ValidationItem label="8자 이상" isValid={validations.passwordLength} />
                    <ValidationItem label="영문 대/소문자" isValid={validations.passwordCase} />
                    <ValidationItem label="숫자 포함" isValid={validations.passwordNumber} />
                    <ValidationItem label="특수문자 포함" isValid={validations.passwordSpecial} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: 8, display: 'block' }}>닉네임</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #E9ECEF', borderRadius: 16, padding: '0 20px' }}>
                    <User size={18} color="var(--primary)" style={{ opacity: 0.7 }} />
                    <input 
                      type="text" placeholder="활동하실 닉네임"
                      style={{ flex: 1, border: 'none', background: 'none', padding: '16px 12px', outline: 'none', fontSize: '15px' }}
                      value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 40 }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '20px', borderRadius: 24, fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              disabled={loading}
            >
              {loading ? '인증 메일 발송 중...' : (
                <>
                  {step === 1 ? '다음으로 넘어가기' : '회원가입 완료하기'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: 25 }}>
              <p style={{ fontSize: '14px', color: '#999' }}>
                계정이 이미 있으신가요? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', marginLeft: 6 }}>로그인하기</Link>
              </p>
            </div>
          </div>
        </motion.form>
      </AnimatePresence>
    </div>
  )
}
