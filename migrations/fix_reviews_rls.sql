-- 1. Reviews 테이블 RLS 활성화 및 초기화
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.reviews;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.reviews;
DROP POLICY IF EXISTS "Allow individual update" ON public.reviews;
DROP POLICY IF EXISTS "Allow individual delete" ON public.reviews;

-- 2. 정책 설정
-- 모든 사용자(비로그인 포함)가 후기를 조회할 수 있도록 허용
CREATE POLICY "Allow public read access" ON public.reviews
  FOR SELECT USING (true);

-- 인증된 사용자가 후기를 작성할 수 있도록 허용
CREATE POLICY "Allow authenticated insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 자신의 후기만 수정할 수 있도록 허용
CREATE POLICY "Allow individual update" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- 자신의 후기만 삭제할 수 있도록 허용
CREATE POLICY "Allow individual delete" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_center_id ON public.reviews(center_id);
