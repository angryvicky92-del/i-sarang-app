import { supabase } from './supabaseClient';
import { SIGUNGU_LIST } from './sigungu';
const { DOMParser } = require('xmldom');

const API_KEY = process.env.EXPO_PUBLIC_CHILDCARE_API_KEY;
const API_URL_030 = 'https://api.childcare.go.kr/mediate/rest/cpmsapi030/cpmsapi030/request';
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;

const kakaoGeoCache = new Map();

export const getKakaoRegionCode = async (lat, lng) => {
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  if (kakaoGeoCache.has(cacheKey)) {
    return kakaoGeoCache.get(cacheKey);
  }

  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    });
    const data = await res.json();
    if (data && data.documents && data.documents.length > 0) {
      const doc = data.documents.find(d => d.region_type === 'H') || data.documents[0];
      const result = { sido: doc.region_1depth_name, sigungu: doc.region_2depth_name };
      kakaoGeoCache.set(cacheKey, result);
      return result;
    }
  } catch (e) { console.warn('Kakao geocoding fail', e); }
  return null;
};

export const getKakaoAddressCenter = async (address) => {
  try {
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    });
    const data = await res.json();
    if (data && data.documents && data.documents.length > 0) {
      return { 
        lat: parseFloat(data.documents[0].y), 
        lng: parseFloat(data.documents[0].x) 
      };
    }
  } catch (e) { console.warn('Kakao address search fail', e); }
  return null;
};

export const TYPE_GOK = '\uAD6D\uACF5\uB9BD'; 
export const TYPE_GAJUNG = '\uAC00\uC815';    
export const TYPE_MIN = '\uBBFC\uAC04';       
export const TYPE_JIK = '\uC9C1\uC7A5';       
export const TYPE_ETC = '\uAE30\uD0C0';       

export const SIDO_LIST = [
  { name: '서울특별시', code: '11' }, { name: '부산광역시', code: '26' }, { name: '대구광역시', code: '27' },
  { name: '인천광역시', code: '28' }, { name: '광주광역시', code: '29' }, { name: '대전광역시', code: '30' },
  { name: '울산광역시', code: '31' }, { name: '세종특별자치시', code: '36' }, { name: '경기도', code: '41' },
  { name: '충청북도', code: '43' }, { name: '충청남도', code: '44' }, { name: '전북특별자치도', code: '45' },
  { name: '전라남도', code: '46' }, { name: '경상북도', code: '47' }, { name: '경상남도', code: '48' },
  { name: '제주특별자치도', code: '50' }, { name: '강원특별자치도', code: '51' }
];

export { SIGUNGU_LIST };

export const TYPE_COLORS = {
  [TYPE_GOK]: '#FACC15', [TYPE_GAJUNG]: '#F97316', [TYPE_MIN]: '#22C55E', [TYPE_JIK]: '#3B82F6', [TYPE_ETC]: '#94A3B8'
};

export const PLACE_TYPE_COLORS = {
  '키즈카페': '#F43F5E', // Rose/Pink
  '공원/자연': '#10B981', // Emerald/Green
  '문화/전시': '#8B5CF6', // Violet/Purple
  '놀이/레저': '#F59E0B', // Amber
  '관광/체험': '#3B82F6', // Blue
  '장소': '#6366F1'       // Indigo
};

const daycareCache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

