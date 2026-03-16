#!/usr/bin/env python3
"""
스파르타 대화문 타임스탬프 자동 생성기
Whisper를 사용해 각 음성파일의 문장별 시작 시간을 추출합니다.

사용법:
  pip install openai-whisper
  python generate_timestamps.py

출력:
  webapp/public/timestamps.json  ← 앱이 자동으로 로드함
"""

import json
import re
import sys
from pathlib import Path

VOICES_DIR = Path(__file__).parent / "sources" / "voices"
OUTPUT_FILE = Path(__file__).parent / "webapp" / "public" / "timestamps.json"
WHISPER_MODEL = "base"  # tiny(빠름/덜정확) | base | small | medium(느림/정확)


def normalize(text: str) -> str:
    """구두점 제거, 소문자, 여분 공백 제거"""
    return re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()


def find_timestamps(words: list[dict], sentences: list[str]) -> list[float]:
    """
    Whisper 단어 목록에서 각 문장의 시작 시간을 찾아 반환.

    words   : [{"word": str, "start": float, "end": float}, ...]
    sentences: 우리 문장 목록
    returns : 각 문장의 시작 시간 (초)
    """
    timestamps = []
    word_idx = 0

    for sent in sentences:
        sent_tokens = normalize(sent)
        if not sent_tokens or word_idx >= len(words):
            fallback = words[word_idx]["start"] if word_idx < len(words) else 0.0
            timestamps.append(round(fallback, 2))
            continue

        first = sent_tokens[0]
        found = False

        # 현재 위치부터 최대 40단어 앞까지 첫 단어 탐색
        for i in range(word_idx, min(word_idx + 40, len(words))):
            if normalize(words[i]["word"]) and normalize(words[i]["word"])[0] == first:
                timestamps.append(round(words[i]["start"], 2))
                # 다음 문장 검색 시작점: 현재 문장 단어 수만큼 앞으로
                word_idx = i + max(1, len(sent_tokens) - 1)
                found = True
                break

        if not found:
            # 못 찾으면 현재 위치 시간으로 fallback
            ts = words[min(word_idx, len(words) - 1)]["start"]
            timestamps.append(round(ts, 2))
            word_idx = min(word_idx + 1, len(words) - 1)

    return timestamps


def main():
    # ── Whisper 설치 확인 ────────────────────────────
    try:
        import whisper
    except ImportError:
        print("❌ openai-whisper 가 설치되지 않았습니다.")
        print("   아래 명령어를 먼저 실행하세요:\n")
        print("   pip install openai-whisper\n")
        sys.exit(1)

    # ── 문장 데이터 로드 ─────────────────────────────
    try:
        from dialogue_lines import DIALOGUE_LINES
    except ImportError:
        print("❌ dialogue_lines.py 를 찾을 수 없습니다.")
        print("   generate_timestamps.py 와 같은 폴더에 있어야 합니다.")
        sys.exit(1)

    # ── 모델 로드 ────────────────────────────────────
    print(f"🔄  Whisper '{WHISPER_MODEL}' 모델 로딩 중... (첫 실행 시 자동 다운로드)\n")
    model = whisper.load_model(WHISPER_MODEL)
    print("✅  모델 로딩 완료\n")

    all_timestamps: dict[str, list[float]] = {}

    for memo_id in range(1, 21):
        audio_path = VOICES_DIR / f"스파르타 memo {memo_id}.m4a"
        sentences = DIALOGUE_LINES.get(memo_id, [])

        if not audio_path.exists():
            print(f"⚠️   Memo {memo_id:2d}: 파일 없음 — {audio_path.name}")
            continue
        if not sentences:
            print(f"⚠️   Memo {memo_id:2d}: 문장 데이터 없음")
            continue

        print(f"🎙   Memo {memo_id:2d}  ({len(sentences)}문장)  {audio_path.name}")

        result = model.transcribe(
            str(audio_path),
            language="en",
            word_timestamps=True,
            fp16=False,  # CPU 환경 호환
        )

        # 세그먼트 → 단어 목록으로 평탄화
        words: list[dict] = []
        for seg in result.get("segments", []):
            for w in seg.get("words", []):
                stripped = w["word"].strip()
                if stripped:
                    words.append({
                        "word": stripped,
                        "start": float(w["start"]),
                        "end": float(w["end"]),
                    })

        if not words:
            print(f"   ⚠️  단어 정보 없음 (word_timestamps 미지원 모델?)")
            continue

        ts_list = find_timestamps(words, sentences)
        all_timestamps[str(memo_id)] = ts_list

        for i, (sent, ts) in enumerate(zip(sentences, ts_list)):
            preview = sent[:55] + ("…" if len(sent) > 55 else "")
            print(f"   [{ts:6.2f}s]  {preview}")
        print()

    # ── 저장 ─────────────────────────────────────────
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_timestamps, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in all_timestamps.values())
    print(f"✅  완료!  {len(all_timestamps)}개 파일 / {total}개 타임스탬프")
    print(f"   저장 위치: {OUTPUT_FILE}")
    print("\n   앱을 새로고침하면 타임스탬프가 자동으로 적용됩니다.")


if __name__ == "__main__":
    main()
