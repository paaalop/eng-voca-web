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
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [activePlayer, setActivePlayer] = useState('en') // 'en' | 'ko'
  const [timestamps, setTimestamps] = useState(loadTimestamps)

  // timestamps.json 자동 로드
  useEffect(() => {
    fetch('/timestamps.json')
      .then(r => { if (!r.ok) throw new Error('no file'); return r.json() })
      .then(data => {
        setTimestamps(prev => {
          const merged = { ...data }
          const manual = loadTimestamps()
          Object.keys(manual).forEach(k => { merged[k] = manual[k] })
          return merged
        })
      })
      .catch(() => { })
  }, [])

  const audioEnRef = useRef(null)
  const audioKoRef = useRef(null)
  const scriptRef = useRef(null)
  const activeLineRef = useRef(null)

  const memo = dialogueData.find(d => d.id === currentMemo)
  const memoTs = timestamps[currentMemo] || []

  // 현재 재생 중인 줄 계산 (en 오디오 기준)
  const activeLineIndex = useMemo(() => {
    if (activePlayer !== 'en') return -1
    if (memoTs.length === 0) return -1
    for (let i = memoTs.length - 1; i >= 0; i--) {
      if (memoTs[i] != null && currentTime >= memoTs[i]) return i
    }
    return -1
  }, [currentTime, memoTs, activePlayer])

  // 메모 변경 시 초기화
  useEffect(() => {
    setIsStampMode(false)
    setStampIndex(0)
    setCurrentTime(0)
    setDuration(0)
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

  // 활성 플레이어 변경 시 이벤트 바인딩
  useEffect(() => {
    const audio = activePlayer === 'en' ? audioEnRef.current : audioKoRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentMemo, activePlayer])

  // 활성 줄 자동 스크롤
  useEffect(() => {
    if (activeLineRef.current && isPlaying) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeLineIndex, isPlaying])

  // 해설/원문 스왑
  const handleSwapPlayer = useCallback(() => {
    const currentAudio = activePlayer === 'en' ? audioEnRef.current : audioKoRef.current
    if (currentAudio) currentAudio.pause()
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setActivePlayer(p => p === 'en' ? 'ko' : 'en')
  }, [activePlayer])

  // 재생/일시정지
  const handlePlayPause = useCallback(() => {
    const audio = activePlayer === 'en' ? audioEnRef.current : audioKoRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else audio.play()
  }, [isPlaying, activePlayer])

  // 처음으로 돌아가기
  const handleGoToStart = useCallback(() => {
    const audio = activePlayer === 'en' ? audioEnRef.current : audioKoRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrentTime(0)
  }, [activePlayer])

  // 반복 토글
  const handleLoopToggle = useCallback(() => {
    setIsLooping(v => {
      const newVal = !v
      const audio = activePlayer === 'en' ? audioEnRef.current : audioKoRef.current
      if (audio) audio.loop = newVal
      return newVal
    })
  }, [activePlayer])

  // 시크바 조작
  const handleSeek = useCallback((time) => {
    const audio = activePlayer === 'en' ? audioEnRef.current : audioKoRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }, [activePlayer])

  // 줄 클릭 → 오디오 점프 (en 오디오 기준)
  const handleLineClick = useCallback((index) => {
    const t = memoTs[index]
    if (t == null) return
    const enAudio = audioEnRef.current
    if (!enAudio) return

    if (activePlayer !== 'en') {
      const koAudio = audioKoRef.current
      if (koAudio) koAudio.pause()
      setIsPlaying(false)
      setActivePlayer('en')
    }

    enAudio.currentTime = t
    setCurrentTime(t)
    enAudio.play()
  }, [memoTs, activePlayer])

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
    <div className="container" style={{ paddingBottom: '6rem' }}>
      {/* 숨김 오디오 요소 */}
      <audio
        key={`en-${currentMemo}`}
        ref={audioEnRef}
        src={`/voices/${encodeURIComponent(`스파르타 memo ${currentMemo}.m4a`)}`}
        loop={isLooping && activePlayer === 'en'}
        preload="metadata"
      />
      <audio
        key={`ko-${currentMemo}`}
        ref={audioKoRef}
        src={`/voices/${encodeURIComponent(`스파르타 memo ${currentMemo} 한국어해설.m4a`)}`}
        loop={isLooping && activePlayer === 'ko'}
        preload="metadata"
      />

      <header className="header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="title">Sparta MEMO</h1>
      </header>

      {/* 메모 선택 드롭다운 */}
      <MemoDropdown
        memos={dialogueData}
        currentMemo={currentMemo}
        onSelect={id => { setCurrentMemo(id); setIsStampMode(false); setStampIndex(0) }}
      />

      {/* 컨트롤 바 */}
      <div className="memo-controls">
        {/* <button
          className={`memo-ctrl-btn ${showKorean ? 'active' : ''}`}
          onClick={() => setShowKorean(v => !v)}
        >
          {showKorean ? '한국어 숨기기' : '한국어 보기'}
        </button> */}

        <div className="memo-speaker-filter">
          <span className="speaker-filter-label">대화표시</span>
          <button
            className={`speaker-dot dot-all ${hideSpeaker === null ? 'dot-active' : ''}`}
            onClick={() => setHideSpeaker(null)}
          >All</button>
          <button
            className={`speaker-dot dot-a ${hideSpeaker === 'B' ? 'dot-active' : ''}`}
            onClick={() => setHideSpeaker(v => v === 'B' ? null : 'B')}
          >A</button>
          <button
            className={`speaker-dot dot-b ${hideSpeaker === 'A' ? 'dot-active' : ''}`}
            onClick={() => setHideSpeaker(v => v === 'A' ? null : 'A')}
          >B</button>
        </div>

      </div>

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

      {/* 하단 오디오 네비게이터 */}
      <AudioNavigator
        activePlayer={activePlayer}
        onSwap={handleSwapPlayer}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onGoToStart={handleGoToStart}
        isLooping={isLooping}
        onLoopToggle={handleLoopToggle}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        hasLines={hasLines}
        isStampMode={isStampMode}
        stampedCount={stampedCount}
        allStamped={allStamped}
        totalLines={memo?.lines?.length ?? 0}
        stampIndex={stampIndex}
        nextLineText={memo?.lines?.[stampIndex]?.en}
        onStampStart={() => { setIsStampMode(true); setStampIndex(0) }}
        onStampStop={() => { setIsStampMode(false); setStampIndex(0) }}
        onStamp={handleStamp}
        onClearTimestamps={handleClearTimestamps}
      />
    </div>
  )
}

