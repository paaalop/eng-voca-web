import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// 백그라운드 자동 업데이트 활성화
const updateSW = registerSW({
  onNeedRefresh() {
    // 새 버전이 감지되면 자동으로 새로고침(업데이트) 진행
  },
  onOfflineReady() {
    console.log('앱이 오프라인 동작 준비를 완료했습니다.')
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
