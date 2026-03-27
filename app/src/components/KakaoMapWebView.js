import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const KAKAO_JS_KEY = 'dc33fe7753b02b59868630ccbfd7b820';

export default function KakaoMapWebView({ center, markers, onRegionChange, onMarkerPress, onMapPress }) {
  const webviewRef = useRef(null);

  // When center updates from context, pass it to webview
  useEffect(() => {
    if (webviewRef.current && center) {
      webviewRef.current.injectJavaScript(`
        if (window.map) {
           var moveLatLon = new kakao.maps.LatLng(${center.lat}, ${center.lng});
           window.map.panTo(moveLatLon);
        }
        true;
      `);
    }
  }, [center]);

  // When markers update, pass them to webview
  useEffect(() => {
    if (webviewRef.current && markers) {
      webviewRef.current.injectJavaScript(`
        if (window.updateMarkers) {
           window.updateMarkers(${JSON.stringify(markers)});
        }
        true;
      `);
    }
  }, [markers]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        #map { width: 100%; height: 100%; }
        .single-pin {
          width: 30px; height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: -2px 2px 5px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        .single-pin::after {
          content: '';
          width: 10px; height: 10px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
      </style>
      <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=clusterer"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var mapContainer = document.getElementById('map');
        var mapOption = {
            center: new kakao.maps.LatLng(${center?.lat || 37.5145}, ${center?.lng || 127.0396}),
            level: 5
        };
        var map = new kakao.maps.Map(mapContainer, mapOption);
        
        var clusterer = new kakao.maps.MarkerClusterer({
            map: map,
            averageCenter: true,
            minLevel: 6,
            calculator: [10, 30, 50],
            styles: [{ 
                width : '46px', height : '46px',
                background: 'rgba(117, 186, 87, 0.9)',
                borderRadius: '23px',
                color: '#fff',
                textAlign: 'center',
                fontWeight: 'bold',
                lineHeight: '46px',
                border: '3px solid white',
                boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                fontSize: '16px'
            }]
        });

        var activeMarkers = [];

        window.updateMarkers = function(daycareList) {
            clusterer.clear();
            activeMarkers.forEach(function(m) { m.setMap(null); });
            activeMarkers = [];
            
            var newMarkers = [];
            
            daycareList.forEach(function(dc) {
                var content = document.createElement('div');
                content.className = 'single-pin';
                content.style.backgroundColor = dc.color || '#3B82F6';
                
                content.onclick = function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_PRESS', daycareId: dc.id }));
                };

                // yAnchor: 1 aligns the bottom tip of our rotated square to the exact coordinate
                var customOverlay = new kakao.maps.CustomOverlay({
                    position: new kakao.maps.LatLng(dc.lat, dc.lng),
                    content: content,
                    clickable: true,
                    yAnchor: 1 
                });
                newMarkers.push(customOverlay);
                activeMarkers.push(customOverlay);
            });
            
            clusterer.addMarkers(newMarkers);
        };

        // Initialize with default markers if any passed directly
        window.updateMarkers(${JSON.stringify(markers || [])});

        // Map drag end event
        kakao.maps.event.addListener(map, 'dragend', function() {
            var latlng = map.getCenter();
            var bounds = map.getBounds();
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'REGION_CHANGE', 
              latitude: latlng.getLat(), 
              longitude: latlng.getLng(),
              bounds: {
                sw: { lat: sw.getLat(), lng: sw.getLng() },
                ne: { lat: ne.getLat(), lng: ne.getLng() }
              }
            }));
        });

        // Map zoom change event
        kakao.maps.event.addListener(map, 'zoom_changed', function() {
            var latlng = map.getCenter();
            var bounds = map.getBounds();
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'REGION_CHANGE', 
              latitude: latlng.getLat(), 
              longitude: latlng.getLng(),
              bounds: {
                sw: { lat: sw.getLat(), lng: sw.getLng() },
                ne: { lat: ne.getLat(), lng: ne.getLng() }
              }
            }));
        });

        // Map click event (for closing summary card)
        kakao.maps.event.addListener(map, 'click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_PRESS' }));
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'REGION_CHANGE') {
        if (onRegionChange) {
          onRegionChange({ 
            latitude: data.latitude, 
            longitude: data.longitude,
            bounds: data.bounds
          });
        }
      } else if (data.type === 'MARKER_PRESS') {
        if (onMarkerPress) onMarkerPress(data.daycareId);
      } else if (data.type === 'MAP_PRESS') {
        if (onMapPress) onMapPress();
      }
    } catch (e) {
      console.warn('WebView Message Parse Error', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        scrollEnabled={false}
        javaScriptEnabled={true}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#E2E8F0'
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent'
  }
});