function AudioNavigator({ activePlayer, onSwap, isPlaying, onPlayPause, onGoToStart, isLooping, onLoopToggle, currentTime, duration, onSeek, hasLines, isStampMode, stampedCount, allStamped, totalLines, stampIndex, nextLineText, onStampStart, onStampStop, onStamp, onClearTimestamps }) {
  const trackLabel = activePlayer === 'en' ? '원문' : '해설'
  const swapLabel = activePlayer === 'en' ? '해설\n전환' : '원문\n전환'
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`audio-nav ${isStampMode ? 'audio-nav--stamp' : ''}`}>
      {/* 스탬프 모드 행 */}
      {isStampMode && (
        <div className="audio-nav-stamp-row">
          <span className="audio-nav-stamp-progress">⏱ {stampIndex + 1}/{totalLines}</span>
          <span className="audio-nav-stamp-text">{nextLineText}</span>
          <button className="audio-nav-stamp-btn" onClick={onStamp}>찍기</button>
          {stampedCount > 0 && (
            <button className="audio-nav-stamp-clear" onClick={onClearTimestamps}>초기화</button>
          )}
          <button className="audio-nav-stamp-stop" onClick={onStampStop}>✕</button>
        </div>
      )}

      {/* 메인 컨트롤 행 */}
      <div className="audio-nav-main">
        {/* 좌측: 해설/원문 스왑 버튼 */}
        <button
          className="audio-nav-swap"
          onClick={onSwap}
          title={activePlayer === 'en' ? '한국어 해설로 전환' : '영어 원문으로 전환'}
        >
          <span className="audio-nav-swap-label">{swapLabel}</span>
        </button>

        {/* 중앙: 트랙 레이블 + 시크바 */}
        <div className="audio-nav-track">
          <span className="audio-nav-track-label">{trackLabel}</span>
          <div className="audio-nav-seekbar-wrap">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={e => onSeek(parseFloat(e.target.value))}
              className="audio-nav-seekbar"
              style={{ '--progress': `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 우측: 컨트롤 버튼 */}
        <div className="audio-nav-btns">
          <button className="audio-nav-btn" onClick={onGoToStart} title="처음으로 돌아가기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button className="audio-nav-btn audio-nav-playbtn" onClick={onPlayPause} title={isPlaying ? '일시정지' : '재생'}>
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button className={`audio-nav-btn ${isLooping ? 'audio-nav-btn-active' : ''}`} onClick={onLoopToggle} title="반복">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          {/* 타임스탬프 설정 버튼 */}
          {hasLines && !isStampMode && (
            <button
              className="audio-nav-btn"
              onClick={onStampStart}
              title={`타임스탬프 ${allStamped ? '재설정' : `설정 (${stampedCount}/${totalLines})`}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>
          )}
        </div>
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
        <svg className={`mdd-chevron ${open ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
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
