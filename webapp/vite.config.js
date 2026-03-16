import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 백그라운드에서 자동 업데이트
      devOptions: {
        enabled: true // 개발 환경에서도 PWA 테스트 가능
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // 캐싱할 파일 패턴
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Sparta VOCA',
        short_name: '스파르타 영단어',
        description: '스파르타 영단어 데일리 3단계 학습 앱',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone', // 앱처럼 전체 화면
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
