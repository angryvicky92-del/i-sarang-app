import toast from 'react-hot-toast';
import { supabase } from './supabaseClient'

export const signUp = async ({ email, password, nickname, userType }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error('Error signing up:', error)
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    return { error }
  }

  if (data?.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nickname,
        user_type: userType,
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return { error: profileError }
    }
  }

  return { data }
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) console.error('Error signing in:', error)
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('Error signing out:', error)
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { ...user, profile }
}

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { error }
}

// 선생님 자격 인증 신청
export const requestVerification = async (userId, imageUrl) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      verification_image: imageUrl,
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()

  return { data, error }
}

// 승인 대기 중인 목록 조회 (관리자용)
export const getPendingVerifications = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('verification_status', 'pending')
    .eq('user_type', '선생님')

  return { data, error }
}

// 자격 인증 승인/거절 처리 (관리자용)
export const processVerification = async (userId, status) => {
  // status: 'approved' or 'rejected'
  const isVerified = status === 'approved'
  const { data, error } = await supabase
    .from('profiles')
    .update({
      verification_status: status,
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()

  return { data, error }
}
