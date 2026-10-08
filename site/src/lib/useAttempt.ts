import { useCallback, useState } from 'react'
import { createAttemptController } from './attempt'
import { store } from './storage'
import type { ExamVersion, Letter } from './types'

/**
 * Estado da tentativa de uma versão, gravado na hora a cada mudança. Quem usa
 * deve remontar o componente ao trocar de versão (key={version.id}).
 */
export function useAttempt(version: ExamVersion) {
  const [controller] = useState(() => createAttemptController(store, version))
  const [attempt, setAttempt] = useState(controller.get)

  const setAnswer = useCallback(
    (n: number, letter: Letter | null) => setAttempt(controller.setAnswer(n, letter)),
    [controller],
  )
  const finish = useCallback(() => setAttempt(controller.finish()), [controller])
  const reset = useCallback(() => setAttempt(controller.reset()), [controller])
  /** Estado mais recente, mesmo antes de o React redesenhar (para eventos em sequência). */
  const latest = controller.get
  const visit = useCallback((n: number) => void controller.visit(n), [controller])

  return { attempt, setAnswer, finish, reset, latest, visit }
}
