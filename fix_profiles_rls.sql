-- profiles 테이블에 대한 행 수준 보안(RLS) 정책 강화 스크립트

-- 1. RLS 활성화 확인
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (중복 생성 방지)
DROP POLICY IF EXISTS "Allow individual insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read" ON public.profiles;

-- 3. 가입 시 본인의 프로필을 생성할 수 있도록 허용 (INSERT)
CREATE POLICY "Allow individual insert" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. 본인의 프로필 정보를 수정할 수 있도록 허용 (UPDATE)
CREATE POLICY "Allow individual update" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 5. 다른 사용자들이 프로필 정보를 조회할 수 있도록 허용 (SELECT)
CREATE POLICY "Allow public read" 
ON public.profiles FOR SELECT 
USING (true);
