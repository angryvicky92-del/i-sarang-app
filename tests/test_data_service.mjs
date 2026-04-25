import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/heogang/아이사랑/.env' });
import { getDaycares } from './app/src/services/dataService.js';

async function test() {
  const data = await getDaycares('28260');
  const yemi = data.find(d => d.name.includes('예미지'));
  console.log('Result:', yemi);
}
test();
