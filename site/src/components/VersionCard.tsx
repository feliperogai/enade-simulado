import { Link } from 'react-router'
import { score } from '../lib/score'
import { store } from '../lib/storage'
import type { ExamVersion } from '../lib/types'
import { ArrowRightIcon } from './icons'

interface Props {
  version: ExamVersion
  showBooklet: boolean
}

export function VersionCard({ version, showBooklet }: Props) {
  const attempt = store.load(version.id)
  const numbers = new Set(version.questions.map((q) => q.n))
  const answered = Object.keys(attempt.answers).filter((n) => numbers.has(Number(n))).length
  const total = version.questions.length
  const finished = Boolean(attempt.finishedAt)
  const result = finished ? score(version.questions, attempt.answers) : null

  let status: { label: string; className: string }
  let cta: string
  if (result) {
    status = {
      label: `Concluída · ${result.correct}/${result.total} acertos`,
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    }
    cta = 'Ver resultado'
  } else if (answered > 0) {
    status = {
      label: `Em andamento · ${answered}/${total}`,
      className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
    }
    cta = 'Continuar'
  } else {
    status = { label: 'Não iniciada', className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' }
    cta = 'Começar'
  }

  return (
    <Link
      to={finished ? `/prova/${version.id}/resultado` : `/prova/${version.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug tracking-tight">{version.course}</h3>
          {showBooklet && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Caderno: {version.booklet}</p>
          )}
        </div>
        <span className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {version.year}
        </span>
      </div>

      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{total} questões objetivas</p>

      {answered > 0 && !finished && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" aria-hidden="true">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(answered / total) * 100}%` }} />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition group-hover:gap-2 dark:text-indigo-400">
          {cta} <ArrowRightIcon />
        </span>
      </div>
    </Link>
  )
}
