import fs from 'fs';

const KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';
const sigunguList = {};

async function fetchAll() {
  let pageNo = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `http://apis.data.go.kr/1613000/RegionalCode/getRegionalCode?serviceKey=${KEY}&pageNo=${pageNo}`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const data = JSON.parse(text);
      const items = data.Response?.body?.items?.item;

      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }

      const itemList = Array.isArray(items) ? items : [items];
      const sggs = itemList.filter(i => i.rgn_se === '2' && i.use_yn === 'Y');

      for (const sgg of sggs) {
        const sidoCode = sgg.ctpv_cd;
        if (!sigunguList[sidoCode]) sigunguList[sidoCode] = [];
        
        // 중복 방지
        const exists = sigunguList[sidoCode].find(x => x.code === sgg.sgg_cd.toString());
        if (!exists) {
          sigunguList[sidoCode].push({
            name: sgg.sgg_nm,
            code: sgg.sgg_cd.toString()
          });
        }
      }

      if (itemList.length < 100) hasMore = false;
      pageNo++;
    } catch (e) {
      console.error(e);
      hasMore = false;
    }
  }

  // Sort them
  for (const key in sigunguList) {
    sigunguList[key].sort((a,b) => a.name.localeCompare(b.name));
  }

  fs.writeFileSync('all_sgg.json', JSON.stringify(sigunguList, null, 2));
  console.log('Saved to all_sgg.json', Object.keys(sigunguList).length, 'sidos');
}

fetchAll();
