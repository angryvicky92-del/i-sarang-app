import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testWithKey(name, key) {
  console.log(`\n--- Testing with ${name} ---`);
  const supabase = createClient(supabaseUrl, key);
  const email = '1116heok@gmail.com';
  
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: true }
    });

    if (error) {
      console.error(`${name} FAILED:`, error.message);
      console.error('Details:', JSON.stringify(error, null, 2));
    } else {
      console.log(`${name} SUCCESS!`, data);
    }
  } catch (err) {
    console.error(`${name} EXCEPTION:`, err.message);
  }
}

async function runAll() {
  await testWithKey('ANON_KEY', anonKey);
  await testWithKey('SERVICE_ROLE_KEY', serviceKey);
}

runAll();
