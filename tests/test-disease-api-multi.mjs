import axios from 'axios';

const SERVICE_KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';
const BASE_URL = 'https://apis.data.go.kr/1790387/EIDAPIService';

const OPERATIONS = [
  'Gender', 'getGender', 
  'Region', 'getRegion',
  'PeriodBasic', 'getPeriodBasic',
  'Age', 'getAge',
  'Disease', 'getDisease',
  'getPeriodRegion', 'PeriodRegion'
];

async function runTests() {
  for (const op of OPERATIONS) {
    const url = `${BASE_URL}/${op}`;
    console.log(`Testing: ${url}...`);
    try {
      const resp = await axios.get(url, {
        params: { 
          serviceKey: SERVICE_KEY, 
          pageNo: 1, 
          numOfRows: 10, 
          resultType: 'json',
          startCreateDt: '20240320',
          endCreateDt: '20240327'
        },
        timeout: 10000
      });
      console.log(`[SUCCESS] ${op}: ${resp.status}`);
      console.log(`Data: ${JSON.stringify(resp.data).substring(0, 100)}`);
      break; 
    } catch (e) {
      console.log(`[FAIL] ${op}: ${e.message}`);
    }
  }
}

runTests();
