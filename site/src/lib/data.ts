import { useCallback, useEffect, useState } from 'react'
import type { ExamsData, Question } from './types'

const EXAMS_URL = './data/exams.json'

let cache: Promise<ExamsData> | null = null

export function loadExams(fetchFn: typeof fetch = fetch): Promise<ExamsData> {
  if (!cache) {
    cache = fetchFn(EXAMS_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${EXAMS_URL}`)
        return res.json() as Promise<ExamsData>
      })
      .catch((err: unknown) => {
        cache = null // permite tentar de novo
        throw err
      })
  }
  return cache
}

export function resetExamsCache(): void {
  cache = null
}

export function imageUrl(q: Pick<Question, 'image'>): string {
  return `./data/${q.image}`
}

export type ExamsState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: ExamsData }

export function useExams(): ExamsState {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ExamsState>({ status: 'loading' })
  const retry = useCallback(() => {
    resetExamsCache()
    setState({ status: 'loading' })
    setAttempt((a) => a + 1)
  }, [])

  useEffect(() => {
    let alive = true
    loadExams().then(
      (data) => alive && setState({ status: 'ready', data }),
      () => alive && setState({ status: 'error', retry }),
    )
    return () => {
      alive = false
    }
  }, [attempt, retry])

  return state
}
