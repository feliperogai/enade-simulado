import type { AppStore, Attempt } from './storage'
import type { Answers, ExamVersion, Letter } from './types'

export interface AttemptController {
  get(): Attempt
  setAnswer(n: number, letter: Letter | null): Attempt
  /** registra a questão aberta (para "você parou na questão N") */
  visit(n: number): Attempt
  finish(now?: Date): Attempt
  reset(): Attempt
}

/** Remove respostas de questões que não existem nesta versão (dados antigos). */
function forVersion(attempt: Attempt, version: ExamVersion): Attempt {
  const numbers = new Set(version.questions.map((q) => q.n))
  const answers: Answers = {}
  for (const [n, letter] of Object.entries(attempt.answers)) {
    if (numbers.has(Number(n))) answers[Number(n)] = letter
  }
  return { ...attempt, answers }
}

/**
 * Tentativa de uma versão. Cada mudança é gravada na hora, de forma síncrona:
 * "Finalizar" seguido de navegação não pode depender de um re-render.
 */
export function createAttemptController(
  store: AppStore,
  version: ExamVersion,
  clock: () => Date = () => new Date(),
): AttemptController {
  let current = forVersion(store.load(version.id), version)

  function commit(next: Attempt): Attempt {
    current = { ...next, updatedAt: clock().toISOString() }
    store.save(version.id, current)
    return current
  }

  return {
    get: () => current,
    setAnswer(n, letter) {
      const answers = { ...current.answers }
      if (letter) answers[n] = letter
      else delete answers[n]
      return commit({ ...current, answers })
    },
    visit: (n) => (current.lastQuestion === n ? current : commit({ ...current, lastQuestion: n })),
    finish: (now = clock()) => commit({ ...current, finishedAt: now.toISOString() }),
    reset() {
      store.clear(version.id)
      current = { answers: {} }
      return current
    },
  }
}
