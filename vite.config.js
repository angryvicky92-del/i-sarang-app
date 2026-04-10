import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
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
