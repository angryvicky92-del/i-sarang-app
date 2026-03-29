-- 1. RLS 활성화 확인
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (중복 생성 방지)
DROP POLICY IF EXISTS "Allow public read access" ON posts;
DROP POLICY IF EXISTS "Allow authenticated insert" ON posts;
DROP POLICY IF EXISTS "Allow individual update" ON posts;
DROP POLICY IF EXISTS "Allow individual delete" ON posts;

-- 3. 정책 설정
-- 모든 사용자(비로그인 포함)가 게시글을 조회할 수 있도록 허용
CREATE POLICY "Allow public read access" ON posts
  FOR SELECT USING (true);

-- 인증된 사용자가 게시글을 작성할 수 있도록 허용 (user_id가 본인 UID와 일치해야 함)
CREATE POLICY "Allow authenticated insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 자신의 게시글만 수정할 수 있도록 허용
CREATE POLICY "Allow individual update" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- 자신의 게시글만 삭제할 수 있도록 허용
CREATE POLICY "Allow individual delete" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
