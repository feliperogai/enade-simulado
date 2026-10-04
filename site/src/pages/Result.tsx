import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { CourseIcon } from '../components/course'
import { ArrowRightIcon, BanIcon, CheckIcon, ListIcon, MinusIcon, RefreshIcon, XIcon } from '../components/icons'
import { ConfirmDialog } from '../components/Modal'
import { GridLegend, QuestionGrid } from '../components/QuestionGrid'
import { courseKey } from '../lib/courses'
import { score, type QuestionResult, type QuestionStatus, type SectionScore } from '../lib/score'
import { performanceMessage } from '../lib/stats'
import { SECTION_LABEL, type ExamVersion, type ExamsData, type Section } from '../lib/types'
import { useAttempt } from '../lib/useAttempt'

export function Result({ data }: { data: ExamsData }) {
  const { id } = useParams()
  const version = data.versions.find((v) => v.id === id)
  if (!version) return <Navigate to="/" replace />
  return <ResultView key={version.id} version={version} />
}

const STATUS: Record<QuestionStatus, { label: string; icon: ReactNode; mark: string }> = {
  correct: { label: 'Acerto', icon: <CheckIcon />, mark: 'bg-linear-to-br from-emerald-500 to-teal-600 text-white' },
  wrong: { label: 'Erro', icon: <XIcon />, mark: 'bg-linear-to-br from-rose-500 to-pink-600 text-white' },
  blank: { label: 'Em branco', icon: <MinusIcon />, mark: 'bg-slate-300 text-slate-700 dark:bg-white/10 dark:text-slate-200' },
  annulled: { label: 'Anulada', icon: <BanIcon />, mark: 'bg-linear-to-br from-amber-400 to-orange-500 text-white' },
}

type Filter = 'all' | 'wrong' | 'blank'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'wrong', label: 'Erros' },
  { id: 'blank', label: 'Em branco' },
]

/** Medidor circular do aproveitamento, com traço em degradê. */
function Gauge({ percent }: { percent: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div
      role="meter"
      aria-label={`Aproveitamento de ${percent}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative grid size-44 shrink-0 place-items-center sm:size-48"
    >
      <span aria-hidden="true" className="absolute inset-4 rounded-full bg-violet-500/20 blur-2xl" />
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="gauge-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-violet-500/15" />
        {percent > 0 && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke="url(#gauge-g)"
            strokeDasharray={`${(percent / 100) * c} ${c}`}
          />
        )}
      </svg>
      <div className="relative text-center">
        <p className="font-display text-5xl font-bold tracking-tight">{percent}%</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">aproveitamento</p>
      </div>
    </div>
  )
}

function StatTile({ status, label, value }: { status: QuestionStatus; label: string; value: number }) {
  const s = STATUS[status]
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className={`grid size-6 place-items-center rounded-lg text-xs ${s.mark}`}>{s.icon}</span>
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

function SectionMeter({ section, value }: { section: Section; value: SectionScore }) {
  const pct = value.total === 0 ? 0 : Math.round((value.correct / value.total) * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{SECTION_LABEL[section]}</span>
        <span className="tabular-nums text-slate-600 dark:text-slate-400">
          {value.total === 0 ? '—' : `${value.correct}/${value.total} · ${pct}%`}
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${SECTION_LABEL[section]}: ${value.correct} de ${value.total} acertos`}
        aria-valuemin={0}
        aria-valuemax={value.total}
        aria-valuenow={value.correct}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-violet-500/15"
      >
        <div className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-400" style={{ width: `${pct}%` }} />
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
        className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-900/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-white/[0.05]"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${s.mark}`} aria-hidden="true">
          {s.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            Questão {r.n} <span className="sr-only">· {s.label}</span>
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{SECTION_LABEL[r.section]}</span>
        </span>
        <span className="text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
          <span className="block">Sua resposta: {r.given ?? '—'}</span>
          <span className="block">Gabarito: {r.expected ?? 'Anulada'}</span>
        </span>
        <ArrowRightIcon className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
      </Link>
    </li>
  )
}

function ResultView({ version }: { version: ExamVersion }) {
  const navigate = useNavigate()
  const { attempt, reset } = useAttempt(version)
  const [filter, setFilter] = useState<Filter>('wrong')
  const [confirming, setConfirming] = useState(false)

  if (!attempt.finishedAt) return <Navigate to={`/prova/${version.id}`} replace />

  const result = score(version.questions, attempt.answers)
  const message = performanceMessage(result.percent)
  const statuses = Object.fromEntries(result.perQuestion.map((r) => [r.n, r.status]))
  const rows = result.perQuestion.filter((r) => filter === 'all' || r.status === filter)
  const counts: Record<Filter, number> = { all: result.perQuestion.length, wrong: result.wrong, blank: result.blank }
  const backTo = `/?curso=${courseKey(version.course)}`

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8">
      <Link to={backTo} className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">
        ← Escolher outra prova
      </Link>

      {/* Destaque */}
      <section className="glass relative mt-4 overflow-hidden rounded-3xl p-6 sm:p-8" aria-labelledby="resultado-titulo">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/20 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-10 size-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <Gauge percent={result.percent} />
          <div>
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <CourseIcon course={version.course} className="size-7 text-sm" />
              ENADE {version.year} · {version.course}
            </p>
            <h1 id="resultado-titulo" className="text-aurora mt-3 font-display text-4xl font-bold tracking-tight">
              {message.title}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{message.subtitle}</p>
            <p className="mt-4 text-lg">
              <span className="font-display text-2xl font-bold">{result.correct}</span>{' '}
              <span className="text-slate-500 dark:text-slate-400">de {result.total} acertos</span>
            </p>
            <div className="mt-5 space-y-4">
              <SectionMeter section="FG" value={result.bySection.FG} />
              <SectionMeter section="CE" value={result.bySection.CE} />
            </div>
          </div>
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
          className="btn-aurora inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <RefreshIcon /> Refazer prova
        </button>
        <Link
          to={backTo}
          className="glass inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold text-slate-700 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-200 dark:hover:text-white"
        >
          Escolher outra prova
        </Link>
      </div>

      {/* Mapa de questões */}
      <section className="glass mt-8 rounded-3xl p-5 sm:p-6" aria-labelledby="mapa-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mapa-titulo" className="font-display text-lg font-semibold">
            Mapa de questões
          </h2>
          <GridLegend review />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Toque numa questão para revisar com o gabarito.</p>
        <div className="mt-5">
          <QuestionGrid
            questions={version.questions}
            answers={attempt.answers}
            currentIndex={-1}
            onSelect={(i) => navigate(`/prova/${version.id}?q=${version.questions[i].n}`)}
            statuses={statuses}
            columns="grid-cols-7 sm:grid-cols-10 lg:grid-cols-14"
          />
        </div>
      </section>

      {/* Lista detalhada */}
      <section className="mt-8" aria-labelledby="lista-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="lista-titulo" className="flex items-center gap-2 font-display text-lg font-semibold">
            <ListIcon className="text-violet-500 dark:text-violet-300" /> Lista detalhada
          </h2>
          <div role="tablist" aria-label="Filtrar questões" className="glass flex gap-1 rounded-full p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  filter === f.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {f.label} <span className="tabular-nums opacity-60">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="glass mt-4 rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400">
            {filter === 'wrong' ? 'Nenhum erro nesta prova.' : 'Nenhuma questão em branco.'}
          </p>
        ) : (
          <ul className="glass mt-4 divide-y divide-slate-900/[0.06] rounded-2xl p-1 dark:divide-white/[0.06]">
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
