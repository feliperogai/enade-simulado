import { RefreshIcon } from './icons'

export function Loading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
        <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-pen" />
        Abrindo os cadernos…
      </div>
    </div>
  )
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto grid min-h-[50vh] max-w-md place-items-center px-4 text-center">
      <div className="sheet space-y-4 rounded-md p-8" role="alert">
        <p className="font-serif text-2xl">Não foi possível carregar as provas.</p>
        <p className="text-sm text-ink-soft">Confira sua conexão e tente de novo.</p>
        <button type="button" onClick={onRetry} className="btn-pen">
          <RefreshIcon /> Tentar de novo
        </button>
      </div>
    </div>
  )
}
