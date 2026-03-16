import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { dialogueData } from './dialogueData'

const STORAGE_KEY = 'sparta_memo_timestamps'

function loadTimestamps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveTimestamps(ts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ts))
}

export default function MemorizationPage() {
  const [currentMemo, setCurrentMemo] = useState(1)
  const [showKorean, setShowKorean] = useState(true)
  const [hideSpeaker, setHideSpeaker] = useState(null) // null | 'A' | 'B'
  const [isStampMode, setIsStampMode] = useState(false)
  const [stampIndex, setStampIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timestamps, setTimestamps] = useState(loadTimestamps)

  // timestamps.json 자동 로드 (스크립트 실행 후 자동 적용)
  useEffect(() => {
    fetch('/timestamps.json')
      .then(r => { if (!r.ok) throw new Error('no file'); return r.json() })
      .then(data => {
        setTimestamps(prev => {
          // localStorage에 수동으로 저장한 항목이 있으면 우선 적용
          const merged = { ...data }
          const manual = loadTimestamps()
          Object.keys(manual).forEach(k => { merged[k] = manual[k] })
          return merged
        })
      })
      .catch(() => {}) // 파일 없으면 무시
  }, [])
  const [activePlayer, setActivePlayer] = useState('en') // 'en' | 'ko'

  const audioEnRef = useRef(null)
  const audioKoRef = useRef(null)
  const scriptRef = useRef(null)
  const activeLineRef = useRef(null)

  const memo = dialogueData.find(d => d.id === currentMemo)
  const memoTs = timestamps[currentMemo] || []

  // 현재 재생 중인 줄 계산
  const activeLineIndex = useMemo(() => {
    if (memoTs.length === 0) return -1
    for (let i = memoTs.length - 1; i >= 0; i--) {
      if (memoTs[i] != null && currentTime >= memoTs[i]) return i
    }
    return -1
  }, [currentTime, memoTs])

  // 메모 변경 시 초기화
  useEffect(() => {
    setIsStampMode(false)
    setStampIndex(0)
    setCurrentTime(0)
    setIsPlaying(false)
    if (audioEnRef.current) {
      audioEnRef.current.pause()
      audioEnRef.current.currentTime = 0
    }
    if (audioKoRef.current) {
      audioKoRef.current.pause()
      audioKoRef.current.currentTime = 0
    }
  }, [currentMemo])

  // 오디오 이벤트 바인딩
  useEffect(() => {
    const audio = audioEnRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [currentMemo])

  // 활성 줄 자동 스크롤
  useEffect(() => {
    if (activeLineRef.current && isPlaying) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeLineIndex, isPlaying])

  // 줄 클릭 → 오디오 점프
  const handleLineClick = useCallback((index) => {
    const t = memoTs[index]
    if (t == null) return
    const audio = audioEnRef.current
    if (!audio) return
    audio.currentTime = t
    audio.play()
  }, [memoTs])

  // 타임스탬프 찍기
  const handleStamp = useCallback(() => {
    const audio = audioEnRef.current
    if (!audio || !memo) return
    const time = audio.currentTime

    setTimestamps(prev => {
      const updated = { ...prev }
      const arr = [...(updated[currentMemo] || [])]
      arr[stampIndex] = time
      updated[currentMemo] = arr
      saveTimestamps(updated)
      return updated
    })

    if (stampIndex < memo.lines.length - 1) {
      setStampIndex(i => i + 1)
    } else {
      setIsStampMode(false)
      setStampIndex(0)
    }
  }, [memo, currentMemo, stampIndex])

  // 스탬프 모드 - 스페이스바
  useEffect(() => {
    if (!isStampMode) return
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        handleStamp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isStampMode, handleStamp])

  // 타임스탬프 초기화
  const handleClearTimestamps = () => {
    if (!window.confirm(`Memo ${currentMemo}의 타임스탬프를 초기화할까요?`)) return
    setTimestamps(prev => {
      const updated = { ...prev }
      delete updated[currentMemo]
      saveTimestamps(updated)
      return updated
    })
  }

  const hasLines = memo && memo.lines.length > 0
  const stampedCount = memoTs.filter(t => t != null).length
  const allStamped = hasLines && stampedCount >= memo.lines.length

  return (
    <div className="container">
      <header className="header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="title">Sparta MEMO</h1>
        <p className="subtitle">대화문 암기 훈련</p>
      </header>

      {/* 메모 선택 드롭다운 */}
      <MemoDropdown
        memos={dialogueData}
        currentMemo={currentMemo}
        onSelect={id => { setCurrentMemo(id); setIsStampMode(false); setStampIndex(0) }}
      />

      {/* 오디오 플레이어 */}
      <div className="memo-players">
        <div className={`memo-player-card ${activePlayer === 'en' ? 'active' : ''}`} onClick={() => setActivePlayer('en')}>
          <div className="memo-player-label">🇺🇸 English</div>
          <audio
            key={`en-${currentMemo}`}
            ref={audioEnRef}
            src={`/voices/${encodeURIComponent(`스파르타 memo ${currentMemo}.m4a`)}`}
            controls
            className="memo-audio"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
        <div className={`memo-player-card ${activePlayer === 'ko' ? 'active' : ''}`} onClick={() => setActivePlayer('ko')}>
          <div className="memo-player-label">🇰🇷 한국어 해설</div>
          <audio
            key={`ko-${currentMemo}`}
            ref={audioKoRef}
            src={`/voices/${encodeURIComponent(`스파르타 memo ${currentMemo} 한국어해설.m4a`)}`}
            controls
            className="memo-audio"
          />
        </div>
      </div>

      {/* 컨트롤 바 */}
      <div className="memo-controls">
        <button
          className={`memo-ctrl-btn ${showKorean ? 'active' : ''}`}
          onClick={() => setShowKorean(v => !v)}
        >
          {showKorean ? '한국어 숨기기' : '한국어 보기'}
        </button>

        <div className="memo-speaker-filter">
          <button
            className={`memo-ctrl-btn ${hideSpeaker === null ? 'active' : ''}`}
            onClick={() => setHideSpeaker(null)}
          >전체</button>
          <button
            className={`memo-ctrl-btn ${hideSpeaker === 'A' ? 'active' : ''}`}
            onClick={() => setHideSpeaker(v => v === 'A' ? null : 'A')}
          >A 숨기기</button>
          <button
            className={`memo-ctrl-btn ${hideSpeaker === 'B' ? 'active' : ''}`}
            onClick={() => setHideSpeaker(v => v === 'B' ? null : 'B')}
          >B 숨기기</button>
        </div>

        {hasLines && (
          <>
            {!isStampMode ? (
              <button
                className="memo-ctrl-btn stamp-btn"
                onClick={() => { setIsStampMode(true); setStampIndex(0) }}
                title="음악 재생 후 스페이스바로 각 줄에 타임스탬프 찍기"
              >
                ⏱ 타임스탬프 {allStamped ? '재설정' : `설정 (${stampedCount}/${memo.lines.length})`}
              </button>
            ) : (
              <button
                className="memo-ctrl-btn stamp-btn active"
                onClick={() => { setIsStampMode(false); setStampIndex(0) }}
              >
                ⏹ 중단
              </button>
            )}

            {stampedCount > 0 && (
              <button className="memo-ctrl-btn danger-btn" onClick={handleClearTimestamps}>
                타임스탬프 초기화
              </button>
            )}
          </>
        )}
      </div>

      {/* 스탬프 모드 안내 */}
      {isStampMode && hasLines && (
        <div className="stamp-mode-banner">
          <strong>⏱ 타임스탬프 설정 모드</strong>
          <span>영어 오디오 재생 후, 각 줄이 들릴 때 <kbd>스페이스바</kbd> 또는 아래 버튼을 눌러 타임스탬프를 찍으세요.</span>
          <div className="stamp-progress">
            다음 줄: <strong>{stampIndex + 1}/{memo.lines.length}</strong> — &ldquo;{memo.lines[stampIndex]?.en}&rdquo;
          </div>
          <button className="action-next-btn primary" onClick={handleStamp}>
            ▶ 지금 찍기 (스페이스바)
          </button>
        </div>
      )}

      {/* 대화문 스크립트 */}
      <div className="memo-script" ref={scriptRef}>
        {!hasLines ? (
          <div className="memo-empty">
            <p>📝 Memo {currentMemo}의 대화문이 아직 없습니다.</p>
            <p className="memo-empty-hint">
              <code>webapp/src/dialogueData.js</code>에서 id {currentMemo}의 <code>lines</code> 배열을 채워주세요.
            </p>
            <pre className="memo-empty-example">{`// 예시:
{ speaker: 'A', en: 'Hello!', ko: '안녕!' },
{ speaker: 'B', en: 'Hi there!', ko: '거기 안녕!' },`}</pre>
          </div>
        ) : (
          memo.lines.map((line, i) => {
            const isActive = i === activeLineIndex
            const isHidden = hideSpeaker === line.speaker
            const hasTimestamp = memoTs[i] != null
            const isNextStamp = isStampMode && i === stampIndex

            return (
              <div
                key={i}
                ref={isActive ? activeLineRef : null}
                className={[
                  'memo-line',
                  isActive ? 'memo-line-active' : '',
                  isHidden ? 'memo-line-hidden' : '',
                  hasTimestamp ? 'memo-line-clickable' : '',
                  isNextStamp ? 'memo-line-next-stamp' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => handleLineClick(i)}
              >
                <div className="memo-line-header">
                  <span className={`memo-speaker memo-speaker-${line.speaker?.toLowerCase()}`}>
                    {line.speaker}
                  </span>
                  {hasTimestamp && (
                    <span className="memo-timestamp">
                      {formatTime(memoTs[i])}
                    </span>
                  )}
                  {isNextStamp && <span className="memo-stamp-indicator">← 다음 스탬프</span>}
                </div>

                {isHidden ? (
                  <div className="memo-line-masked">클릭하거나 가려진 내용을 말해보세요</div>
                ) : (
                  <>
                    <div className="memo-line-en">{line.en}</div>
                    {showKorean && line.ko && (
                      <div className="memo-line-ko">{line.ko}</div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function MemoDropdown({ memos, currentMemo, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = memos.find(d => d.id === currentMemo)

  useEffect(() => {
    const handleClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="mdd-wrap" ref={ref}>
      <button className="mdd-trigger" onClick={() => setOpen(v => !v)}>
        <span className="mdd-trigger-left">
          <span className="mdd-num">{current.id}</span>
          <span className="mdd-trigger-title">{current.title}</span>
          <span className={`mdd-badge mdd-badge-${current.type}`}>
            {current.type === 'dialogue' ? '대화' : '독백'}
          </span>
        </span>
        <svg className={`mdd-chevron ${open ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>

      {open && (
        <ul className="mdd-list">
          {memos.map(d => (
            <li key={d.id}>
              <button
                className={`mdd-item ${d.id === currentMemo ? 'active' : ''}`}
                onClick={() => { onSelect(d.id); setOpen(false) }}
              >
                <span className="mdd-num">{d.id}</span>
                <span className="mdd-item-title">{d.title}</span>
                <span className={`mdd-badge mdd-badge-${d.type}`}>
                  {d.type === 'dialogue' ? '대화' : '독백'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatTime(seconds) {
  if (seconds == null) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
