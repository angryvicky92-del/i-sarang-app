-- 1. Profiles Table RLS 보완
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재정의
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 관리자 전용 업데이트 정책 (승인용)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = '관리자'));

-- 2. Storage Certificates Bucket RLS 보완
-- 버킷이 공개 읽기 가능하도록 설정
UPDATE storage.buckets SET public = true WHERE id = 'certificates';

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow authenticated upload to certificates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from certificates" ON storage.objects;

-- 인증된 사용자의 업로드 허용
CREATE POLICY "Allow authenticated upload to certificates" ON storage.objects
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = 'certificates');

-- 모든 사용자의 조회 허용
CREATE POLICY "Allow public read from certificates" ON storage.objects
    FOR SELECT 
    TO public 
    USING (bucket_id = 'certificates');
