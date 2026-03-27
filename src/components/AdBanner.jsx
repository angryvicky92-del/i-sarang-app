import React, { useEffect } from 'react'

/**
 * AdBanner Component
 * @param {string} props.adSlot - Google Adsense Ad Slot ID
 * @param {string} props.adClient - Google Adsense Client ID (ca-pub-xxx)
 * @param {string} props.format - Ad format (auto, fluid, etc.)
 */
export default function AdBanner({ adSlot = "YOUR_AD_SLOT_ID", adClient = "YOUR_AD_CLIENT_ID", format = "auto" }) {
  useEffect(() => {
    try {
      // 구글 애드센스 스크립트 실행을 위한 로직
      // 실제 배포 시 window.adsbygoogle이 존재할 때만 실행
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("Adsense error:", e);
    }
  }, []);

  // 개발 단계 및 실제 광고 로드 전 보여줄 플레이스홀더 디자인
  return (
    <div className="ad-container" style={{ margin: '20px 0', overflow: 'hidden' }}>
      <ins 
        className="adsbygoogle"
        style={{ display: 'block', textDecoration: 'none' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      >
        {/* Placeholder UI */}
        <div style={{
          width: '100%',
          height: '100px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #ced4da',
          color: '#adb5bd',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '10px', background: '#e9ecef', padding: '2px 6px', borderRadius: 4, color: '#6c757d' }}>AD</span>
            <span>추천 정보</span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: '400', color: '#ced4da' }}>
            애드센스 광고가 노출될 영역입니다.
          </div>
        </div>
      </ins>
    </div>
  )
}
