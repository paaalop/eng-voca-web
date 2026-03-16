export default {
  id: 'sparta',
  title: 'Sparta VOCA',
  weeks: [1, 2, 3, 4, 5, 6, 7],
  days: ['화', '수', '목'],
  getAudioSrc: (memoId) => `/voices/${encodeURIComponent(`스파르타 memo ${memoId}.m4a`)}`,
  getAudioKoSrc: (memoId) => `/voices/${encodeURIComponent(`스파르타 memo ${memoId} 한국어해설.m4a`)}`,
}
