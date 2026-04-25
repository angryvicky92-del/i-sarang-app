const https = require('https');
https.get('https://apis.data.go.kr/B551011/KorService1/locationBasedList1?serviceKey=17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&listYN=Y&arrange=A&mapX=126.98&mapY=37.56&radius=1000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data.substring(0, 500)));
}).on('error', console.error);
