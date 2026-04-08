import axios from 'axios';

const TOURISM_API_KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

async function debug() {
  const contentId = '126508'; // Gyeongbokgung
  const contentTypeId = '12';
  try {
    console.log('Fetching detailCommon2 for Gyeongbokgung (126508)...');
    const commonRes = await axios.get(`${BASE_URL}/detailCommon2`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'App',
        _type: 'json',
        contentId: contentId,
        defaultYN: 'Y',
        overviewYN: 'Y'
      }
    });
    console.log('Common Detail:', JSON.stringify(commonRes.data?.response?.body?.items?.item, null, 2));

    console.log('\nFetching detailIntro2...');
    const introRes = await axios.get(`${BASE_URL}/detailIntro2`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'App',
        _type: 'json',
        contentId: contentId,
        contentTypeId: contentTypeId
      }
    });
    console.log('Intro Detail:', JSON.stringify(introRes.data?.response?.body?.items?.item, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) console.log(JSON.stringify(e.response.data, null, 2));
  }
}

debug();
