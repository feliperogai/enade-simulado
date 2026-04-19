import { useCallback, useState } from 'react'
import { store, type Attempt } from './storage'
import type { Answers, ExamVersion, Letter } from './types'

/** Remove respostas de questões que não existem nesta versão (dados antigos). */
function forVersion(attempt: Attempt, version: ExamVersion): Attempt {
  const numbers = new Set(version.questions.map((q) => q.n))
  const answers: Answers = {}
  for (const [n, letter] of Object.entries(attempt.answers)) {
    if (numbers.has(Number(n))) answers[Number(n)] = letter
  }
  return attempt.finishedAt ? { answers, finishedAt: attempt.finishedAt } : { answers }
}

/**
 * Estado da tentativa de uma versão, gravado a cada mudança. Quem usa deve
 * remontar o componente ao trocar de versão (key={version.id}).
 */
export function useAttempt(version: ExamVersion) {
  const [attempt, setAttempt] = useState<Attempt>(() => forVersion(store.load(version.id), version))

  const update = useCallback(
    (change: (prev: Attempt) => Attempt) => {
      setAttempt((prev) => {
        const next = change(prev)
        store.save(version.id, next)
        return next
      })
    },
    [version.id],
  )

  const setAnswer = useCallback(
    (n: number, letter: Letter | null) =>
      update((prev) => {
        const answers = { ...prev.answers }
        if (letter) answers[n] = letter
        else delete answers[n]
        return { ...prev, answers }
      }),
    [update],
  )

  const finish = useCallback(
    () => update((prev) => ({ ...prev, finishedAt: new Date().toISOString() })),
    [update],
  )

  const reset = useCallback(() => {
    store.clear(version.id)
    setAttempt({ answers: {} })
  }, [version.id])

  return { attempt, setAnswer, finish, reset }
}
