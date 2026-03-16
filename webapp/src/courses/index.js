import spartaMeta from './sparta/meta.js'
import { vocabData as spartaVocab } from './sparta/vocab.js'
import { dialogueData as spartaDialogue } from './sparta/dialogue.js'

const courses = {
  sparta: {
    meta: spartaMeta,
    vocabData: spartaVocab,
    dialogueData: spartaDialogue,
  },
  // 새 커리큘럼 추가 예시:
  // 'new-course': {
  //   meta: newCourseMeta,          // courses/new-course/meta.js
  //   vocabData: newCourseVocab,    // courses/new-course/vocab.js
  //   dialogueData: newCourseDialogue, // courses/new-course/dialogue.js
  // },
}

// ← 이 한 줄만 바꾸면 전체 커리큘럼 교체
export const ACTIVE_COURSE = 'sparta'

export const activeCourse = courses[ACTIVE_COURSE]
