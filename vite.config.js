import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // 청크 크기 경고 임계값 상향 (라이브러리 분리로 실제 크기는 감소)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // 핵심 라이브러리별 청크 분리 → 캐시 효율 극대화
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['framer-motion', 'lucide-react', 'react-hot-toast'],
          'vendor-lexical':  ['lexical', '@lexical/react', '@lexical/html', '@lexical/selection', '@lexical/utils'],
          'vendor-map':      ['leaflet', 'react-leaflet', 'react-kakao-maps-sdk'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api-childcare': {
        target: 'http://api.childcare.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-childcare/, '')
      },
      '/api-regional': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-regional/, '')
      }
    }
  }
})