export const getDaycares = async (arcode = '') => {
  if (!arcode) return [];
  
  // Check cache
  if (daycareCache.has(arcode)) {
    const cached = daycareCache.get(arcode);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  try {
    const params = new URLSearchParams({ key: API_KEY, arcode });
    const res = await fetch(`${API_URL_030}?${params.toString()}`);
    const xml = await res.text();
    
    // Use fast-xml-parser with manual parsing to preserve leading zeros in stcode
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({ 
        ignoreAttributes: true,
        parseTagValue: false // CRITICAL: Stop auto-conversion to numbers (prevents leading zero loss)
    });
    const jsonObj = parser.parse(xml);

    let itemsArray = [];
    if (jsonObj?.response?.item) {
        itemsArray = Array.isArray(jsonObj.response.item) ? jsonObj.response.item : [jsonObj.response.item];
    } else if (jsonObj?.response?.body?.item) {
        itemsArray = Array.isArray(jsonObj.response.body.item) ? jsonObj.response.body.item : [jsonObj.response.body.item];
    } else if (jsonObj?.response?.body?.items?.item) {
        itemsArray = Array.isArray(jsonObj.response.body.items.item) ? jsonObj.response.body.items.item : [jsonObj.response.body.items.item];
    }

    const data = itemsArray.map(item => {
      // Handle fast-xml-parser output (it converts uppercase/lowercase tags directly to keys)
      const g = (t) => {
        let val = item[t];
        if (val === undefined) val = item[t.toUpperCase()];
        if (val === undefined) val = item[t.toLowerCase()];
        return val ? String(val).trim() : '';
      };
      
      const n = (t) => parseInt(g(t)) || 0;
      const nf = (t) => parseFloat(g(t)) || 0;
      
      const typeText = g("crtypename");
      let type = TYPE_ETC;
      if (typeText.includes(TYPE_GOK)) type = TYPE_GOK;
      else if (typeText.includes(TYPE_GAJUNG)) type = TYPE_GAJUNG;
      else if (typeText.includes(TYPE_MIN)) type = TYPE_MIN;
      else if (typeText.includes(TYPE_JIK)) type = TYPE_JIK;
      
      const stcode = g("stcode") || `id_${Math.random()}`;
      
      // Deterministic micro-offset to prevent perfect overlapping of apartment daycares
      let latOffset = 0;
      let lngOffset = 0;
      if (typeof stcode === 'string' && stcode.length > 2) {
        const hashLat = (parseInt(stcode.slice(-2), 10) || 0) / 100;
        const hashLng = (parseInt(stcode.slice(-4, -2), 10) || 0) / 100;
        latOffset = (hashLat - 0.5) * 0.0002; // Roughly +- 11 meters
        lngOffset = (hashLng - 0.5) * 0.0002;
      }
      
      const baseLat = parseFloat(g("la")) || 37.5;
      const baseLng = parseFloat(g("lo")) || 127.0;

      return {
        id: stcode,
        stcode: stcode,
        name: g("crname") || '\uC815\uBCF4 \uC5C6\uC74C',
        addr: g("craddr"),
        lat: baseLat + latOffset,
        lng: baseLng + lngOffset,
        type, 
        color: TYPE_COLORS[type] || TYPE_COLORS[TYPE_ETC],
        tel: g("crtelno"),
        arcode: arcode,
        
        // Basic Stats
        capacity: n("crcapat") || n("crcapano") || 0,
        current: n("crchcnt") || 0,
        teacherCount: n("EM_CNT_TOT") || n("EM_CNT_A2") || 0,
        nurseryTeacherCount: n("EM_CNT_A2") || 1, // Fallback to 1 to avoid div by zero in chart
        directorName: g("CRREPNAME") || g("crrepname") || '대표자 정보 없음',
        office: g("sigunname") || (g("craddr").split(' ')[1] || '\uAD00\uD560\uAE30\uAD00'),
        cctv: n("cctvinstlcnt") || n("CCTVINSTLCNT"),
        playground: n("plgrdco") || n("PLGRDCO"),
        roomCount: n("nrtrroomcnt") || n("NRTRROOMCNT"),
        roomSize: n("nrtrroomsize") || n("NRTRROOMSIZE"),
        spec: g("crspec") || '일반',
        waitingCount: n("EW_CNT_TOT"),
        openingDate: g("crcnfmdt") || g("CRCNFMDT") || '미상',
        schoolbus: g("crcargbname") || g("CRCARGBNAME") || '미운영',
        status: g("crstatusname") || g("CRSTATUSNAME"),
        
        // Detailed Breakdowns directly from 030 XML
        classBreakdown: {
          age0: n("CLASS_CNT_00"), age1: n("CLASS_CNT_01"), age2: n("CLASS_CNT_02"),
          age3: n("CLASS_CNT_03"), age4: n("CLASS_CNT_04"), age5: n("CLASS_CNT_05"),
          infantMixed: n("CLASS_CNT_M2"), toddlerMixed: n("CLASS_CNT_M5"), childMixed: 0,
          special: n("CLASS_CNT_SP")
        },
        childBreakdown: {
          age0: n("CHILD_CNT_00"), age1: n("CHILD_CNT_01"), age2: n("CHILD_CNT_02"),
          age3: n("CHILD_CNT_03"), age4: n("CHILD_CNT_04"), age5: n("CHILD_CNT_05"),
          infantMixed: n("CHILD_CNT_M2"), toddlerMixed: n("CHILD_CNT_M5"), childMixed: 0,
          special: n("CHILD_CNT_SP")
        },
        capacityBreakdown: {}, // Keep empty since 030 doesn't provide capacity per class, UI will fall back correctly
        waitingBreakdown: {
          age0: { count: n("EW_CNT_00") }, age1: { count: n("EW_CNT_01") }, age2: { count: n("EW_CNT_02") },
          age3: { count: n("EW_CNT_03") }, age4: { count: n("EW_CNT_04") }, age5: { count: n("EW_CNT_05") },
          mixed: { count: n("EW_CNT_M6") }, special: { count: 0 },
          total: n("EW_CNT_TOT")
        },
        tenureBreakdown: {
          y0: nf("EM_CNT_0Y"), y1: nf("EM_CNT_1Y"), y2: nf("EM_CNT_2Y"),
          y4: nf("EM_CNT_4Y"), y6: nf("EM_CNT_6Y")
        },
        staffBreakdown: {
          director: n("EM_CNT_A1"), 
          teacher: n("EM_CNT_A2"), 
          special: n("EM_CNT_A3"),
          cook: n("EM_CNT_A6"), 
          nurse: n("EM_CNT_A4") + n("EM_CNT_A5"), 
          other: n("EM_CNT_A10") + n("EM_CNT_A7") + n("EM_CNT_A8")
        }
      };
    });

    const filteredData = data.filter(dc => !dc.status || !dc.status.includes('폐지'));

    // Store in cache
    daycareCache.set(arcode, { data: filteredData, timestamp: Date.now() });
    return filteredData;
  } catch (e) { console.error('Fetch error 030', e); return []; }
};

/**
 * Synchronously retrieves cached daycares if available and not expired.
 * Useful for instant UI transitions.
 */
export const getCachedDaycares = (arcode) => {
  if (!arcode || !daycareCache.has(arcode)) return null;
  const cached = daycareCache.get(arcode);
  if (Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache] Hit for arcode: ${arcode}`);
    return cached.data;
  }
  return null;
};

export const getMultiRegionDaycares = async (points, onProgress = null) => {
  const arcodes = new Set();
  
  // Get region codes for all sample points
  await Promise.all(points.map(async (p) => {
    const reg = await getKakaoRegionCode(p.lat, p.lng);
    if (reg) {
      const sidoObj = SIDO_LIST.find(s => s.name === reg.sido || reg.sido.includes(s.name));
      if (sidoObj) {
        const sigunguList = SIGUNGU_LIST[sidoObj.code] || [];
        const sigunguObj = sigunguList.find(s => s.name === reg.sigungu);
        if (sigunguObj) {
          arcodes.add(sigunguObj.code);
        }
      }
    }
  }));

  if (arcodes.size === 0) return [];

  // Deduplication helper
  const dedupe = (arr) => {
    const unique = [];
    const seen = new Set();
    arr.forEach(dc => {
      if (!seen.has(dc.stcode)) {
        seen.add(dc.stcode);
        unique.push(dc);
      }
    });
    return unique;
  };

  // FAST PATH: Check cache first
  let cachedData = [];
  let missingArcodes = [];

  Array.from(arcodes).forEach(code => {
    const cached = getCachedDaycares(code);
    if (cached) {
      cachedData.push(...cached);
    } else {
      missingArcodes.push(code);
    }
  });

  cachedData = dedupe(cachedData);

  // If we have any cached data, instantly render it!
  if (onProgress && cachedData.length > 0) {
    onProgress(cachedData);
  }

  // SLOW PATH: Fetch missing districts in parallel
  if (missingArcodes.length > 0) {
    const results = await Promise.all(missingArcodes.map(code => getDaycares(code)));
    return dedupe([...cachedData, ...results.flat()]);
  }

  return cachedData;
};

export const getDaycaresDetailed = async (stcode, arcode) => {
  // INFO-100 error explicitly halts parsing via 031. Since 030 now serves comprehensive detailed statistics,
  // we do not rely on 031 and just return null here. The main detail page will gracefully fall back to the enriched
  // daycare object properties derived directly from getDaycares().
  return null;
};

export const getDaycareById = async (id, arcode = '') => {
  const list = await getDaycares(arcode);
  return list.find(d => d.id === id) || null;
};

export const getDaycareByInfo = async (crname, districtName, fullAddress = '') => {
  try {
    const normalize = (n) => n ? n.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
    const searchName = normalize(crname);
    const nSearchAddr = normalize(fullAddress);

    // 1. Find the correct targetArcode with strict Sido validation
    let targetArcode = '';
    let foundMatches = []; // Store potentially matching sigungus

    for (const sido in SIGUNGU_LIST) {
      const found = SIGUNGU_LIST[sido].find(s => s.name === districtName);
      if (found) {
        foundMatches.push({ code: found.code, sidoCode: sido });
      }
    }

    if (foundMatches.length === 0) {
      // If districtName is empty (e.g. Sejong), handle special cases or just return null
      if (nSearchAddr.includes('세종')) targetArcode = '36110';
      else return null;
    } else if (foundMatches.length === 1) {
      targetArcode = foundMatches[0].code;
    } else {
      // MULTIPLE matches (e.g. "서구", "중구", "남구")
      if (nSearchAddr) {
        const bestSidoMatch = foundMatches.find(m => {
          const sidoObj = SIDO_LIST.find(s => s.code === m.sidoCode);
          return sidoObj && (nSearchAddr.includes(normalize(sidoObj.name)) || nSearchAddr.includes(sidoObj.name.substring(0, 2)));
        });
        if (bestSidoMatch) {
          targetArcode = bestSidoMatch.code;
        } else {
          // Address doesn't match any of the Sidos that have this districtName
          return null; 
        }
      } else {
        // No address to disambiguate? Default to first one (rare case for jobs)
        targetArcode = foundMatches[0].code;
      }
    }
    
    if (!targetArcode) return null;
    
    // 2. Fetch daycares in the confirmed correct district
    const list = await getDaycares(targetArcode);
    
    // 3. Match by name & address
    // Primary Match: Both name and address overlap
    const addressMatch = list.find(d => {
        const nItemName = normalize(d.name);
        if (!(nItemName.includes(searchName) || searchName.includes(nItemName))) return false;
        
        if (!nSearchAddr) return true; // Name match within correct district is enough if no searchAddr
        
        const nItemAddr = normalize(d.addr);
        // Precise address or significant overlap (dong name, road name)
        const addrCore = nSearchAddr.replace(/[0-9-]/g, '').slice(-6); // Last part is usually more specific
        return nItemAddr.includes(nSearchAddr) || nSearchAddr.includes(nItemAddr) || 
               nItemAddr.includes(addrCore) || addrCore.includes(nItemAddr.replace(/[0-9-]/g, '').slice(-4));
    });

    if (addressMatch) return addressMatch;

    // Strict Fallback: IF an address was provided, we MUST NOT match to a random same-name center 
    // that doesn't share any address similarity, even in the same district.
    if (nSearchAddr) {
        // Check for very strict name match BUT only if address isn't totally different
        const nameStrict = list.find(d => normalize(d.name) === searchName);
        if (nameStrict) {
            // Check if at least the Sido/Sigungu parts of the address match
            const nItemAddr = normalize(nameStrict.addr);
            if (nItemAddr.includes(districtName) || nSearchAddr.includes(nItemAddr.substring(0, 5))) {
                return nameStrict;
            }
        }
        return null; // Better to show nothing than wrong info
    }

    // No address provided? Just name match in the district.
    return list.find(d => normalize(d.name) === searchName) || null;
  } catch (e) {
    console.warn('getDaycareByInfo fail', e);
    return null;
  }
};

export const isJobMatchingDaycare = (job, daycare) => {
  if (!job || !daycare) return false;
  const normalize = (n) => n ? n.replace(/\s/g, '').replace(/\(.*\)/g, '') : '';
  const searchName = normalize(job.center_name);
  const dcName = normalize(daycare.name);
  
  // 1. Name match - 100% strict equality after removing spaces/brackets
  if (searchName !== dcName) return false;
  
  // 2. Location validation - Reasonable match (at least District level)
  const jobLoc = job.location || '';
  const jobAddr = job.metadata ? (job.metadata['소재지'] || job.metadata['근무지 주소'] || '') : '';
  const fullJobAddr = normalize(`${jobLoc} ${jobAddr}`);
  
  const dcAddr = daycare.addr || '';
  const nDcAddr = normalize(dcAddr);
  
  // Extract Sido & District from daycare address
  const addrParts = dcAddr.split(' ');
  const dcSido = dcAddr.substring(0, 2);
  let dcDistrict = '';
  if (addrParts.length >= 2) {
    dcDistrict = addrParts[1].replace('청', '').replace('시', '').replace('구', '').replace('군', '');
  }

  // If we have address info, they must share the same region (at least start with same Sido/District)
  if (dcSido && !fullJobAddr.includes(dcSido)) return false;
  if (dcDistrict && !fullJobAddr.includes(dcDistrict)) return false;

  // 3. One more check: If the job title or metadata has a very specific Dong, verify it
  const jobDong = jobAddr.match(/(\w+동|\w+읍|\w+면)/);
  if (jobDong) {
    // Some job portals use administrative dongs (가정1동, 서초2동), but daylight API uses legal dongs (가정동, 서초동).
    // Strip numeric characters right before '동' to ensure robust matching.
    const rawDong = jobDong[0];
    const matchKey = normalize(rawDong.replace(/[0-9]+(동)$/, '$1'));
    if (nDcAddr.length > 5 && !nDcAddr.includes(matchKey)) return false;
  }
  
  return true;
};

export const getDaycareStatus = getDaycaresDetailed;
export const getRegionalCodes = async (areaCode = '') => SIGUNGU_LIST[areaCode] || [];
