import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { store } from '../lib/storage'
import { useTheme } from '../lib/theme'
import { LogoMark, MoonIcon, SunIcon } from './icons'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
      className="glass grid size-10 place-items-center rounded-full text-lg text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-300 dark:hover:text-white"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

/** Fundo fixo: manchas de luz em movimento lento + grade que some nas bordas. */
function AuroraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="aurora-blob absolute -top-48 left-[8%] h-[34rem] w-[34rem] rounded-full bg-violet-400/25 blur-[110px] dark:bg-violet-600/25" />
      <div
        className="aurora-blob absolute -top-32 right-[2%] h-[30rem] w-[30rem] rounded-full bg-cyan-300/25 blur-[110px] dark:bg-cyan-500/15"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="aurora-blob absolute top-[45%] left-[35%] h-[26rem] w-[26rem] rounded-full bg-indigo-300/20 blur-[120px] dark:bg-indigo-600/15"
        style={{ animationDelay: '-12s' }}
      />
      <div className="bg-grid absolute inset-0" />
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <AuroraBackground />

      <header className="sticky top-0 z-30 border-b border-slate-900/[0.06] bg-slate-50/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-ink/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <LogoMark className="size-9 drop-shadow-[0_4px_16px_rgb(139_92_246/0.45)] transition group-hover:scale-105" />
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-bold tracking-tight">Simulador ENADE</span>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Computação · 2005 a 2021</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-900/[0.06] dark:border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <p>Provas e gabaritos oficiais do INEP.</p>
          {store.persistent ? (
            <p>Seu progresso fica salvo neste navegador.</p>
          ) : (
            <p className="text-amber-700 dark:text-amber-400">
              Seu navegador não permite salvar o progresso: as respostas ficam só nesta aba.
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
