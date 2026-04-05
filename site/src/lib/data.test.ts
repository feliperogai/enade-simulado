import { beforeEach, describe, expect, it } from 'vitest'
import { imageUrl, loadExams, resetExamsCache } from './data'
import type { ExamsData } from './types'

const DATA: ExamsData = { generatedAt: '2026-10-13T00:00:00Z', versions: [] }

function fakeFetch(ok: boolean) {
  const calls: string[] = []
  const fn = (async (url: string) => {
    calls.push(url)
    return { ok, status: ok ? 200 : 404, json: async () => DATA } as Response
  }) as unknown as typeof fetch
  return { fn, calls }
}

describe('loadExams', () => {
  beforeEach(() => resetExamsCache())

  it('busca ./data/exams.json', async () => {
    const f = fakeFetch(true)
    await expect(loadExams(f.fn)).resolves.toEqual(DATA)
    expect(f.calls).toEqual(['./data/exams.json'])
  })

  it('falha não fica em cache', async () => {
    await expect(loadExams(fakeFetch(false).fn)).rejects.toThrow()
    await expect(loadExams(fakeFetch(true).fn)).resolves.toEqual(DATA)
  })

  it('sucesso fica em cache', async () => {
    const f = fakeFetch(true)
    await loadExams(f.fn)
    await loadExams(f.fn)
    expect(f.calls).toHaveLength(1)
  })
})

describe('imageUrl', () => {
  it('monta o caminho relativo da imagem', () => {
    expect(imageUrl({ image: 'q/2017-b/1.webp' })).toBe('./data/q/2017-b/1.webp')
  })
})
