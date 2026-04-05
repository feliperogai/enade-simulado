import type { Answers, Question } from './types'

/** Índice da questão pedida em `?q=<número>`; qualquer valor inválido abre a primeira. */
export function resolveQuestionIndex(questions: Question[], qParam: string | null): number {
  if (!qParam || !/^\d+$/.test(qParam)) return 0
  const n = Number(qParam)
  const index = questions.findIndex((q) => q.n === n)
  return index === -1 ? 0 : index
}

export function blankNumbers(questions: Question[], answers: Answers): number[] {
  return questions.filter((q) => answers[q.n] === undefined).map((q) => q.n)
}
