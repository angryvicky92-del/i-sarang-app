import Toast from 'react-native-toast-message';
import { supabase } from './supabaseClient';

const API_KEY = process.env.EXPO_PUBLIC_DATA_PORTAL_KEY;
const DEFAULT_LOC = { nx: 61, ny: 126, station: '강남구', name: 'gangnam' };

export const weatherService = {
  async getOutdoorPlayIndex() {
    try {
      // 1. Check Cache
      const { data: cached } = await supabase
        .from('weather_cache')
        .select('*')
        .eq('location_key', DEFAULT_LOC.name)
        .single();

      const THIRTY_MINS = 30 * 60 * 1000;
      if (cached && (new Date() - new Date(cached.updated_at) < THIRTY_MINS)) {
        return this.processData(cached.weather_data, cached.pollution_data);
      }

      // 2. Fetch Fresh Data (Public Data Portal)
      if (!API_KEY) {
        throw new Error('DATA_PORTAL_KEY is missing');
      }

      const now = new Date();
      const baseDate = now.toISOString().slice(0, 10).replace(/-/g, '');
      // KMA UltraSrtFcst is updated at :45 each hour
      let hours = now.getHours();
      if (now.getMinutes() < 45) hours -= 1;
      if (hours < 0) hours = 23; // Simplistic day wrap
      const baseTime = String(hours).padStart(2, '0') + '00';

      const [weatherRes, pollutionRes] = await Promise.all([
        fetch(`http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=${API_KEY}&numOfRows=60&pageNo=1&base_date=${baseDate}&base_time=${baseTime}&nx=${DEFAULT_LOC.nx}&ny=${DEFAULT_LOC.ny}&dataType=JSON`),
        fetch(`http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${API_KEY}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(DEFAULT_LOC.station)}&dataTerm=DAILY&ver=1.3`)
      ]);

      const weatherJSON = await weatherRes.json();
      const pollutionJSON = await pollutionRes.json();

      const weatherItems = weatherJSON?.response?.body?.items?.item || [];
      const pollutionObj = pollutionJSON?.response?.body?.items?.[0] || {};

      if (weatherItems.length === 0 || !pollutionObj.pm10Value) {
        console.error('Public Data API Error:', { weatherJSON, pollutionJSON });
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
        throw new Error('API response invalid');
      }

      // 3. Upsert Cache
      await supabase.from('weather_cache').upsert({
        location_key: DEFAULT_LOC.name,
        weather_data: weatherItems,
        pollution_data: pollutionObj,
        updated_at: new Date().toISOString()
      });

      return this.processData(weatherItems, pollutionObj);
    } catch (error) {
      console.error('WeatherService Error:', error.message);
    Toast.show({ type: 'error', text1: '오류 안내', text2: '데이터 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
      return null;
    }
  },

  processData(weatherItems, poll) {
    const getDustGrade = (val) => {
      if (val <= 10) return { label: '최고', color: '#003399' }; // Deep Blue
      if (val <= 22) return { label: '좋음', color: '#4169E1' }; // Light Blue
      if (val <= 35) return { label: '양호', color: '#00FA9A' }; // Mint
      if (val <= 45) return { label: '보통', color: '#10B981' }; // Green
      if (val <= 75) return { label: '나쁨', color: '#FACC15' }; // Deep Yellow
      if (val <= 100) return { label: '상당히 나쁨', color: '#F97316' }; // Orange
      if (val <= 150) return { label: '매우 나쁨', color: '#EF4444' }; // Red
      return { label: '최악', color: '#000000' }; // Black
    };

    const tempItem = weatherItems.find(i => i.category === 'T1H');
    const ptyItem = weatherItems.find(i => i.category === 'PTY');
    const skyItem = weatherItems.find(i => i.category === 'SKY');
    
    const temp = tempItem ? Math.round(parseFloat(tempItem.fcstValue)) : 0;
    const pty = ptyItem ? parseInt(ptyItem.fcstValue) : 0;
    const sky = skyItem ? parseInt(skyItem.fcstValue) : 1;
    
    const pm10 = parseInt(poll.pm10Value) || 0;
    const pm25 = parseInt(poll.pm25Value) || 0;
    const { label: pm10Grade, color: pm10Color } = getDustGrade(pm10);

    let status = 'safe';
    let label = '바깥놀이하기 좋아요';
    let subText = `미세먼지 ${pm10Grade} / 기온 ${temp}°`;

    // 🔴 DANGER (상당히 나쁨 76+ or Rainfall or Extremes)
    if (pm10 > 75 || pm25 > 35 || pty > 0 || temp < -10 || temp > 35) {
      status = 'danger';
      label = '실내 대체 활동 권장';
      const reason = pty > 0 ? '강수 확인' : (pm10 > 75 ? `미세먼지 ${pm10Grade}` : '기온 부적합');
      subText = `미세먼지 ${pm10Grade} / ${reason}`;
    } 
    // 🟡 CAUTION (보통~나쁨 36~75 or Cloudy)
    else if (pm10 > 35 || pm25 > 15 || sky >= 3) {
      status = 'caution';
      label = '주의해서 활동';
      subText = `미세먼지 ${pm10Grade} / ${sky === 4 ? '매우 흐림' : '흐림'}`;
    }
    // 🟢 SAFE (최고~양호 0~35)
    else {
      subText = `미세먼지 ${pm10Grade} / 기온 ${temp}°`;
    }

    return {
      status,
      label,
      subText,
      temp,
      pm10,
      pm25,
      pm10Grade,
      pm10Color,
      weatherDesc: pty > 0 ? '강수' : (sky === 1 ? '맑음' : (sky === 3 ? '흐림' : '매우 흐림'))
    };
  }
};
