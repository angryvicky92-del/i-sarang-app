-- [커뮤니티 이미지 업로드 권한(RLS) 설정 스크립트 - 간소화 버전]
-- 'must be owner of table objects' 에러 발생 시 아래 내용을 대신 실행해 주세요.

-- 1. community 버킷 생성 (이미 존재하면 무시)
-- 이 부분에서 에러가 날 경우 Supabase 대시보드 Storage 메뉴에서 직접 'community' 버킷을 'Public'으로 생성해 주세요.
INSERT INTO storage.buckets (id, name, public)
VALUES ('community', 'community', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 기존 정책 삭제 (중복 방지)
-- 이 부분에서 에러가 날 경우 대시보드에서 직접 정책을 삭제하거나 무시해도 됩니다.
DROP POLICY IF EXISTS "Community public read" ON storage.objects;
DROP POLICY IF EXISTS "Community auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Community auth delete" ON storage.objects;

-- 3. 새로운 정책 생성

-- (1) 모든 사용자가 community 버킷의 파일을 조회할 수 있도록 허용 (SELECT)
CREATE POLICY "Community public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'community');

-- (2) 인증된 사용자가 자신의 폴더(auth.uid 경로)에 파일을 업로드할 수 있도록 허용 (INSERT)
CREATE POLICY "Community auth upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'community' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- (3) 인증된 사용자가 자신의 파일만 삭제할 수 있도록 허용 (DELETE)
CREATE POLICY "Community auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'community' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
