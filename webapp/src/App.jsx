import React, { useState, useEffect, useMemo } from 'react';
import { vocabularyData } from './data';
import { activeCourse } from './courses/index.js';
import MemorizationPage from './MemorizationPage';
import './index.css';

function App() {
  const [page, setPage] = useState('voca'); // 'voca' | 'memo'
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState('화');
  const [currentStep, setCurrentStep] = useState(1);

  const { weeks, days, title } = activeCourse.meta;

  const filteredWords = useMemo(() =>
    vocabularyData.filter(v => v.week === currentWeek && v.day === currentDay),
    [currentWeek, currentDay]);

  // If week/day changes, reset to step 1
  useEffect(() => {
    setCurrentStep(1);
  }, [currentWeek, currentDay]);

  if (page === 'memo') {
    return (
      <>
        <PageTabBar page={page} setPage={setPage} />
        <MemorizationPage />
      </>
    );
  }

  return (
    <>
      <PageTabBar page={page} setPage={setPage} />
      <div className="container">
        <header className="header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="title">{title}</h1>
        </header>

        <div className="nav-container">
          {/* 주차 네비게이션 */}
          <div className="nav-row">
            <span className="nav-label">Week</span>
            {weeks.map(w => (
              <button
                key={w}
                className={`nav-btn ${currentWeek === w ? 'active' : ''}`}
                onClick={() => setCurrentWeek(w)}
              >
                {w}
              </button>
            ))}
          </div>

          {/* 요일 네비게이션 */}
          <div className="nav-row" style={{ borderBottom: 'none' }}>
            <span className="nav-label">Day</span>
            {days.map(d => (
              <button
                key={d}
                className={`nav-btn ${currentDay === d ? 'active' : ''}`}
                onClick={() => setCurrentDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 3단계 스텝 네비게이션 */}
        <div className="step-container">
          <button
            className={`step-btn ${currentStep === 1 ? 'active' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="step-num">Step 1</div>
            <div className="step-title">암기 카드</div>
          </button>
          <button
            className={`step-btn ${currentStep === 2 ? 'active' : ''}`}
            onClick={() => setCurrentStep(2)}
          >
            <div className="step-num">Step 2</div>
            <div className="step-title">예문 빈칸</div>
          </button>
          <button
            className={`step-btn ${currentStep === 3 ? 'active' : ''}`}
            onClick={() => setCurrentStep(3)}
          >
            <div className="step-num">Step 3</div>
            <div className="step-title">스피드 인출</div>
          </button>
        </div>

        {filteredWords.length === 0 ? (
          <div className="empty-state">해당 요일의 단어 데이터가 없습니다.</div>
        ) : (
          <>
            {currentStep === 1 && <FlashcardView words={filteredWords} onComplete={() => setCurrentStep(2)} />}
            {currentStep === 2 && <ContextQuizView words={filteredWords} onComplete={() => setCurrentStep(3)} />}
            {currentStep === 3 && <SpeedQuizView words={filteredWords} />}
          </>
        )}
      </div>
    </>
  );
}

function PageTabBar({ page, setPage }) {
  return (
    <div className="page-tab-bar">
      <button
        className={`page-tab ${page === 'voca' ? 'active' : ''}`}
        onClick={() => setPage('voca')}
      >
        단어 학습
      </button>
      <button
        className={`page-tab ${page === 'memo' ? 'active' : ''}`}
        onClick={() => setPage('memo')}
      >
        대화문 암기
      </button>
    </div>
  );
}

// === [Step 1] FlashcardView ===
function FlashcardView({ words, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [words]);

  const currentWord = words[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentWord) return null;

  const isLast = currentIndex === words.length - 1;

  return (
    <div className="flashcard-container">
      <div
        className="flashcard"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className="word">{currentWord.word}</div>

        {isFlipped && (
          <>
            <div className="meaning">{currentWord.meaning}</div>
            <div className="example-group">
              {currentWord.ex_en && <div className="example">{currentWord.ex_en}</div>}
              {currentWord.ex_ko && <div className="example-korean">{currentWord.ex_ko}</div>}
            </div>
          </>
        )}

        {!isFlipped && (
          <div className="card-hint">클릭하여 뜻 확인</div>
        )}
      </div>

      <div className="controls">
        <button
          className="action-btn"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          이전 단어
        </button>

        <span className="progress-text">
          {currentIndex + 1} / {words.length}
        </span>

        {isLast ? (
          <button className="action-next-btn primary" onClick={onComplete}>
            2단계로 이동
          </button>
        ) : (
          <button className="action-next-btn" onClick={handleNext}>
            다음 단어
          </button>
        )}
      </div>
    </div>
  );
}

// === [Step 2] ContextQuizView ===
function ContextQuizView({ words, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('front'); // 'front' (힌트선택, 한글), 'back' (영어공개, 자가채점)
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ known: 0, unknown: 0 });
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (currentIndex >= words.length) {
      setIsFinished(true);
      return;
    }
    setPhase('front');
    setShowHint(false);
  }, [currentIndex, words]);

  useEffect(() => {
    setCurrentIndex(0);
    setScore({ known: 0, unknown: 0 });
    setIsFinished(false);
  }, [words]);

  const handleSelfGrade = (isKnown) => {
    if (isKnown) {
      setScore(s => ({ ...s, known: s.known + 1 }));
    } else {
      setScore(s => ({ ...s, unknown: s.unknown + 1 }));
    }
    // 짧은 딜레이 후 다음 문제로
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 300);
  };

  if (isFinished) {
    return (
      <div className="quiz-result">
        <h3>2단계 완료!</h3>
        <p>총 {words.length}개의 문맥 중 <strong>{score.known}개</strong>를 완벽히 인출했습니다.</p>
        <div className="result-actions">
          <button className="action-btn" onClick={() => { setCurrentIndex(0); setScore({ known: 0, unknown: 0 }); setIsFinished(false); }}>
            다시 풀기
          </button>
          <button className="action-next-btn primary" onClick={onComplete}>
            3단계로 이동
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  if (!currentWord) return null;

  // 영어 예문 내 단어 하이라이트 처리
  let displaySentence = "예문이 없습니다.";
  if (currentWord.ex_en) {
    const escapedWord = currentWord.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 특수문자 이스케이프
    const regex = new RegExp(`(${escapedWord})`, 'gi');

    if (regex.test(currentWord.ex_en)) {
      displaySentence = currentWord.ex_en.replace(regex, '<span class="highlight">$1</span>');
    } else {
      displaySentence = currentWord.ex_en + ` <span class="highlight">(${currentWord.word})</span>`;
    }
  }

  return (
    <div className="quiz-container context-quiz">
      <div className="context-quiz-header">
        <h3 className="context-quiz-title">문맥 유추</h3>
        <div className="progress-text">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      <div className="flashcard context-quiz-card">
        {/* [1단계] 한글 예문 (항상 노출) */}
        <div className="context-korean-text">
          {currentWord.ex_ko || currentWord.meaning}
        </div>

        {/* 힌트 토글 및 영어 문장 영역 */}
        {phase === 'front' ? (
          <div className="hint-container">
            {showHint ? (
              <div className="hint-box">
                <div className="hint-word">{currentWord.word}</div>
                <div className="hint-meaning">{currentWord.meaning}</div>
              </div>
            ) : (
              <button
                className="action-btn hint-button"
                onClick={() => setShowHint(true)}
              >
                단어 힌트 보기
              </button>
            )}

            <button
              className="action-next-btn primary reveal-button"
              onClick={() => setPhase('back')}
            >
              정답 확인 (영어 예문 보기)
            </button>
          </div>
        ) : (
          <div className="grading-container">
            <div
              className="quiz-question-en grading-question"
              dangerouslySetInnerHTML={{ __html: displaySentence }}
            />

            {/* 자가채점 버튼 */}
            <div className="grading-buttons">
              <button
                className="action-btn grade-wrong"
                onClick={() => handleSelfGrade(false)}
              >
                몰랐다
              </button>
              <button
                className="action-next-btn primary grade-correct"
                onClick={() => handleSelfGrade(true)}
              >
                알았다
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 점수 누적 판 */}
      <div className="score-display">
        <span><strong>{score.known}</strong></span>
        <span><strong>{score.unknown}</strong></span>
      </div>
    </div>
  );
}

// === [Step 3] SpeedQuizView ===
function SpeedQuizView({ words }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(100); // Percentage for progress bar

  const TIME_LIMIT = 5000; // 5 seconds per question for speed recall

  useEffect(() => {
    if (currentIndex >= words.length) {
      setIsFinished(true);
      return;
    }

    const currentWord = words[currentIndex];
    const incorrectWords = words.filter(w => w.id !== currentWord.id);
    const shuffledIncorrect = [...incorrectWords].sort(() => 0.5 - Math.random()).slice(0, 3);

    const allOptions = [currentWord, ...shuffledIncorrect];
    const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());

    setOptions(shuffledOptions);
    setSelectedOption(null);
    setTimeLeft(100);
  }, [currentIndex, words]);

  useEffect(() => {
    setCurrentIndex(0);
    setScore(0);
    setIsFinished(false);
  }, [words]);

  // Timer effect
  useEffect(() => {
    if (isFinished || selectedOption || options.length === 0) return;

    const intervalTime = 30; // ms
    const step = (intervalTime / TIME_LIMIT) * 100;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, isFinished, selectedOption, options]);

  const handleTimeOut = () => {
    // If not selected, mark as wrong
    setSelectedOption({ id: -1 }); // Dummy wrong option
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 1200);
  };

  const handleOptionClick = (option) => {
    if (selectedOption) return;

    setSelectedOption(option);
    if (option.id === words[currentIndex].id) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 1200);
  };

  if (isFinished) {
    return (
      <div className="quiz-result">
        <h3>스피드 인출 완료!</h3>
        <p>총 {words.length}개의 단어 중 {score}개를 즉시 기억해냈습니다.</p>
        <button
          className="action-next-btn primary retry-button"
          onClick={() => { setCurrentIndex(0); setScore(0); setIsFinished(false); }}
        >
          다시 도전하기
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  if (!currentWord || options.length === 0) return null;

  return (
    <div className="quiz-container speed-quiz">
      <div className="timer-bar-container">
        <div
          className="timer-bar"
          style={{
            width: `${timeLeft}%`,
            backgroundColor: timeLeft > 30 ? 'var(--text-primary)' : '#e74c3c'
          }}
        ></div>
      </div>

      <div className="quiz-header speed-quiz-header">
        <div className="quiz-question">{currentWord.meaning}</div>
        <div className="progress-text speed-progress">{currentIndex + 1} / {words.length}</div>
      </div>

      <div className="quiz-options speed-options">
        {options.map((opt, idx) => {
          let className = "quiz-option speed-option";
          if (selectedOption) {
            if (opt.id === currentWord.id) className += " correct";
            else if (selectedOption.id === opt.id) className += " incorrect";
          }

          return (
            <button
              key={idx}
              className={className}
              onClick={() => handleOptionClick(opt)}
              disabled={!!selectedOption}
            >
              {opt.word}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
