import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser(email, password, type, nickname) {
  console.log(`Creating ${type} user: ${email}...`);
  
  // 1. Create User in Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already registered')) {
      console.log(`${email} already exists.`);
      // Try to update profile anyway if user exists
      const { data: existingUser } = await supabase.from('profiles').select('id').eq('nickname', nickname).single();
      if (!existingUser) {
          // If no profile, we can't easily get the ID from admin list without extra steps, 
          // let's just assume we need to handle it or skip.
      }
    } else {
      console.error(`Error creating ${email}:`, error.message);
      return;
    }
  }

  const userId = data?.user?.id;
  if (!userId) return;

  // 2. Create Profile
  const { error: profileError } = await supabase.from('profiles').upsert([
    {
      id: userId,
      nickname,
      user_type: type,
      is_verified: true
    }
  ]);

  if (profileError) {
    console.error(`Error creating profile for ${email}:`, profileError.message);
  } else {
    console.log(`Success: ${email} (${type}) created.`);
  }
}

async function run() {
  await createTestUser('1@a.com', 'a123456', '선생님', '테스트선생님');
  await createTestUser('2@b.com', 'a123456', '학부모', '테스트학부모');
  process.exit(0);
}

run();
