import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const SERVICE_KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';
const ENDPOINT = 'https://apis.data.go.kr/1790387/EIDAPIService/getPeriodBasic'; 

async function testApi() {
  try {
    console.log('Testing Infectious Disease API...');
    
    // Usually these APIs use GET with params
    const response = await axios.get(ENDPOINT, {
      params: {
        serviceKey: SERVICE_KEY,
        pageNo: 1,
        numOfRows: 10,
        // startCreateDt: '20240101',
        // endCreateDt: '20240331'
      },
      timeout: 10000
    });

    console.log('Status:', response.status);
    console.log('Data Preview:', response.data.substring(0, 500));
    
    const parser = new XMLParser();
    const result = parser.parse(response.data);
    console.log('Parsed JSON:', JSON.stringify(result, null, 2).substring(0, 500));

  } catch (e) {
    console.error('API Error:', e.message);
    if (e.response) {
      console.error('Response:', e.response.data);
    }
  }
}

testApi();
