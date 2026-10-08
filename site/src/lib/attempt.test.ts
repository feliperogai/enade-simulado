import { describe, expect, it } from 'vitest'
import { createAttemptController } from './attempt'
import { createStore } from './storage'
import type { ExamVersion } from './types'

const version: ExamVersion = {
  id: '2017-b',
  year: 2017,
  course: 'Ciência da Computação (Bacharelado)',
  booklet: 'Ciência da Computação (Bacharelado)',
  questions: [1, 2, 3].map((n) => ({ n, section: 'CE', answer: 'A', image: '', width: 1, height: 1 })),
}

describe('createAttemptController', () => {
  it('grava no armazenamento na hora (antes de qualquer re-render)', () => {
    const store = createStore(null)
    const ctrl = createAttemptController(store, version, () => new Date('2026-10-13T12:00:00.000Z'))
    ctrl.setAnswer(1, 'B')
    ctrl.finish()
    expect(store.load('2017-b')).toEqual({
      answers: { 1: 'B' },
      finishedAt: '2026-10-13T12:00:00.000Z',
      updatedAt: '2026-10-13T12:00:00.000Z',
    })
  })

  it('mudanças seguidas se acumulam', () => {
    const ctrl = createAttemptController(createStore(null), version)
    ctrl.setAnswer(1, 'A')
    ctrl.setAnswer(2, 'C')
    expect(ctrl.setAnswer(1, null).answers).toEqual({ 2: 'C' })
  })

  it('ignora respostas salvas de questões que não existem na versão', () => {
    const store = createStore(null)
    store.save('2017-b', { answers: { 1: 'D', 99: 'E' } })
    expect(createAttemptController(store, version).get()).toEqual({ answers: { 1: 'D' } })
  })

  it('reset apaga a tentativa salva', () => {
    const store = createStore(null)
    const ctrl = createAttemptController(store, version)
    ctrl.setAnswer(3, 'E')
    ctrl.finish()
    expect(ctrl.reset()).toEqual({ answers: {} })
    expect(store.load('2017-b')).toEqual({ answers: {} })
  })

  it('marca a hora da última mudança', () => {
    const store = createStore(null)
    const ctrl = createAttemptController(store, version, () => new Date('2026-10-14T08:00:00.000Z'))
    expect(ctrl.setAnswer(1, 'C').updatedAt).toBe('2026-10-14T08:00:00.000Z')
    expect(store.load('2017-b').updatedAt).toBe('2026-10-14T08:00:00.000Z')
  })

  it('visit registra a questão aberta e ela sobrevive às respostas', () => {
    const store = createStore(null)
    const ctrl = createAttemptController(store, version)
    ctrl.visit(3)
    expect(store.load('2017-b').lastQuestion).toBe(3)
    expect(ctrl.setAnswer(1, 'A').lastQuestion).toBe(3)
  })
})
