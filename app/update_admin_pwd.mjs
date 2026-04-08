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

async function updatePassword() {
  const searchTerm = 'admin86';
  
  console.log(`Searching for user: ${searchTerm}...`);
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError.message);
    return;
  }

  const users = data.users;
  const user = users.find(u => u.email?.includes(searchTerm) || u.id === searchTerm);
  
  if (!user) {
    console.error(`User ${searchTerm} not found in listing.`);
    // Try search by email explicitly if list fails to find
    console.log('Trying fallback search...');
    return;
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: 'a123456' }
  );

  if (updateError) {
    console.error('Error updating password:', updateError.message);
  } else {
    console.log(`Successfully updated password for ${user.email} to "a123456"`);
  }
}

updatePassword();
