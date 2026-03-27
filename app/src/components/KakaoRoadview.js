import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// The Javascript Kakao API key found in the web version's index.html
const KAKAO_JS_KEY = 'dc33fe7753b02b59868630ccbfd7b820';

export default function KakaoRoadview({ lat, lng }) {
  // We use baseUrl 'http://localhost' to bypass Kakao's domain restrictions
  // assuming 'http://localhost' is registered in the user's Kakao Dev Console.
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          #roadview { width: 100vw; height: 100vh; }
        </style>
        <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
      </head>
      <body>
        <div id="roadview"></div>
        <script>
          const rvContainer = document.getElementById('roadview');
          const rv = new kakao.maps.Roadview(rvContainer);
          const rvClient = new kakao.maps.RoadviewClient();
          const position = new kakao.maps.LatLng(${lat}, ${lng});

          // Get the nearest roadview panoId within 50 meters
          rvClient.getNearestPanoId(position, 50, function(panoId) {
            if (panoId === null) {
              rvContainer.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#666; font-family:sans-serif;">이 구역은 로드뷰가 제공되지 않습니다.</div>';
            } else {
              rv.setPanoId(panoId, position);
              
              // Automatically look at the building (adjust pan/tilt)
              kakao.maps.event.addListener(rv, 'init', function() {
                  var projection = rv.getProjection();
                  var viewpoint = projection.viewpointFromCoords(position, position.getAltitude());
                  rv.setViewpoint(viewpoint);
              });
            }
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent, baseUrl: 'http://localhost:5173' }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        pointerEvents="auto"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  }
});
