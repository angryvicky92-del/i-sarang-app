-- 특정 계정 삭제 스크립트
-- 이 쿼리를 Supabase Dashboard -> SQL Editor에서 실행해주세요.

-- 1. 프로필 삭제
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('hk1116hk@naver.com', '1116heok@gmail.com', 'angryvicky92@gmail.com')
);

-- 2. 인증 계정 삭제
DELETE FROM auth.users 
WHERE email IN ('hk1116hk@naver.com', '1116heok@gmail.com', 'angryvicky92@gmail.com');
