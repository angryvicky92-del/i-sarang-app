-- 1. Reviews 테이블 관리자 권한 추가
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow individual update" ON public.reviews;
DROP POLICY IF EXISTS "Allow individual delete" ON public.reviews;

-- 업데이트 정책: 하쿠모/선생님 본인 또는 관리자
CREATE POLICY "Allow individual or admin update" ON public.reviews
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = '관리자')
  );

-- 삭제 정책: 하쿠모/선생님 본인 또는 관리자
CREATE POLICY "Allow individual or admin delete" ON public.reviews
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = '관리자')
  );


-- 2. Posts 테이블 관리자 권한 추가
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Allow individual update" ON public.posts;
DROP POLICY IF EXISTS "Allow individual delete" ON public.posts;

-- 업데이트 정책: 작성자 본인 또는 관리자
CREATE POLICY "Allow individual or admin update" ON public.posts
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = '관리자')
  );

-- 삭제 정책: 작성자 본인 또는 관리자
CREATE POLICY "Allow individual or admin delete" ON public.posts
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = '관리자')
  );
