import axios from 'axios';

const TOURISM_API_KEY = '17786a2939036ec9606cb611a87546032109aa3dba9ca7eaefb87793c22b1f51';
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

/**
 * Fetch recommended places based on location.
 * @param {number} lat Latitude (mapY)
 * @param {number} lng Longitude (mapX)
 * @param {number} radius Radius in meters (max 20000)
 * @param {string} sido Sido name
 * @param {string|string[]} sigunguList Sigungu name(s)
 */
export const getRecommendedPlaces = async (lat, lng, radius = 5000, sido = '', sigunguList = '') => {
  try {
    const tourismReq = axios.get(`${BASE_URL}/locationBasedList2`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        numOfRows: 50,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'ChildcareApp',
        _type: 'json',
        arrange: 'O', // O = Sort by Distance (거리순)
        mapX: lng,
        mapY: lat,
        radius: radius,
      }
    });

    const odcloudReq = axios.get(`https://api.odcloud.kr/api/15091145/v1/uddi:6da3f4cb-eaac-42c5-9500-cfdf76c9496b`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        page: 1,
        perPage: 3000
      }
    });

    const [tourRes, odRes] = await Promise.allSettled([tourismReq, odcloudReq]);

    let items = [];
    if (tourRes.status === 'fulfilled') {
      const tourItems = tourRes.value.data?.response?.body?.items?.item;
      if (Array.isArray(tourItems)) items = tourItems;
    }

    const kidsKeywords = ['어린이', '키즈', '체험', '동물원', '식물원', '테마파크', '놀이공원', '놀이동산', '아쿠아', '박물관', '과학관', '생태', '농장', '장난감', '미술관', '어린이집', '키즈카페', '수목원', '공룡', '천문대', '전시관', '상상', '꿈터', '숲체험', '공원', '놀이'];
    
    let combinedPlaces = items.map(item => {
      const title = item.title || item.title?.toLowerCase() || '';
      const cat3 = item.cat3 || '';
      const contentTypeId = item.contenttypeid;
      
      let type = '장소';
      if (title.includes('키즈카페')) type = '키즈카페';
      else if (contentTypeId === '14') type = '문화/전시';
      else if (contentTypeId === '28' || contentTypeId === '15') type = '놀이/레저';
      else if (contentTypeId === '12') {
        if (cat3.startsWith('A01') || cat3.startsWith('A0202')) type = '공원/자연';
        else type = '관광/체험';
      }

      const isKidsFriendly = kidsKeywords.some(k => title.toLowerCase().includes(k)) || ['A02020400', 'A02020200', 'A02060100', 'A02060200'].includes(cat3);

      return {
        id: item.contentid,
        title: item.title,
        type,
        lat: parseFloat(item.mapy),
        lng: parseFloat(item.mapx),
        addr: item.addr1,
        image: item.firstimage || item.firstimage2,
        tel: item.tel,
        dist: item.dist,
        cat1: item.cat1,
        cat2: item.cat2,
        cat3,
        contentTypeId,
        isKidsFriendly,
        isRecommended: true
      };
    });

    // Process ODCLOUD Kids Cafes and Amusement Parks
    if (odRes.status === 'fulfilled' && sido && sigunguList) {
      const allOdPlaces = odRes.value.data?.data;
      if (Array.isArray(allOdPlaces)) {
        // Filter those located in the current district(s)
        const shortSido = sido.substring(0, 2);
        const sList = Array.isArray(sigunguList) ? sigunguList : [sigunguList];

        const localOdPlaces = allOdPlaces.filter(p => {
          const addr = p['기본주소'] || '';
          return addr.includes(shortSido) && sList.some(s => addr.includes(s));
        });

        const kakaoHeaders = { Authorization: `KakaoAK ${process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY}` };
        
        // Dynamically geocode them and merge
        const odPlacesMapped = await Promise.all(localOdPlaces.map(async (p, idx) => {
           let plat = lat; let plng = lng;
           const addr = p['기본주소'];
           try {
             const geoRes = await axios.get(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addr)}`, { headers: kakaoHeaders });
             if (geoRes.data?.documents?.length > 0) {
                plng = parseFloat(geoRes.data.documents[0].x);
                plat = parseFloat(geoRes.data.documents[0].y);
             }
           } catch(e) {}
           
           // Simple Haversine-like distance calculation
           const deg2rad = (deg) => deg * (Math.PI/180);
           const dLat = deg2rad(plat - lat);
           const dLon = deg2rad(plng - lng);
           const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(deg2rad(lat)) * Math.cos(deg2rad(plat)) * 
                     Math.sin(dLon/2) * Math.sin(dLon/2);
           const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
           const distance = 6371 * c * 1000; // Distance in meters

           return {
             id: `odcloud_${p['번호'] || idx}`,
             title: p['영업소명'],
             type: '키즈카페',
             lat: plat,
             lng: plng,
             addr: addr,
             tel: '-',
             dist: distance,
             cat3: 'A02020400',
             contentTypeId: '12',
             isKidsFriendly: true,
             isRecommended: true,
             bizStatus: p['영업소상태'],
             bizType: p['유원시설업종류'],
             licenseDate: p['허가일자(종합/일반)'] || p['신고일자(기타)']
           };
        }));
        
        combinedPlaces = [...combinedPlaces, ...odPlacesMapped];
      }
    }

    // Deduplicate and Merge
    const deduplicated = [];
    const seenNames = new Set();
    const seenLocations = [];

    const normTitle = (t) => (t || '').replace(/\s+/g, '').replace(/키즈카페|어린이집|장소|테마파크|영업소|지점|본점|점/g, '');
    const normAddr = (a) => (a || '').substring(0, 15).replace(/\s+/g, '');

    combinedPlaces.forEach(p => {
      const nt = normTitle(p.title);
      const na = normAddr(p.addr);
      const key = `${nt}_${na}`;
      
      // Check for exact normalized key match
      if (seenNames.has(key)) return;

      // Check for proximity (coords within ~20m)
      const nearby = seenLocations.find(loc => {
        const dLat = Math.abs(loc.lat - p.lat);
        const dLon = Math.abs(loc.lng - p.lng);
        return dLat < 0.0002 && dLon < 0.0002; // Roughly 20m
      });

      if (nearby) {
        // If nearby has no image but p does, update nearby (merge)
        if (!nearby.item.image && p.image) nearby.item.image = p.image;
        if (!nearby.item.tel && p.tel && p.tel !== '-') nearby.item.tel = p.tel;
        if (p.type === '키즈카페' && nearby.item.type !== '키즈카페') nearby.item.type = '키즈카페';
        return;
      }

      seenNames.add(key);
      seenLocations.push({ lat: p.lat, lng: p.lng, item: p });
      deduplicated.push(p);
    });

    return deduplicated;
  } catch (error) {
    console.error('getRecommendedPlaces error:', error?.response?.data || error.message);
    return [];
  }
};

/**
 * Fetch detailed information for a specific place.
 * @param {string} contentId Tourism API contentId
 */
export const getPlaceDetail = async (contentId, originalPlace = null) => {
  if (!contentId) return null;
  
  if (String(contentId).startsWith('odcloud_')) {
    return originalPlace; 
  }

  try {
    // 1. Fetch Common Detail (Overview, Title, Basic Info)
    const commonRes = await axios.get(`${BASE_URL}/detailCommon2`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'ChildcareApp',
        _type: 'json',
        contentId: contentId,
        // In KorService2, these YN params are invalid or unnecessary for detailCommon2
      }
    });

    // 2. Fetch Introduction Detail (Content Specific: opening hours, fees, parking, etc.)
    const introRes = await axios.get(`${BASE_URL}/detailIntro2`, {
      params: {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'ChildcareApp',
        _type: 'json',
        contentId: contentId,
        contentTypeId: originalPlace?.contentTypeId || '12',
      }
    });

    const commonItemRaw = commonRes.data?.response?.body?.items?.item;
    const commonItem = Array.isArray(commonItemRaw) ? commonItemRaw[0] : commonItemRaw;

    const introItemRaw = introRes.data?.response?.body?.items?.item;
    const introItem = Array.isArray(introItemRaw) ? introItemRaw[0] : introItemRaw;

    if (commonItem) {
       return {
         ...originalPlace, // Keep existing fields
         id: contentId,
         title: commonItem.title,
         addr: commonItem.addr1,
         image: commonItem.firstimage || commonItem.firstimage2,
         overview: commonItem.overview,
         tel: commonItem.tel,
         homepage: commonItem.homepage,
         lat: parseFloat(commonItem.mapy),
         lng: parseFloat(commonItem.mapx),
         // Metadata from Intro Detail (Robust Alias-aware mapping)
         usetime: introItem?.usetime || introItem?.usetimeculture || introItem?.usetimefestival || introItem?.opentime || introItem?.opentimefood || introItem?.playtime,
         parking: introItem?.parking || introItem?.parkingculture || introItem?.parkingshopping || introItem?.parkingfood,
         restdate: introItem?.restdate || introItem?.restdateculture || introItem?.restdatefood || introItem?.restdateshopping,
         babycarriage: introItem?.chkbabycarriage || introItem?.chkbabycarriageculture,
         expagerange: introItem?.expagerange,
         infocenter: introItem?.infocenter || introItem?.infocentertourist || introItem?.infocenterfood || introItem?.infocenterculture,
         usefee: introItem?.usefee || introItem?.usefeeculture || introItem?.entrancefee,
         chkpet: introItem?.chkpet || introItem?.chkpetculture,
         chkcreditcard: introItem?.chkcreditcard || introItem?.chkcreditcardculture
       };
    }
    return originalPlace; // Fallback
  } catch (error) {
    console.warn('getPlaceDetail error:', error.message);
    return originalPlace;
  }
};
