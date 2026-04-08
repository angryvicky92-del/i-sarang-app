import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './app/.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const diseases = [
  '수족구병', '독감', '수두', '백일해', 
  '홍역', '유행성이하선염', '풍진', '성홍열', 
  '아데노바이러스', '마이코플라즈마', '노로바이러스', 
  '로타바이러스', '유행성결막염'
];

async function seed() {
  console.log('Seeding 13 diseases...');
  for (const name of diseases) {
    const { error } = await supabase
      .from('disease_advisories')
      .upsert({ disease_name: name, status: 'safe' }, { onConflict: 'disease_name' });
    
    if (error) {
      console.error(`Error seeding ${name}:`, error.message);
    } else {
      console.log(`Successfully seeded: ${name}`);
    }
  }
}

seed();
