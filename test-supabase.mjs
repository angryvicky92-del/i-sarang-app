import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  const { data, error } = await supabase
    .from('daycare_cache')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Error connecting to daycare_cache table:', error.message)
    console.log('\nIMPORTANT: Please ensure you have run the SQL script provided in implementation_plan.md in your Supabase SQL Editor.')
  } else {
    console.log('Success! Connected to daycare_cache table.')
    console.log('Sample data (arcode list):', data)
  }
}

testConnection()
