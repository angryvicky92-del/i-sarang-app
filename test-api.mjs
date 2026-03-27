import fs from 'fs';

const KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';
const sigunguList = {};

async function fetchSeoul() {
  for (let pageNo = 1; pageNo <= 10; pageNo++) {
    const url = `http://apis.data.go.kr/1613000/RegionalCode/getRegionalCode?serviceKey=${KEY}&pageNo=${pageNo}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const data = JSON.parse(text);
      const items = data.Response?.body?.items?.item || [];

      const itemList = Array.isArray(items) ? items : [items];
      const sggs = itemList.filter(i => i.rgn_se === '2' && i.use_yn === 'Y');

      for (const sgg of sggs) {
        const sidoCode = sgg.ctpv_cd;
        if (!sigunguList[sidoCode]) sigunguList[sidoCode] = [];
        
        const exists = sigunguList[sidoCode].find(x => x.code === sgg.sgg_cd.toString());
        if (!exists) {
          sigunguList[sidoCode].push({
            name: sgg.sgg_nm,
            code: sgg.sgg_cd.toString()
          });
        }
      }
    } catch (e) {
      console.error("Error on page", pageNo, e.message);
    }
  }

  console.log("Seoul count:", sigunguList['11']?.length);
  console.log(JSON.stringify(sigunguList['11']));
  console.log("Busan count:", sigunguList['26']?.length);
  console.log("Incheon count:", sigunguList['28']?.length);
}

fetchSeoul();
