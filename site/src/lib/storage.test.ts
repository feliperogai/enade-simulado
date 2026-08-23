import { describe, expect, it } from 'vitest'
import { createStore, type KV } from './storage'

function memoryKV(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('storage', () => {
  it('salva e carrega a tentativa na chave da versão', () => {
    const kv = memoryKV()
    const store = createStore(kv)
    store.save('2017-b', { answers: { 1: 'A' }, finishedAt: '2026-10-13T12:00:00.000Z' })
    expect(kv.data.has('enade:v1:2017-b')).toBe(true)
    expect(store.load('2017-b')).toEqual({ answers: { 1: 'A' }, finishedAt: '2026-10-13T12:00:00.000Z' })
    expect(store.persistent).toBe(true)
  })

  it('versão sem dados começa vazia', () => {
    expect(createStore(memoryKV()).load('2021-s')).toEqual({ answers: {} })
  })

  it('clear volta ao estado vazio, sem finishedAt', () => {
    const store = createStore(memoryKV())
    store.save('2017-b', { answers: { 2: 'C' }, finishedAt: 'x' })
    store.clear('2017-b')
    expect(store.load('2017-b')).toEqual({ answers: {} })
  })

  it('JSON inválido vira tentativa vazia', () => {
    const kv = memoryKV()
    kv.data.set('enade:v1:2017-b', '{nao é json')
    expect(createStore(kv).load('2017-b')).toEqual({ answers: {} })
  })

  it('descarta entradas inválidas', () => {
    const kv = memoryKV()
    kv.data.set('enade:v1:2017-b', JSON.stringify({ answers: { 1: 'F', 2: 'B', x: 'A', 3: 7 }, finishedAt: 5 }))
    expect(createStore(kv).load('2017-b')).toEqual({ answers: { 2: 'B' } })
  })

  it('cai para memória quando o backend lança', () => {
    const kv = memoryKV()
    kv.setItem = () => {
      throw new Error('QuotaExceeded')
    }
    const store = createStore(kv)
    expect(() => store.save('2017-b', { answers: { 1: 'D' } })).not.toThrow()
    expect(store.load('2017-b')).toEqual({ answers: { 1: 'D' } })
    expect(store.persistent).toBe(false)
  })

  it('sem backend funciona só em memória', () => {
    const store = createStore(null)
    store.save('2017-b', { answers: { 5: 'E' } })
    expect(store.load('2017-b')).toEqual({ answers: { 5: 'E' } })
    expect(store.persistent).toBe(false)
  })

  it('guarda o tema e ignora valores inválidos', () => {
    const kv = memoryKV()
    const store = createStore(kv)
    expect(store.loadTheme()).toBeNull()
    store.saveTheme('dark')
    expect(store.loadTheme()).toBe('dark')
    expect(kv.data.get('enade:theme')).toBe('dark')
    kv.data.set('enade:theme', 'blue')
    expect(store.loadTheme()).toBeNull()
  })

  it('guarda updatedAt e descarta valor inválido', () => {
    const kv = memoryKV()
    const store = createStore(kv)
    store.save('2017-b', { answers: { 1: 'A' }, updatedAt: '2026-10-14T10:00:00.000Z' })
    expect(store.load('2017-b')).toEqual({ answers: { 1: 'A' }, updatedAt: '2026-10-14T10:00:00.000Z' })
    kv.data.set('enade:v1:2017-b', JSON.stringify({ answers: {}, updatedAt: 42 }))
    expect(store.load('2017-b')).toEqual({ answers: {} })
  })
})
