import { describe, expect, it } from 'vitest'
import { blankNumbers, resolveQuestionIndex } from './nav'
import type { Question } from './types'

const qs: Question[] = [1, 2, 3, 12, 35].map((n) => ({
  n, section: 'CE', answer: 'A', image: '', width: 1, height: 1,
}))

describe('resolveQuestionIndex', () => {
  it('acha a questão pelo número', () => {
    expect(resolveQuestionIndex(qs, '12')).toBe(3)
    expect(resolveQuestionIndex(qs, '35')).toBe(4)
  })

  it.each(['999', 'abc', '', '1.5', '-1', null])('valor inválido %s abre a primeira', (q) => {
    expect(resolveQuestionIndex(qs, q)).toBe(0)
  })
})

describe('blankNumbers', () => {
  it('lista os números sem resposta, em ordem', () => {
    expect(blankNumbers(qs, { 2: 'B', 35: 'C' })).toEqual([1, 3, 12])
  })
})
