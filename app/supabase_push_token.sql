-- profiles 테이블에 필수 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS interested_regions TEXT[] DEFAULT '{}';

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON public.profiles(push_token);

-- RLS 정책 확인 (기존에 profiles 테이블에 update 권한이 있는지 확인 필요)
-- 보통 auth.uid() = id 인 경우 본인 프로필 수정 가능
