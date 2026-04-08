import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

const testEmail = 'test_debug_1234@gmail.com';

async function diagnoseAuth() {
  console.log('=============================================');
  console.log('🔍 Supabase Auth Deep Diagnostic Tool');
  console.log('=============================================\n');

  console.log('1️⃣ 테스트: 일반 회원가입 (signUp) 시도...');
  const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
    email: testEmail,
    password: 'password123!'
  });
  if (signUpError) {
    console.log('❌ 실패:', signUpError.message);
  } else {
    console.log('✅ 성공 (회원가입 요청은 접수됨)');
  }

  console.log('\n2️⃣ 테스트: 이메일 OTP(Magic Link 발송) 시도 (앱과 동일 로직)...');
  const { data: otpData, error: otpError } = await supabaseAnon.auth.signInWithOtp({
    email: testEmail,
    options: {
      shouldCreateUser: true
    }
  });
  if (otpError) {
    console.log('❌ 실패 (SMTP 발송 에러):', otpError.message);
  } else {
    console.log('✅ 성공 (OTP 이메일 발송됨)');
  }

  console.log('\n2️⃣ 테스트: Admin API로 Magic Link 강제 생성 시도...');
  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: testEmail
    });
    if (linkError) {
      console.log('❌ 실패 (이메일 템플릿/SMTP 구성 오류):', linkError.message);
    } else {
      console.log('✅ 성공 (링크 생성 기능은 정상 작동함)');
      console.log('생성된 링크:', linkData?.properties?.action_link);
    }
  } catch (err) {
    console.log('❌ 예상치 못한 서비스 에러:', err.message);
  }

  console.log('\n3️⃣ 테스트: Admin API로 이메일 발송 없이 강제 유저 생성 시도...');
  const { data: adminCreateData, error: adminCreateError } = await supabaseAdmin.auth.admin.createUser({
    email: 'test_admin_created@gmail.com',
    password: 'password123!',
    email_confirm: true // 이메일 인증 강제 통과
  });
  if (adminCreateError) {
    console.log('❌ 실패:', adminCreateError.message);
  } else {
    console.log('✅ 성공 (DB에 유저 생성은 정상 작동함)');
    // 정리 (유저 삭제)
    if (adminCreateData?.user?.id) {
       await supabaseAdmin.auth.admin.deleteUser(adminCreateData.user.id);
    }
  }

  // 앞서 만든 첫번째 테스트 유저도 삭제
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = users?.users?.find(u => u.email === testEmail);
  if (targetUser) {
     await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
  }

  console.log('\n=============================================');
  console.log('🏁 진단 종료');
  console.log('=============================================');
}

diagnoseAuth();
