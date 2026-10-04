import { RefreshIcon } from './icons'

export function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <span className="size-5 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-500 dark:border-t-violet-400" />
        Carregando provas…
      </div>
    </div>
  )
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 text-center">
      <div className="glass space-y-4 rounded-3xl p-8" role="alert">
        <p className="font-display text-xl font-bold">Não foi possível carregar as provas.</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Confira sua conexão e tente de novo.</p>
        <button
          type="button"
          onClick={onRetry}
          className="btn-aurora inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <RefreshIcon /> Tentar de novo
        </button>
      </div>
    </div>
  )
}
