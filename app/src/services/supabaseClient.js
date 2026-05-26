import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ [Supabase] 환경 변수가 누락되었습니다! 빌드 세팅(EAS Secrets)을 확인하세요. ' +
    '앱 강제 종료를 막기 위해 플레이스홀더 계정으로 임시 기동합니다.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
