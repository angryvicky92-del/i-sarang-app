-- 1. RLS 활성화 확인
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (중복 생성 방지)
DROP POLICY IF EXISTS "Allow public read access" ON post_comments;
DROP POLICY IF EXISTS "Allow authenticated insert" ON post_comments;
DROP POLICY IF EXISTS "Allow individual update" ON post_comments;
DROP POLICY IF EXISTS "Allow individual delete" ON post_comments;
DROP POLICY IF EXISTS "Allow admin delete" ON post_comments;

-- 3. 정책 설정
-- 모든 사용자가 댓글을 조회할 수 있도록 허용
CREATE POLICY "Allow public read access" ON post_comments
  FOR SELECT USING (true);

-- 인증된 사용자가 댓글을 작성할 수 있도록 허용
CREATE POLICY "Allow authenticated insert" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 자신의 댓글만 수정할 수 있도록 허용
CREATE POLICY "Allow individual update" ON post_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- 자신의 댓글만 삭제할 수 있도록 허용
CREATE POLICY "Allow individual delete" ON post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 관리자는 모든 댓글을 삭제할 수 있도록 허용
-- 관리자 여부는 profiles 테이블의 user_type 컬럼을 통해 확인
CREATE POLICY "Allow admin delete" ON post_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = '관리자'
    )
  );

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
