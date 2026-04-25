import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data || null)
  }

  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id).finally(() => setIsLoading(false))
      else setIsLoading(false)
    })

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    profile,
    isLoading,
    setProfile,
    // 편의용 — 이전 getCurrentUser() 호환
    getCurrentUser: () => user ? { ...user, profile } : null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
