import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  // 1. Get current users to check existence
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  // Helper for admin update
  const updateAdmin = async () => {
    const admin = users.find(u => u.email?.includes('admin86'));
    if (admin) {
        console.log(`Updating admin86 (${admin.email}) password...`);
        const { error } = await supabase.auth.admin.updateUserById(admin.id, { password: 'a123456' });
        console.log(error ? `Admin update fail: ${error.message}` : 'Admin password updated to a123456');
    }
  };

  // Helper for creating/updating test user
  const setupUser = async (email, nickname, type, verified = true) => {
    console.log(`--- Setting up ${type} account: ${email} ---`);
    const existing = users.find(u => u.email === email);
    let userId = '';

    if (existing) {
        console.log(`User ${email} already exists. Updating password...`);
        const { data, error } = await supabase.auth.admin.updateUserById(existing.id, { password: 'a123456' });
        if (error) {
            console.error(`Auth update error for ${email}:`, error.message);
            return;
        }
        userId = existing.id;
    } else {
        console.log(`Creating new user ${email}...`);
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: 'a123456',
            email_confirm: true
        });
        if (error) {
            console.error(`Auth create error for ${email}:`, error.message);
            return;
        }
        userId = data.user.id;
    }

    // Update profile (upsert to be sure)
    const { error: pErr } = await supabase.from('profiles').upsert({
        id: userId,
        nickname: nickname,
        user_type: type,
        is_verified: verified,
        verification_status: type === '선생님' ? 'approved' : 'none',
        updated_at: new Date().toISOString()
    });

    console.log(pErr ? `Profile error for ${email}: ${pErr.message}` : `Success: ${email} is ready.`);
  };

  await updateAdmin();
  await setupUser('teacher@test.com', '테스트선생님', '선생님');
  await setupUser('parent@test.com', '테스트학부모', '학부모');
  
  console.log('Setup finished.');
}

setup();
