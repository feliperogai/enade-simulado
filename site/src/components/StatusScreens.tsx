import { RefreshIcon } from './icons'

export function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
        <span className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-zinc-700 dark:border-t-indigo-400" />
        Carregando provas…
      </div>
    </div>
  )
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 text-center">
      <div className="space-y-4" role="alert">
        <p className="text-lg font-medium">Não foi possível carregar as provas.</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Confira sua conexão e tente de novo.</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-950"
        >
          <RefreshIcon /> Tentar de novo
        </button>
      </div>
    </div>
  )
}
