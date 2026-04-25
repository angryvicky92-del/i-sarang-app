import toast from 'react-hot-toast';
import { supabase } from './supabaseClient';
import { SIGUNGU_LIST } from './sigungu';

const API_KEY = import.meta.env.VITE_CHILDCARE_API_KEY;
const API_URL_030 = '/api-childcare/mediate/rest/cpmsapi030/cpmsapi030/request';

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

export const getDaycares = async (arcode = '') => {
  if (!arcode) return [];
  try {
    const params = new URLSearchParams({ key: API_KEY, arcode });
    const res = await fetch(`${API_URL_030}?${params.toString()}`);
    const xml = await res.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const items = doc.getElementsByTagName("item");

    return Array.from(items).map(item => {
      // API tags can be uppercase or lowercase depending on exactly how XML parser handles them
      const g = (t) => {
        const node = item.getElementsByTagName(t)[0] || item.getElementsByTagName(t.toUpperCase())[0] || item.getElementsByTagName(t.toLowerCase())[0];
        return node ? node.textContent.trim() : '';
      };
      const n = (t) => parseInt(g(t)) || 0;
      const nf = (t) => parseFloat(g(t)) || 0;
      
      const typeText = g("crtypename");
      let type = TYPE_ETC;
      if (typeText.includes(TYPE_GOK)) type = TYPE_GOK;
      else if (typeText.includes(TYPE_GAJUNG)) type = TYPE_GAJUNG;
      else if (typeText.includes(TYPE_MIN)) type = TYPE_MIN;
      else if (typeText.includes(TYPE_JIK)) type = TYPE_JIK;
      
      const stcode = g("stcode");
      
      return {
        id: stcode || `id_${Math.random()}`,
        stcode: stcode,
        name: g("crname") || '\uC815\uBCF4 \uC5C6\uC74C',
        addr: g("craddr"),
        lat: parseFloat(g("la")) || 37.5,
        lng: parseFloat(g("lo")) || 127.0,
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
  } catch (e) { console.error('Fetch error 030', e);
    toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.'); return []; }
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

export const getDaycareStatus = getDaycaresDetailed;
export const getRegionalCodes = async (areaCode = '') => SIGUNGU_LIST[areaCode] || [];
