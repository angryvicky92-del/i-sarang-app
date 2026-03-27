import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingVerifications, processVerification, getCurrentUser } from '../services/authService'
import { ChevronLeft, Check, X, ExternalLink, ShieldCheck } from 'lucide-react'

export default function AdminApproval() {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const init = async () => {
      const userData = await getCurrentUser()
      if (userData?.profile?.user_type !== '관리자') {
        alert('관리자만 접근 가능합니다.')
        navigate('/')
        return
      }
      setUser(userData)
      fetchList()
    }
    init()
  }, [])

  const fetchList = async () => {
    setLoading(true)
    const { data, error } = await getPendingVerifications()
    if (!error) setPendingList(data || [])
    setLoading(false)
  }

  const handleProcess = async (userId, status) => {
    const confirmMsg = status === 'approved' ? '승인하시겠습니까?' : '거절하시겠습니까?'
    if (!window.confirm(confirmMsg)) return

    const { error } = await processVerification(userId, status)
    if (!error) {
      alert(status === 'approved' ? '승인되었습니다.' : '거절되었습니다.')
      fetchList()
    } else {
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>목록 로딩 중...</div>

  return (
    <div className="animate-fade" style={{ background: '#F8F9FA', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ 
        height: 60, background: 'white', display: 'flex', alignItems: 'center', 
        padding: '0 20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 10
      }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none' }}>
          <ChevronLeft size={24} />
        </button>
        <h3 style={{ marginLeft: 15, fontSize: '18px', fontWeight: 'bold' }}>선생님 자격 승인 관리</h3>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: 'var(--primary)' }}>
          <ShieldCheck size={20} />
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>대기 중인 신청: {pendingList.length}건</span>
        </div>

        {pendingList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 24, color: '#999' }}>
            대기 중인 인증 신청이 없습니다. ✨
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingList.map(item => (
              <div key={item.id} style={{ background: 'white', borderRadius: 24, padding: 20, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: 4 }}>{item.nickname}</h4>
                    <p style={{ fontSize: '12px', color: '#999' }}>신청일: {new Date(item.updated_at).toLocaleString()}</p>
                  </div>
                  <a 
                    href={item.verification_image} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      fontSize: '12px', color: 'var(--primary)', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', gap: 4, background: '#E3F2FD', 
                      padding: '6px 12px', borderRadius: 8, fontWeight: 'bold'
                    }}
                  >
                    서류 보기 <ExternalLink size={12} />
                  </a>
                </div>

                <div style={{ 
                  width: '100%', height: 200, background: '#f8f9fa', borderRadius: 12, 
                  overflow: 'hidden', marginBottom: 20, border: '1px solid #eee' 
                }}>
                  <img src={item.verification_image} alt="자격증" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    onClick={() => handleProcess(item.id, 'approved')}
                    style={{ 
                      flex: 1, background: 'var(--primary)', color: 'white', border: 'none', 
                      padding: '14px', borderRadius: 12, fontWeight: 'bold', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <Check size={18} /> 승인하기
                  </button>
                  <button 
                    onClick={() => handleProcess(item.id, 'rejected')}
                    style={{ 
                      flex: 1, background: '#FFF5F5', color: '#FF4D4D', border: 'none', 
                      padding: '14px', borderRadius: 12, fontWeight: 'bold', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    <X size={18} /> 거절하기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
