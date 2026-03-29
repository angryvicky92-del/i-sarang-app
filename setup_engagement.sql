-- [게시글, 후기, 댓글 추천/비추천 투표 시스템 스키마]

-- 1. 컬럼 추가 (이미 존재할 수 있으므로 체크 후 추가)
-- posts 테이블
ALTER TABLE posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- post_comments 테이블
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

-- reviews 테이블 (이미 likes가 있을 수 있으므로 upvotes로 쓰거나 likes를 유지)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;
-- 만약 likes 컬럼이 이미 있다면 그대로 사용하거나 호환성을 위해 유지

-- 2. 투표 추적 테이블 생성 (중복 투표 방지 및 상태 저장)
-- 게시글 투표
CREATE TABLE IF NOT EXISTS post_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)), -- 1: 추천, -1: 비추천
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, post_id)
);

-- 댓글 투표
CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id BIGINT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, comment_id)
);

-- 후기 투표 (기존 review_likes가 있다면 확장하거나 신규 생성)
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, review_id)
);

-- RLS 설정 (로그인한 사용자만 투표 가능)
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own post votes" ON post_votes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comment votes" ON comment_votes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own review votes" ON review_votes
  FOR ALL USING (auth.uid() = user_id);
