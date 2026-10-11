// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ExamsData } from '../lib/types'
import { Exam } from './Exam'

const data: ExamsData = {
  generatedAt: '2026-10-14T00:00:00Z',
  versions: [
    {
      id: 'v',
      year: 2017,
      course: 'Curso',
      booklet: 'Curso',
      questions: [1, 2, 3].map((n) => ({ n, section: 'CE', answer: 'A', image: `q/v/${n}.webp`, width: 800, height: 600 })),
    },
  ],
}

function press(key: string) {
  // Fora de act(): o React ainda não reagiu entre uma tecla e outra,
  // como acontece com digitação rápida.
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function saved() {
  return JSON.parse(localStorage.getItem('enade:v1:v') ?? '{"answers":{}}').answers
}

describe('teclado na tela da prova', () => {
  beforeEach(() => {
    localStorage.clear()
    window.scrollTo = () => {}
    Element.prototype.scrollIntoView = () => {}
    render(
      <MemoryRouter initialEntries={['/prova/v?q=1']}>
        <Routes>
          <Route path="/prova/:id" element={<Exam data={data} />} />
        </Routes>
      </MemoryRouter>,
    )
  })

  afterEach(cleanup)

  it('letra logo depois de → vai para a questão seguinte', async () => {
    press('ArrowRight')
    press('c')
    await act(async () => {})
    expect(saved()).toEqual({ 2: 'C' })
  })

  it('sequência rápida distribui as respostas pelas questões', async () => {
    press('a')
    press('ArrowRight')
    press('b')
    press('ArrowRight')
    press('e')
    press('ArrowLeft')
    press('d')
    await act(async () => {})
    expect(saved()).toEqual({ 1: 'A', 2: 'D', 3: 'E' })
  })
})
