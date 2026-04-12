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
      className="grid size-10 place-items-center rounded-full text-lg text-zinc-600 transition hover:bg-zinc-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-zinc-50/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <LogoMark className="size-8" />
            <span className="leading-tight">
              <span className="block font-semibold tracking-tight">Simulador ENADE</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">Computação</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-200/80 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl space-y-1 px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
          <p>Provas e gabaritos oficiais do INEP.</p>
          {!store.persistent && (
            <p className="text-amber-700 dark:text-amber-400">
              Seu navegador não permite salvar o progresso: as respostas ficam só nesta aba.
            </p>
          )}
        </div>
      </footer>
    </div>
  )
}
