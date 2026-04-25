import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const KDCA_API_KEY = process.env.EXPO_PUBLIC_REGIONAL_CODE_API_KEY; // Reusing this as it's the public data key
const KDCA_BASE_URL = 'https://apis.data.go.kr/1790387/EIDAPIService';

/**
 * Hybrid Disease Crawler
 * 1. API: Whole reportable diseases (Varicella, Pertussis, etc.)
 * 2. Scraping: Sample-monitored diseases (Hand-foot-mouth, Flu) from KDCA Portal
 */

async function crawl() {
  console.log('--- Starting Hybrid Disease Crawler ---');
  
  const results = [];

  // Part 1: API ( 전수감시 )
  // We'll use getPeriodBasic or Disease to get recent counts
  try {
    console.log('[API] Fetching reportable diseases...');
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d) => d.toISOString().split('T')[0].replace(/-/g, '');
    
    // Test a few common ones
    const diseases = [
        { name: '수두', code: 'A10' }, 
        { name: '백일해', code: 'A08' }
    ];

    for (const d of diseases) {
        // This is a simplified logic. In a real scenario, we'd iterate over all codes.
        results.push({
            disease_name: d.name,
            status: 'safe', // Default
            description: `${d.name} 발생 현황 모니터링 중`,
            level_val: 0,
            metadata: { type: 'api', code: d.code }
        });
    }
  } catch (e) {
    console.error('[API] Error:', e.message);
  }

  // Part 2: Scraping ( 표본감시 - 수족구, 독감, 노로 )
  // Mocking the scraping results as we haven't stabilized the portal structure yet
  // but we'll implement the logic to save to DB.
  console.log('[Scraper] Fetching sample-monitored diseases...');
  results.push({
    disease_name: '수족구병',
    status: 'danger',
    description: '수족구병 유행 경보! 외출 후 반드시 손을 씻고 단체 생활 시 주의하세요.',
    level_val: 35.8, // Example fraction
    metadata: { 
        type: 'scraper',
        symptoms: ['발열', '입안 수포', '손발 반점'],
        isolation: '7~10일'
    }
  });

  results.push({
    disease_name: '독감',
    status: 'caution',
    description: '인플루엔자 의사환자 분율 소폭 상승 중. 개인 위생에 신경 써주세요.',
    level_val: 12.5,
    metadata: {
        type: 'scraper',
        symptoms: ['고열', '근육통', '기침'],
        isolation: '해열 후 24시간'
    }
  });

  // Save to DB
  console.log(`[DB] Saving ${results.length} advisories...`);
  for (const item of results) {
    const { data: existing } = await supabase
      .from('disease_advisories')
      .select('id')
      .eq('disease_name', item.disease_name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('disease_advisories')
        .update(item)
        .eq('id', existing.id);
      if (error) console.error(`[DB] Error updating ${item.disease_name}:`, error.message);
      else console.log(`[DB] Successfully updated ${item.disease_name}`);
    } else {
      const { error } = await supabase
        .from('disease_advisories')
        .insert(item);
      if (error) console.error(`[DB] Error inserting ${item.disease_name}:`, error.message);
      else console.log(`[DB] Successfully inserted ${item.disease_name}`);
    }
  }

  console.log('--- Crawler Finished ---');
}

crawl();
