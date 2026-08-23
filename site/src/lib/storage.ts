import { isLetter, type Answers } from './types'

export type Theme = 'light' | 'dark'

export interface Attempt {
  answers: Answers
  finishedAt?: string
  /** última mudança (para "continuar de onde parou") */
  updatedAt?: string
}

export interface KV {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface AppStore {
  load(versionId: string): Attempt
  save(versionId: string, attempt: Attempt): void
  clear(versionId: string): void
  loadTheme(): Theme | null
  saveTheme(theme: Theme): void
  /** false quando o navegador não deixa salvar (aba anônima, bloqueio etc.) */
  readonly persistent: boolean
}

const attemptKey = (versionId: string) => `enade:v1:${versionId}`
const THEME_KEY = 'enade:theme'

function memoryKV(seed?: Map<string, string>): KV {
  const data = new Map(seed)
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

function parseAttempt(raw: string | null): Attempt {
  if (!raw) return { answers: {} }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { answers: {} }
  }
  if (typeof value !== 'object' || value === null) return { answers: {} }
  const { answers, finishedAt, updatedAt } = value as Record<string, unknown>

  const clean: Answers = {}
  if (typeof answers === 'object' && answers !== null) {
    for (const [key, letter] of Object.entries(answers)) {
      const n = Number(key)
      if (Number.isInteger(n) && n > 0 && isLetter(letter)) clean[n] = letter
    }
  }
  const attempt: Attempt = { answers: clean }
  if (typeof finishedAt === 'string') attempt.finishedAt = finishedAt
  if (typeof updatedAt === 'string') attempt.updatedAt = updatedAt
  return attempt
}

/**
 * Armazenamento das tentativas e do tema. Se o backend falhar em qualquer
 * operação, passa a guardar em memória (o site continua funcionando).
 */
export function createStore(backend: KV | null): AppStore {
  const shadow = new Map<string, string>() // o que já foi lido/gravado, para a troca
  let kv: KV = backend ?? memoryKV()
  let persistent = backend !== null

  function fallback() {
    kv = memoryKV(shadow)
    persistent = false
  }

  function get(key: string): string | null {
    try {
      const value = kv.getItem(key)
      if (value !== null) shadow.set(key, value)
      return value
    } catch {
      fallback()
      return kv.getItem(key)
    }
  }

  function set(key: string, value: string) {
    shadow.set(key, value)
    try {
      kv.setItem(key, value)
    } catch {
      fallback()
    }
  }

  function remove(key: string) {
    shadow.delete(key)
    try {
      kv.removeItem(key)
    } catch {
      fallback()
    }
  }

  return {
    load: (id) => parseAttempt(get(attemptKey(id))),
    save: (id, attempt) => set(attemptKey(id), JSON.stringify(attempt)),
    clear: (id) => remove(attemptKey(id)),
    loadTheme: () => {
      const t = get(THEME_KEY)
      return t === 'light' || t === 'dark' ? t : null
    },
    saveTheme: (t) => set(THEME_KEY, t),
    get persistent() {
      return persistent
    },
  }
}

function browserStorage(): KV | null {
  try {
    const ls = globalThis.localStorage
    const probe = '__enade_probe__'
    ls.setItem(probe, probe)
    ls.removeItem(probe)
    return ls
  } catch {
    return null
  }
}

export const store: AppStore = createStore(browserStorage())
