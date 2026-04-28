import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const KAKAO_JS_KEY = 'dc33fe7753b02b59868630ccbfd7b820';

export default function KakaoMapWebView({ center, animateTick, markers, userLocation, selectedId, isDarkMode, onRegionChange, onMarkerPress, onClusterClick, onMapPress }) {
  const webviewRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Update full marker set only when data changes
  const prevMarkersRef = useRef(null);
  useEffect(() => {
    if (webviewRef.current && isMapReady && markers !== prevMarkersRef.current) {
      prevMarkersRef.current = markers;
      const markersJson = JSON.stringify(markers || []);
      webviewRef.current.injectJavaScript(`
        if (window.updateMarkers) {
           window.updateMarkers(${markersJson});
        }
        true;
      `);
    }
  }, [markers, isMapReady]);

  // 2. Fast highlight for selected marker
  useEffect(() => {
    if (webviewRef.current && isMapReady) {
      webviewRef.current.injectJavaScript(`
        if (window.selectMarker) {
           window.selectMarker("${selectedId || ''}");
        }
        true;
      `);
    }
  }, [selectedId, isMapReady]);

  // 3. User location update
  useEffect(() => {
    if (webviewRef.current && isMapReady) {
      const userLocJson = JSON.stringify(userLocation || null);
      webviewRef.current.injectJavaScript(`
        if (window.updateUserLocation) {
           window.updateUserLocation(${userLocJson});
        }
        true;
      `);
    }
  }, [userLocation, isMapReady]);

  // 4. Dark Mode update
  useEffect(() => {
    if (webviewRef.current && isMapReady) {
      webviewRef.current.injectJavaScript(`
        document.body.className = "${isDarkMode ? 'dark-mode' : ''}";
        true;
      `);
    }
  }, [isDarkMode, isMapReady]);

  // When center updates from context, pass it to webview
  // We only panTo if animateTick has changed (explicit movement request)
  const lastAnimateTick = useRef(animateTick);
  useEffect(() => {
    if (webviewRef.current && center && animateTick !== lastAnimateTick.current) {
      lastAnimateTick.current = animateTick;
      const moveScript = `
        if (window.map) {
           var moveLatLon = new kakao.maps.LatLng(${center.lat}, ${center.lng});
           window.map.panTo(moveLatLon);
        }
        true;
      `;
      webviewRef.current.injectJavaScript(moveScript);
    }
  }, [animateTick, center]); 

  // Initial load or major center jumps without animation
  useEffect(() => {
    if (webviewRef.current && center && !animateTick) {
        webviewRef.current.injectJavaScript(`
          if (window.map) {
             var cur = window.map.getCenter();
             var newLat = ${center.lat};
             var newLng = ${center.lng};
             // Increase threshold to 0.005 (~500m) to avoid snapping back during active drag/idle fetch cycles
             if (Math.abs(cur.getLat() - newLat) > 0.005 || Math.abs(cur.getLng() - newLng) > 0.005) {
                 window.map.setCenter(new kakao.maps.LatLng(newLat, newLng));
             }
          }
          true;
        `);
    }
  }, [center, animateTick]);


  // Initial center for the very first load to avoid HTML re-renders
  const [initialCenter] = useState(center);

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
        #map { width: 100%; height: 100%; background: #F8FAFC; }
        
        /* Dark Mode Filter for Map */
        .dark-mode #map { 
          filter: invert(90%) hue-rotate(180deg) brightness(105%) contrast(90%); 
        }
        /* Keep overlays and copyright readable */
        .dark-mode .pin-label,
        .dark-mode .user-location-marker,
        .dark-mode img[src*="copyright"] {
           filter: invert(100%) hue-rotate(180deg);
        }
        .single-pin {
          width: 30px; height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: -2px 2px 5px rgba(0,0,0,0.3);
          transition: all 0.2s ease-in-out;
          cursor: pointer;
        }
        .selected-pin {
          width: 42px; height: 42px;
          border-color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 999;
        }
        .pin-label {
          background: white;
          padding: 6px 12px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          font-size: 13px;
          font-weight: bold;
          color: #1E293B;
          white-space: nowrap;
          transform: translateY(10px);
        }
        .user-location-marker {
          width: 14px; height: 14px;
          background: #3B82F6;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
          z-index: 1000;
        }
      </style>
      <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=clusterer"></script>
    </head>
    <body class="">
      <div id="map"></div>
      <script>
        var mapContainer = document.getElementById('map');
        var mapOption = {
            center: new kakao.maps.LatLng(${initialCenter?.lat || 37.5665}, ${initialCenter?.lng || 126.9780}),
            level: 4
        };
        var map = new kakao.maps.Map(mapContainer, mapOption);
        map.setCopyrightPosition(kakao.maps.CopyrightPosition.BOTTOMRIGHT, true);
        
        var clusterPinSvg = '<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#75BA57" stroke="white" stroke-width="2"/>' +
            '</svg>';
        var clusterPinBase64 = 'data:image/svg+xml;base64,' + btoa(clusterPinSvg);

        var clusterer = new kakao.maps.MarkerClusterer({
            map: map,
            averageCenter: true,
            minLevel: 3, 
            gridSize: 35, 
            disableClickZoom: true,
            styles: [{ 
                width : '32px', height : '40px',
                background: 'url(' + clusterPinBase64 + ') no-repeat',
                backgroundSize: '32px 40px',
                color: '#fff',
                textAlign: 'center',
                fontWeight: 'bold',
                lineHeight: '28px', 
                fontSize: '14px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }]
        });

        var markerCache = {}; 
        var markerCacheKeys = [];
        var activeMarkers = [];
        var activeOverlays = [];
        var districtOverlays = [];
        var lastSelectedId = null;
        var userMarker = null;

        kakao.maps.event.addListener(clusterer, 'clusterclick', function(cluster) {
            var markers = cluster.getMarkers();
            var ids = markers.map(function(m) { return m.daycareId; }).filter(Boolean);
            if (ids.length > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CLUSTER_CLICK', daycareIds: ids }));
            }
        });

        window.updateClusteringMode = function() {
            var level = map.getLevel();
            var markers = activeMarkers;
            
            districtOverlays.forEach(function(o) { o.setMap(null); });
            districtOverlays = [];

            if (level >= 7) { 
                clusterer.clear();
                markers.forEach(function(m) { m.setMap(null); });
                
                var groups = {};
                markers.forEach(function(m) {
                    var defaultLabel = m.isRecommended ? '추천장소' : '어린이집';
                    var d = m.district || defaultLabel;
                    if (!groups[d]) groups[d] = { count: 0, lat: 0, lng: 0, district: d };
                    groups[d].count++;
                    groups[d].lat += m.getPosition().getLat();
                    groups[d].lng += m.getPosition().getLng();
                });

                Object.values(groups).forEach(function(g) {
                    var avgLat = g.lat / g.count;
                    var avgLng = g.lng / g.count;
                    var pos = new kakao.maps.LatLng(avgLat, avgLng);
                    
                    var content = document.createElement('div');
                    content.style.cssText = 'background: white; border: 2px solid #75BA57; border-radius: 12px; padding: 6px 12px; font-weight: 900; color: #1E293B; font-size: 13px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 4px;';
                    content.innerHTML = '<span style="color: #64748B; font-size: 13px;">' + g.district + '</span>' + 
                                       '<span style="color: #75BA57; font-size: 16px;">' + g.count + '</span>';
                    
                    content.onclick = function() {
                        map.setLevel(5, { anchor: pos, animate: true });
                    };

                    var overlay = new kakao.maps.CustomOverlay({
                        position: pos, content: content, zIndex: 500
                    });
                    overlay.setMap(map);
                    districtOverlays.push(overlay);
                });
            } else { 
                if (!lastSelectedId) {
                   clusterer.clear(); 
                   clusterer.addMarkers(activeMarkers);
                }
            }
        };

        kakao.maps.event.addListener(map, 'zoom_changed', function() {
            window.updateClusteringMode();
        });

        window.updateUserLocation = function(pos) {
            if (userMarker) userMarker.setMap(null);
            if (!pos || !pos.lat) return;
            
            var latlng = new kakao.maps.LatLng(pos.lat, pos.lng);
            var content = document.createElement('div');
            content.className = 'user-location-marker';
            
            userMarker = new kakao.maps.CustomOverlay({
                position: latlng, content: content, yAnchor: 0.5 
            });
            userMarker.setMap(map);
        };

        window.selectMarker = function(selectedId) {
            clusterer.clear(); 
            var selectedMarker = null;
            
            activeMarkers.forEach(function(marker) {
                var isSelected = String(marker.daycareId) === String(selectedId);
                if (isSelected) {
                    selectedMarker = marker;
                    marker.setMap(map);
                    marker.setZIndex(999);
                } else {
                    marker.setMap(null);
                }
            });

            lastSelectedId = selectedId;

            if (!selectedId) {
                window.updateClusteringMode(); 
            }

            activeOverlays.forEach(function(o) { o.setMap(null); });
            activeOverlays = [];

            if (selectedId && selectedMarker) {
                var labelDiv = document.createElement('div');
                labelDiv.className = 'pin-label';
                labelDiv.innerHTML = (selectedMarker.daycareName || selectedMarker.title || '상세보기');
                var labelOverlay = new kakao.maps.CustomOverlay({
                    position: selectedMarker.getPosition(), 
                    content: labelDiv, 
                    yAnchor: 2.8 
                });
                labelOverlay.setMap(map);
                activeOverlays.push(labelOverlay);

                try {
                    var proj = map.getProjection();
                    var markerPos = selectedMarker.getPosition();
                    var markerPoint = proj.pointFromCoords(markerPos);
                    var verticalOffset = map.getHeight() * 0.28; 
                    var newCenterPoint = new kakao.maps.Point(markerPoint.x, markerPoint.y + verticalOffset);
                    var newCenterCoords = proj.coordsFromPoint(newCenterPoint);
                    map.panTo(newCenterCoords);
                } catch(e) {
                    map.panTo(selectedMarker.getPosition());
                }
            }
            lastSelectedId = selectedId;
        };

        window.updateMarkers = function(daycareList) {
            var newActiveMarkers = [];
            
            activeMarkers.forEach(function(m) { m.setMap(null); });
            clusterer.clear();
            districtOverlays.forEach(function(o) { o.setMap(null); });
            districtOverlays = [];

            daycareList.forEach(function(dc) {
                var id = String(dc.id);
                var latlng = new kakao.maps.LatLng(dc.lat, dc.lng);
                var color = dc.color || '#3B82F6';
                var isRecommended = !!dc.isRecommended;
                var isFavorite = !!dc.isFavorite;

                var cached = markerCache[id];
                
                if (!cached) {
                    // Memory limit: Evict oldest if cache exceeds 500
                    if (markerCacheKeys.length > 500) {
                        var oldestId = markerCacheKeys.shift();
                        delete markerCache[oldestId];
                    }

                    var innerIcon;
                    if (isRecommended) {
                        innerIcon = '<path transform="translate(6,6) scale(0.8)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFF"/>';
                    } else if (isFavorite) {
                        innerIcon = '<path d="M16 21.35l-0.89-0.81C11.95 17.65 10 15.89 10 13.75c0-1.84 1.45-3.25 3.3-3.25 1.04 0 2.05.48 2.7 1.24 0.65-0.76 1.66-1.24 2.7-1.24 1.85 0 3.3 1.41 3.3 3.25 0 2.14-1.95 3.9-5.11 6.8l-0.89 0.8z" fill="#EF4444"/>';
                    } else {
                        innerIcon = '<circle cx="16" cy="16" r="5" fill="white"/>';
                    }
                    var svg = '<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">' +
                               '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="' + color + '" stroke="white" stroke-width="2"/>' +
                               innerIcon +
                               '</svg>';
                    var markerImage = new kakao.maps.MarkerImage(
                        'data:image/svg+xml;base64,' + btoa(svg),
                        new kakao.maps.Size(32, 40),
                        { offset: new kakao.maps.Point(16, 40) }
                    );

                    var marker = new kakao.maps.Marker({
                        position: latlng,
                        image: markerImage,
                        clickable: true
                    });
                    marker.daycareId = dc.id;
                    marker.daycareName = dc.name;
                    marker.district = dc.district; 
                    marker.isRecommended = isRecommended;

                    kakao.maps.event.addListener(marker, 'click', function() {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_PRESS', daycareId: dc.id }));
                    });

                    cached = { marker: marker, isFavorite: isFavorite, color: color, isRecommended: isRecommended };
                    markerCache[id] = cached;
                    markerCacheKeys.push(id);
                } else if (cached.isFavorite !== isFavorite || cached.color !== color || cached.isRecommended !== isRecommended) {
                    var innerIcon;
                    if (isRecommended) {
                        innerIcon = '<path transform="translate(6,6) scale(0.8)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFF"/>';
                    } else if (isFavorite) {
                        innerIcon = '<path d="M16 21.35l-0.89-0.81C11.95 17.65 10 15.89 10 13.75c0-1.84 1.45-3.25 3.3-3.25 1.04 0 2.05.48 2.7 1.24 0.65-0.76 1.66-1.24 2.7-1.24 1.85 0 3.3 1.41 3.3 3.25 0 2.14-1.95 3.9-5.11 6.8l-0.89 0.8z" fill="#EF4444"/>';
                    } else {
                        innerIcon = '<circle cx="16" cy="16" r="5" fill="white"/>';
                    }
                    var svg = '<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">' +
                               '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="' + color + '" stroke="white" stroke-width="2"/>' +
                               innerIcon +
                               '</svg>';
                    var markerImage = new kakao.maps.MarkerImage(
                        'data:image/svg+xml;base64,' + btoa(svg),
                        new kakao.maps.Size(32, 40),
                        { offset: new kakao.maps.Point(16, 40) }
                    );
                    cached.marker.setImage(markerImage);
                    cached.isFavorite = isFavorite;
                    cached.color = color;
                    cached.isRecommended = isRecommended;
                }

                newActiveMarkers.push(cached.marker);
            });

            activeMarkers = newActiveMarkers;
            window.updateClusteringMode(); 
            
            if (lastSelectedId) window.selectMarker(lastSelectedId);
        };

        var lastRegionUpdateTime = 0;
        kakao.maps.event.addListener(map, 'idle', function() {
            var now = Date.now();
            if (now - lastRegionUpdateTime < 500) return; 
            lastRegionUpdateTime = now;

            var latlng = map.getCenter();
            var bounds = map.getBounds();
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'REGION_CHANGE', latitude: latlng.getLat(), longitude: latlng.getLng(),
              bounds: { sw: { lat: sw.getLat(), lng: sw.getLng() }, ne: { lat: ne.getLat(), lng: ne.getLng() } }
            }));
        });

        kakao.maps.event.addListener(map, 'click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_PRESS' }));
        });

        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'READY' }));
        
        setTimeout(function() {
            var latlng = map.getCenter();
            var bounds = map.getBounds();
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'REGION_CHANGE', latitude: latlng.getLat(), longitude: latlng.getLng(),
              bounds: { sw: { lat: sw.getLat(), lng: sw.getLng() }, ne: { lat: ne.getLat(), lng: ne.getLng() } }
            }));
        }, 100);
          </script>
    </body>
    </html>
  `, []);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        setIsMapReady(true);
      } else if (data.type === 'REGION_CHANGE') {
        if (onRegionChange) {
          onRegionChange({ latitude: data.latitude, longitude: data.longitude, bounds: data.bounds });
        }
      } else if (data.type === 'MARKER_PRESS') {
        if (onMarkerPress) onMarkerPress(data.daycareId);
      } else if (data.type === 'CLUSTER_CLICK') {
        if (onClusterClick) onClusterClick(data.daycareIds);
      } else if (data.type === 'MAP_PRESS') {
        if (onMapPress) onMapPress();
      }
    } catch (err) {
      console.warn('WebView Message Parse Error', err);
    }
  }, [onRegionChange, onMarkerPress, onClusterClick, onMapPress]);

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
        cacheEnabled={true}
        renderToHardwareTextureAndroid={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', backgroundColor: '#E2E8F0' },
  webview: { flex: 1, backgroundColor: 'transparent' }
});
