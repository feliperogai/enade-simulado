import type { Answers, Letter, Question, Section } from './types'

export type QuestionStatus = 'correct' | 'wrong' | 'blank' | 'annulled'

export interface QuestionResult {
  n: number
  section: Section
  given: Letter | null
  expected: Letter | null
  status: QuestionStatus
}

export interface SectionScore {
  correct: number
  total: number
}

export interface ScoreResult {
  /** questões que contam (sem as anuladas) */
  total: number
  correct: number
  wrong: number
  blank: number
  annulled: number
  percent: number
  bySection: Record<Section, SectionScore>
  perQuestion: QuestionResult[]
}

export function score(questions: Question[], answers: Answers): ScoreResult {
  const bySection: Record<Section, SectionScore> = {
    FG: { correct: 0, total: 0 },
    CE: { correct: 0, total: 0 },
  }
  const counts: Record<QuestionStatus, number> = { correct: 0, wrong: 0, blank: 0, annulled: 0 }

  const perQuestion = questions.map((q): QuestionResult => {
    const given = answers[q.n] ?? null
    let status: QuestionStatus
    if (q.answer === null) status = 'annulled'
    else if (given === null) status = 'blank'
    else status = given === q.answer ? 'correct' : 'wrong'

    counts[status]++
    if (status !== 'annulled') {
      bySection[q.section].total++
      if (status === 'correct') bySection[q.section].correct++
    }
    return { n: q.n, section: q.section, given, expected: q.answer, status }
  })

  const total = questions.length - counts.annulled
  return {
    total,
    correct: counts.correct,
    wrong: counts.wrong,
    blank: counts.blank,
    annulled: counts.annulled,
    percent: total === 0 ? 0 : Math.round((counts.correct / total) * 100),
    bySection,
    perQuestion,
  }
}
