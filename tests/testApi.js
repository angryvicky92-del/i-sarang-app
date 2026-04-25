const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://apis.data.go.kr/B551011/KorService1/locationBasedList1', {
      params: {
        serviceKey: decodeURIComponent('17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51'),
        numOfRows: 10, pageNo: 1, MobileOS: 'ETC', MobileApp: 'AppTest', _type: 'json', listYN: 'Y', arrange: 'E', mapX: 126.981611, mapY: 37.568477, radius: 5000
      }
    });
    console.log(JSON.stringify(res.data).substring(0, 500));
  } catch (e) {
    console.log("Error:", e.response ? e.response.data : e.message);
  }
}
test();
