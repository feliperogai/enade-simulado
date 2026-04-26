import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { ArrowRightIcon, BanIcon, CheckIcon, MinusIcon, RefreshIcon, XIcon } from '../components/icons'
import { ConfirmDialog } from '../components/Modal'
import { score, type QuestionResult, type QuestionStatus, type SectionScore } from '../lib/score'
import { SECTION_LABEL, type ExamVersion, type ExamsData, type Section } from '../lib/types'
import { useAttempt } from '../lib/useAttempt'

export function Result({ data }: { data: ExamsData }) {
  const { id } = useParams()
  const version = data.versions.find((v) => v.id === id)
  if (!version) return <Navigate to="/" replace />
  return <ResultView key={version.id} version={version} />
}

const STATUS: Record<QuestionStatus, { label: string; icon: ReactNode; mark: string }> = {
  correct: { label: 'Acerto', icon: <CheckIcon />, mark: 'bg-emerald-600 text-white dark:bg-emerald-500' },
  wrong: { label: 'Erro', icon: <XIcon />, mark: 'bg-rose-600 text-white dark:bg-rose-500' },
  blank: { label: 'Em branco', icon: <MinusIcon />, mark: 'bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' },
  annulled: { label: 'Anulada', icon: <BanIcon />, mark: 'bg-amber-500 text-white dark:bg-amber-500' },
}

type Filter = 'all' | 'wrong' | 'blank'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'wrong', label: 'Erros' },
  { id: 'blank', label: 'Em branco' },
]

function StatTile({ status, label, value }: { status: QuestionStatus; label: string; value: number }) {
  const s = STATUS[status]
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span className={`grid size-5 place-items-center rounded-full text-xs ${s.mark}`}>{s.icon}</span>
        {label}
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function SectionMeter({ section, value }: { section: Section; value: SectionScore }) {
  const pct = value.total === 0 ? 0 : Math.round((value.correct / value.total) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{SECTION_LABEL[section]}</span>
        <span className="text-zinc-600 tabular-nums dark:text-zinc-400">
          {value.total === 0 ? '—' : `${value.correct}/${value.total} · ${pct}%`}
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${SECTION_LABEL[section]}: ${value.correct} de ${value.total} acertos`}
        aria-valuemin={0}
        aria-valuemax={value.total}
        aria-valuenow={value.correct}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-500/15"
      >
        <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ResultRow({ r, versionId }: { r: QuestionResult; versionId: string }) {
  const s = STATUS[r.status]
  return (
    <li>
      <Link
        to={`/prova/${versionId}?q=${r.n}`}
        className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-zinc-800/60"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${s.mark}`} aria-hidden="true">
          {s.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            Questão {r.n} <span className="sr-only">· {s.label}</span>
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{SECTION_LABEL[r.section]}</span>
        </span>
        <span className="text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          <span className="block">Sua resposta: {r.given ?? '—'}</span>
          <span className="block">Gabarito: {r.expected ?? 'Anulada'}</span>
        </span>
        <ArrowRightIcon className="shrink-0 text-zinc-400" />
      </Link>
    </li>
  )
}

function ResultView({ version }: { version: ExamVersion }) {
  const navigate = useNavigate()
  const { attempt, reset } = useAttempt(version)
  const [filter, setFilter] = useState<Filter>('all')
  const [confirming, setConfirming] = useState(false)

  if (!attempt.finishedAt) return <Navigate to={`/prova/${version.id}`} replace />

  const result = score(version.questions, attempt.answers)
  const rows = result.perQuestion.filter((r) => filter === 'all' || r.status === filter)
  const counts: Record<Filter, number> = { all: result.perQuestion.length, wrong: result.wrong, blank: result.blank }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <Link
        to={`/?ano=${version.year}`}
        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Escolher outra prova
      </Link>

      <section className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Resultado · ENADE {version.year} · {version.course}
        </p>
        <p className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl">
          {result.correct} <span className="text-2xl font-semibold text-zinc-500 sm:text-3xl dark:text-zinc-400">de {result.total} acertos</span>
        </p>
        <p className="mt-1 text-lg font-medium text-zinc-600 dark:text-zinc-300">{result.percent}% de aproveitamento</p>

        <div className="mt-6 space-y-4">
          <SectionMeter section="FG" value={result.bySection.FG} />
          <SectionMeter section="CE" value={result.bySection.CE} />
        </div>
      </section>

      <section aria-label="Resumo" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile status="correct" label="Acertos" value={result.correct} />
        <StatTile status="wrong" label="Erros" value={result.wrong} />
        <StatTile status="blank" label="Em branco" value={result.blank} />
        <StatTile status="annulled" label="Anuladas" value={result.annulled} />
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-950"
        >
          <RefreshIcon /> Refazer prova
        </button>
        <Link
          to={`/?ano=${version.year}`}
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          Escolher outra prova
        </Link>
      </div>

      <section className="mt-10" aria-labelledby="questoes-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="questoes-titulo" className="text-lg font-semibold">
            Questão a questão
          </h2>
          <div role="tablist" aria-label="Filtrar questões" className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  filter === f.id
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {f.label} <span className="tabular-nums text-zinc-400">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-zinc-300 p-6 text-center text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {filter === 'wrong' ? 'Nenhum erro.' : 'Nenhuma questão em branco.'}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white p-1 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {rows.map((r) => (
              <ResultRow key={r.n} r={r} versionId={version.id} />
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="Refazer prova?"
        confirmLabel="Refazer"
        cancelLabel="Cancelar"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          reset()
          setConfirming(false)
          navigate(`/prova/${version.id}`)
        }}
      >
        <p>Suas respostas desta prova serão apagadas.</p>
      </ConfirmDialog>
    </div>
  )
}
