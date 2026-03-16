import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-voices',
      configureServer(server) {
        server.middlewares.use('/voices', (req, res, next) => {
          const fileName = decodeURIComponent(req.url.replace(/^\//, ''))
          const filePath = path.resolve(__dirname, '..', 'sources', 'voices', fileName)

          if (!fs.existsSync(filePath)) { next(); return }

          const stat = fs.statSync(filePath)
          const total = stat.size
          const range = req.headers.range

          res.setHeader('Content-Type', 'audio/mp4')
          res.setHeader('Accept-Ranges', 'bytes')

          if (range) {
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
            const start = parseInt(startStr, 10)
            const end = endStr ? parseInt(endStr, 10) : total - 1
            const chunkSize = end - start + 1
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${total}`,
              'Content-Length': chunkSize,
            })
            fs.createReadStream(filePath, { start, end }).pipe(res)
          } else {
            res.writeHead(200, { 'Content-Length': total })
            fs.createReadStream(filePath).pipe(res)
          }
        })
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Sparta VOCA',
        short_name: '스파르타 영단어',
        description: '스파르타 영단어 데일리 3단계 학습 앱',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
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
