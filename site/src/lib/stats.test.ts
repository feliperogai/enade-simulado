import { describe, expect, it } from 'vitest'
import { performanceMessage, summarize } from './stats'
import type { Attempt } from './storage'
import type { ExamVersion } from './types'

function version(id: string, year: number): ExamVersion {
  return {
    id, year, course: 'Sistemas de Informação', booklet: 'x',
    questions: [1, 2, 3, 4].map((n) => ({ n, section: 'CE', answer: 'A', image: '', width: 1, height: 1 })),
  }
}

const versions = [version('a', 2017), version('b', 2019), version('c', 2021), version('d', 2021)]

describe('summarize', () => {
  it('sem tentativas', () => {
    expect(summarize(versions, () => ({ answers: {} }))).toEqual({
      finished: 0, inProgress: 0, average: null, best: null, resume: null, resumeQuestion: null,
    })
  })

  it('média, melhor e prova para continuar', () => {
    const attempts: Record<string, Attempt> = {
      a: { answers: { 1: 'A', 2: 'A', 3: 'B' }, finishedAt: '2026-10-10T10:00:00Z' }, // 2/4 = 50%
      b: { answers: { 1: 'A', 2: 'A', 3: 'A', 4: 'A' }, finishedAt: '2026-10-11T10:00:00Z' }, // 100%
      c: { answers: { 1: 'B' }, updatedAt: '2026-10-12T09:00:00Z' },
      d: { answers: { 2: 'C' }, updatedAt: '2026-10-13T09:00:00Z' },
    }
    const s = summarize(versions, (id) => attempts[id])
    expect(s.finished).toBe(2)
    expect(s.inProgress).toBe(2)
    expect(s.average).toBe(75)
    expect(s.best).toEqual({ id: 'b', percent: 100 })
    expect(s.resume?.id).toBe('d') // a mais recente em andamento
  })

  it('em andamento sem data ainda pode ser retomada', () => {
    const s = summarize(versions, (id): Attempt => (id === 'c' ? { answers: { 1: 'A' } } : { answers: {} }))
    expect(s.resume?.id).toBe('c')
  })
})

describe('performanceMessage', () => {
  it.each([
    [100, 'Excelente!'],
    [80, 'Excelente!'],
    [79, 'Muito bem!'],
    [60, 'Muito bem!'],
    [59, 'Bom caminho'],
    [40, 'Bom caminho'],
    [39, 'Continue treinando'],
    [0, 'Continue treinando'],
  ])('%i%% → %s', (percent, title) => {
    expect(performanceMessage(percent).title).toBe(title)
  })
})

describe('summarize · onde parou', () => {
  it('usa a última questão vista', () => {
    const s = summarize(versions, (id): Attempt => (id === 'c' ? { answers: { 1: 'A' }, lastQuestion: 3 } : { answers: {} }))
    expect(s.resume?.id).toBe('c')
    expect(s.resumeQuestion).toBe(3)
  })

  it('sem registro, aponta a primeira em branco', () => {
    const s = summarize(versions, (id): Attempt => (id === 'c' ? { answers: { 1: 'A', 2: 'B' } } : { answers: {} }))
    expect(s.resumeQuestion).toBe(3)
  })

  it('nada em andamento', () => {
    expect(summarize(versions, () => ({ answers: {} })).resumeQuestion).toBeNull()
  })
})
