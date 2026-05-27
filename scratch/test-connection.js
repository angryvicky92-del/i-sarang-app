import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fyoballvcwavhrwkprnx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5b2JhbGx2Y3dhdmhyd2twcm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTAxOTcsImV4cCI6MjA4OTA2NjE5N30.o3676dn-BzOxbGbZXAYCaTe4xgVBoyilVUZymDXXb6c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing raw connection to Supabase...');
  try {
    const excludeFilter = ['00000000-0000-0000-0000-000000000000'];
    const { data, error } = await supabase
      .from('posts')
      .select('*, post_comments(count)')
      .not('id', 'in', `(${excludeFilter.join(',')})`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Connection failed with Supabase error:', error.message, error.details);
    } else {
      console.log('✅ Success! Connected to posts. Data count:', data.length);
    }
  } catch (e) {
    console.error('❌ Fatal exception during connection:', e);
  }
}

testConnection();
