import Toast from 'react-native-toast-message';

const TOURISM_API_KEY = process.env.EXPO_PUBLIC_TOURISM_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const RECOMMENDED_CACHE_TTL = 20 * 60 * 1000;
const ODCLOUD_CACHE_TTL = 60 * 60 * 1000;
const recommendedCache = new Map();
const recommendedRequests = new Map();
const MAX_RECOMMENDED_CACHE_SIZE = 60;
const geocodeCache = new Map();
let odcloudCache = { data: null, fetchedAt: 0, promise: null };

const fetchJson = async (url, params, options = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${url}?${query}`, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
};

const getOdcloudPlaces = async () => {
  const now = Date.now();
  if (odcloudCache.data && now - odcloudCache.fetchedAt < ODCLOUD_CACHE_TTL) return odcloudCache.data;
  if (odcloudCache.promise) return odcloudCache.promise;

  odcloudCache.promise = fetchJson(
    'https://api.odcloud.kr/api/15091145/v1/uddi:6da3f4cb-eaac-42c5-9500-cfdf76c9496b',
    { serviceKey: decodeURIComponent(TOURISM_API_KEY), page: 1, perPage: 3000 }
  ).then(result => {
    odcloudCache = { data: Array.isArray(result?.data) ? result.data : [], fetchedAt: Date.now(), promise: null };
    return odcloudCache.data;
  }).catch(error => {
    odcloudCache.promise = null;
    throw error;
  });
  return odcloudCache.promise;
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
};

const geocodeAddress = async (address) => {
  if (!address || !process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address);
  const result = await fetchJson(
    'https://dapi.kakao.com/v2/local/search/address.json',
    { query: address },
    { headers: { Authorization: `KakaoAK ${process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY}` } }
  );
  const document = result?.documents?.[0];
  const coordinates = document ? { lat: Number(document.y), lng: Number(document.x) } : null;
  if (coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)) {
    geocodeCache.set(address, coordinates);
    return coordinates;
  }
  return null;
};

/**
 * Fetch recommended places based on location.
 */
const fetchRecommendedPlaces = async (lat, lng, radius = 5000, sido = '', sigunguList = '') => {
  if (!TOURISM_API_KEY) throw new Error('EXPO_PUBLIC_TOURISM_API_KEY is not configured');
  const regions = (Array.isArray(sigunguList) ? sigunguList : [sigunguList]).filter(Boolean).sort();
  const cacheKey = `${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}_${radius}_${sido}_${regions.join(',')}`;
  const cached = recommendedCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < RECOMMENDED_CACHE_TTL) return cached.data;

  try {
    const tourismReq = fetchJson(`${BASE_URL}/locationBasedList2`, {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        numOfRows: 1000,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'ChildcareApp',
        _type: 'json',
        arrange: 'O', // O = Sort by Distance (거리순)
        mapX: lng,
        mapY: lat,
        radius,
    });
    const odcloudReq = getOdcloudPlaces();

    const [tourRes, odRes] = await Promise.allSettled([tourismReq, odcloudReq]);

    let items = [];
    if (tourRes.status === 'fulfilled') {
      const tourItems = tourRes.value?.response?.body?.items?.item;
      if (Array.isArray(tourItems)) items = tourItems;
    } else {
      console.warn('Tourism recommendation request failed:', tourRes.reason?.message);
    }

    if (tourRes.status === 'rejected' && odRes.status === 'rejected') throw tourRes.reason;

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
      const allOdPlaces = odRes.value;
      if (Array.isArray(allOdPlaces)) {
        // Filter those located in the current district(s)
        const shortSido = sido.substring(0, 2);
        const sList = regions;

        const localOdPlaces = allOdPlaces.filter(p => {
          const addr = p['기본주소'] || '';
          return addr.includes(shortSido) && sList.some(s => addr.includes(s));
        });

        // Limit Kakao calls and never place a failed geocode at the map center.
        const odPlacesMapped = await mapWithConcurrency(localOdPlaces, 5, async (p, idx) => {
           const addr = p['기본주소'];
           try {
             const coordinates = await geocodeAddress(addr);
             if (!coordinates) return null;
             const { lat: plat, lng: plng } = coordinates;
           
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
           } catch (error) {
             console.warn('Recommended place geocoding failed:', error.message);
             return null;
           }
        });
        
        combinedPlaces = [...combinedPlaces, ...odPlacesMapped.filter(Boolean)];
      }
    } else if (odRes.status === 'rejected') {
      console.warn('ODCloud recommendation request failed:', odRes.reason?.message);
    }

    // Deduplicate and Merge
    const deduplicated = [];
    const seenNames = new Set();
    const seenLocations = [];

    const normTitle = (t) => (t || '').replace(/\s+/g, '').replace(/키즈카페|어린이집|장소|테마파크|영업소|지점|본점|점/g, '');
    const normAddr = (a) => (a || '').substring(0, 15).replace(/\s+/g, '');

    combinedPlaces.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)).forEach(p => {
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

    recommendedCache.set(cacheKey, { data: deduplicated, fetchedAt: Date.now() });
    if (recommendedCache.size > MAX_RECOMMENDED_CACHE_SIZE) {
      recommendedCache.delete(recommendedCache.keys().next().value);
    }
    return deduplicated;
  } catch (error) {
    console.error('getRecommendedPlaces error:', error?.response?.data || error.message);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
    throw error;
  }
};

export const getRecommendedPlaces = async (lat, lng, radius = 5000, sido = '', sigunguList = '') => {
  const regions = (Array.isArray(sigunguList) ? sigunguList : [sigunguList]).filter(Boolean).sort();
  const requestKey = `${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}_${radius}_${sido}_${regions.join(',')}`;
  if (recommendedRequests.has(requestKey)) return recommendedRequests.get(requestKey);

  const request = fetchRecommendedPlaces(lat, lng, radius, sido, sigunguList);
  recommendedRequests.set(requestKey, request);
  try {
    return await request;
  } finally {
    recommendedRequests.delete(requestKey);
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
    const [commonRes, introRes] = await Promise.all([
      fetchJson(`${BASE_URL}/detailCommon2`, {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'ChildcareApp',
        _type: 'json',
        contentId,
      }),
      fetchJson(`${BASE_URL}/detailIntro2`, {
        serviceKey: decodeURIComponent(TOURISM_API_KEY),
        MobileOS: 'ETC',
        MobileApp: 'ChildcareApp',
        _type: 'json',
        contentId,
        contentTypeId: originalPlace?.contentTypeId || '12',
      })
    ]);

    const commonItemRaw = commonRes?.response?.body?.items?.item;
    const commonItem = Array.isArray(commonItemRaw) ? commonItemRaw[0] : commonItemRaw;

    const introItemRaw = introRes?.response?.body?.items?.item;
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
