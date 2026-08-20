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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('react-hot-toast')) {
              return 'vendor-ui';
            }
            if (id.includes('lexical') || id.includes('@lexical/')) {
              return 'vendor-lexical';
            }
            if (id.includes('react-kakao-maps-sdk')) {
              return 'vendor-map';
            }
            return 'vendor';
          }
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
