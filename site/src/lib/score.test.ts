import { describe, expect, it } from 'vitest'
import { score } from './score'
import type { Answers, Letter, Question, Section } from './types'

function q(n: number, answer: Letter | null, section: Section = 'CE'): Question {
  return { n, section, answer, image: `q/x/${n}.webp`, width: 800, height: 600 }
}

describe('score', () => {
  it('todas certas', () => {
    const qs = [q(1, 'A'), q(2, 'B'), q(3, 'C')]
    const r = score(qs, { 1: 'A', 2: 'B', 3: 'C' })
    expect(r).toMatchObject({ correct: 3, wrong: 0, blank: 0, total: 3, percent: 100 })
    expect(r.perQuestion.map((p) => p.status)).toEqual(['correct', 'correct', 'correct'])
  })

  it('anulada fora do total, mesmo respondida', () => {
    const qs = Array.from({ length: 35 }, (_, i) => q(i + 1, i === 9 ? null : 'A'))
    const answers: Answers = {}
    for (const x of qs) answers[x.n] = 'A'
    const r = score(qs, answers)
    expect(r.total).toBe(34)
    expect(r.annulled).toBe(1)
    expect(r.correct).toBe(34)
    expect(r.perQuestion[9]).toMatchObject({ n: 10, given: 'A', expected: null, status: 'annulled' })
  })

  it('branco não é erro', () => {
    const r = score([q(1, 'A'), q(2, 'B')], { 1: 'A' })
    expect(r).toMatchObject({ correct: 1, wrong: 0, blank: 1, total: 2, percent: 50 })
    expect(r.perQuestion[1]).toMatchObject({ given: null, status: 'blank' })
  })

  it('erro conta como erro', () => {
    const r = score([q(1, 'A')], { 1: 'E' })
    expect(r).toMatchObject({ correct: 0, wrong: 1, blank: 0, percent: 0 })
  })

  it('por seção, sem anuladas', () => {
    const qs = [q(1, 'A', 'FG'), q(2, 'B', 'FG'), q(3, 'C'), q(4, 'D'), q(5, null)]
    const r = score(qs, { 1: 'A', 2: 'A', 3: 'C', 4: 'D', 5: 'E' })
    expect(r.bySection.FG).toEqual({ correct: 1, total: 2 })
    expect(r.bySection.CE).toEqual({ correct: 2, total: 2 })
  })

  it('arredonda o percentual', () => {
    const qs = Array.from({ length: 33 }, (_, i) => q(i + 1, 'A'))
    const answers: Answers = {}
    qs.slice(0, 28).forEach((x) => (answers[x.n] = 'A'))
    expect(score(qs, answers).percent).toBe(85)
  })

  it('total zero dá 0%', () => {
    const r = score([q(1, null), q(2, null)], { 1: 'A' })
    expect(r).toMatchObject({ total: 0, percent: 0, annulled: 2 })
  })
})
