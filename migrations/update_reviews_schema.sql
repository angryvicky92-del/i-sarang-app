-- 후기(리뷰) 테이블에 추천/비추천 기능 지원을 위한 컬럼 및 테이블 추가

-- 1. reviews 테이블에 추천(likes), 비추천(dislikes) 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS dislikes INTEGER DEFAULT 0;

-- 2. 중복 투표 방지를 위한 투표 추적 테이블 생성 (review_likes 이름 사용)
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)), -- 1: 추천(좋아요), -1: 비추천(싫어요)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, review_id)
);

-- 3. RLS(Row Level Security) 설정
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- 자신의 투표만 조회/수정/삭제 가능하도록 정책 설정
CREATE POLICY "Users can manage their own review likes" 
ON review_likes FOR ALL 
USING (auth.uid() = user_id);
