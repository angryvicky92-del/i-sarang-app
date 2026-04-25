-- 2@b.com 계정을 학부모 회원으로 강제 업데이트
UPDATE public.profiles 
SET user_type = '학부모' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = '2@b.com'
);

-- 해당 계정이 선생님 인증 대기 중이었다면 해제 (학부모는 인증 불필요)
UPDATE public.profiles
SET is_verified = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = '2@b.com'
);
