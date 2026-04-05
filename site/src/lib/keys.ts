import { isLetter, type Letter } from './types'

export type KeyAction =
  | { type: 'answer'; letter: Letter }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'clear' }

interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  target?: unknown
}

function isTyping(target: unknown): boolean {
  if (typeof target !== 'object' || target === null) return false
  const el = target as { tagName?: string; isContentEditable?: boolean }
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || !!el.isContentEditable
}

/** Atalhos da tela da prova: A–E marcam, ←/→ navegam, Backspace limpa. */
export function keyToAction(e: KeyLike): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return null
  if (e.key === 'ArrowLeft') return { type: 'prev' }
  if (e.key === 'ArrowRight') return { type: 'next' }
  if (e.key === 'Backspace') return { type: 'clear' }
  const letter = e.key.length === 1 ? e.key.toUpperCase() : ''
  return isLetter(letter) ? { type: 'answer', letter } : null
}
