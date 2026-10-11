import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { store } from '../lib/storage'
import { useTheme } from '../lib/theme'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const night = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className="inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-ink/70 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen"
    >
      {night ? <SunIcon /> : <MoonIcon />}
      {night ? 'Dia' : 'Noite'}
    </button>
  )
}

/** Marca: uma bolinha do cartão-resposta já marcada de caneta. */
export function Brand() {
  return (
    <Link to="/" className="group flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full border-2 border-ink bg-pen font-serif text-[17px] font-semibold italic text-sheet shadow-[2px_2px_0_var(--color-ink)] transition group-hover:-rotate-12"
      >
        E
      </span>
      <span className="leading-none">
        <span className="block font-serif text-[19px] font-semibold tracking-tight">Simulado ENADE</span>
        <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">Computação · 2005–2021</span>
      </span>
    </Link>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="rule-double sticky top-0 z-30 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Brand />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            Provas e gabaritos oficiais do INEP ·{' '}
            {store.persistent ? 'progresso salvo neste navegador' : 'este navegador não salva o progresso'}
          </p>
          <p className="font-hand text-2xl leading-none text-pen">bons estudos!</p>
        </div>
      </footer>
    </div>
  )
}
