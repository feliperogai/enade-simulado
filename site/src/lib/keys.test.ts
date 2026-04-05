import { describe, expect, it } from 'vitest'
import { keyToAction } from './keys'

const key = (k: string, extra: Partial<Parameters<typeof keyToAction>[0]> = {}) =>
  keyToAction({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...extra })

describe('keyToAction', () => {
  it('letras A–E marcam a alternativa', () => {
    expect(key('a')).toEqual({ type: 'answer', letter: 'A' })
    expect(key('A')).toEqual({ type: 'answer', letter: 'A' })
    expect(key('e')).toEqual({ type: 'answer', letter: 'E' })
  })

  it('outras letras não fazem nada', () => {
    expect(key('f')).toBeNull()
  })

  it('setas navegam e Backspace limpa', () => {
    expect(key('ArrowLeft')).toEqual({ type: 'prev' })
    expect(key('ArrowRight')).toEqual({ type: 'next' })
    expect(key('Backspace')).toEqual({ type: 'clear' })
  })

  it('ignora atalhos com modificadores (ex.: Ctrl+C)', () => {
    expect(key('c', { ctrlKey: true })).toBeNull()
    expect(key('c', { metaKey: true })).toBeNull()
    expect(key('ArrowLeft', { altKey: true })).toBeNull()
  })

  it('ignora teclas digitadas em campos de texto', () => {
    expect(key('a', { target: { tagName: 'INPUT' } })).toBeNull()
    expect(key('Backspace', { target: { tagName: 'TEXTAREA' } })).toBeNull()
    expect(key('b', { target: { tagName: 'DIV', isContentEditable: true } })).toBeNull()
  })
})
