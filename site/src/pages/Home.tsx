import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { COURSE_STYLE, CourseIcon } from '../components/course'
import { PlayIcon, SparkIcon, TargetIcon, TrophyIcon } from '../components/icons'
import { VersionCard } from '../components/VersionCard'
import { COURSES, courseKey, isCourseKey, type CourseKey } from '../lib/courses'
import { summarize, type Summary } from '../lib/stats'
import { store } from '../lib/storage'
import type { ExamVersion, ExamsData } from '../lib/types'

type Filter = CourseKey | 'all'

export function Home({ data }: { data: ExamsData }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('curso')
  const filter: Filter = isCourseKey(requested) ? requested : 'all'

  const summary = summarize(data.versions, (id) => store.load(id))
  const visible = data.versions.filter((v) => filter === 'all' || courseKey(v.course) === filter)
  const years = [...new Set(visible.map((v) => v.year))].sort((a, b) => b - a)
  const totalQuestions = data.versions.reduce((sum, v) => sum + v.questions.length, 0)
  const counts = Object.fromEntries(COURSES.map((c) => [c.key, data.versions.filter((v) => courseKey(v.course) === c.key).length]))

  const choose = (f: Filter) => setParams(f === 'all' ? {} : { curso: f }, { replace: true })

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      {/* Hero */}
      <section className="grid items-center gap-10 pb-14 pt-12 sm:pt-16 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        <div>
          <p className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <SparkIcon className="text-violet-500 dark:text-violet-300" />
            {data.versions.length} provas oficiais · {totalQuestions} questões
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Treine para o <span className="text-aurora">ENADE</span>
            <br className="hidden sm:block" /> de Computação
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg dark:text-slate-400">
            Escolha o curso e o ano, resolva as questões objetivas uma a uma e veja sua nota pelo gabarito oficial do
            INEP, com revisão questão a questão.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {summary.resume ? (
              <Link
                to={`/prova/${summary.resume.id}`}
                className="btn-aurora inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:ring-offset-ink"
              >
                <PlayIcon className="size-4" />
                Continuar {COURSES.find((c) => c.key === courseKey(summary.resume!.course))?.short} {summary.resume.year}
              </Link>
            ) : (
              <a
                href="#provas"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('provas')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="btn-aurora inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:ring-offset-ink"
              >
                <PlayIcon className="size-4" /> Escolher uma prova
              </a>
            )}
            <span className="text-sm text-slate-500 dark:text-slate-400">Sem cadastro · o progresso fica no seu navegador</span>
          </div>
        </div>

        <StatsPanel summary={summary} versions={data.versions} />
      </section>

      {/* Filtro por curso */}
      <section id="provas" className="scroll-mt-24" aria-labelledby="provas-titulo">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="provas-titulo" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Provas
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Filtre pelo seu curso; as provas estão em ordem do ano mais recente.</p>
          </div>
        </div>

        <div role="tablist" aria-label="Curso" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <FilterChip selected={filter === 'all'} onClick={() => choose('all')} count={data.versions.length}>
            Todos
          </FilterChip>
          {COURSES.map((c) => (
            <FilterChip key={c.key} selected={filter === c.key} onClick={() => choose(c.key)} count={counts[c.key]} dot={COURSE_STYLE[c.key].dot}>
              <span className="sm:hidden">{c.short}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </FilterChip>
          ))}
        </div>

        {/* Linha do tempo */}
        <ol className="relative mt-8 space-y-10">
          <span aria-hidden="true" className="absolute bottom-2 left-[9.5px] top-3 w-px bg-linear-to-b from-violet-500/50 via-slate-400/25 to-transparent dark:via-white/10" />
          {years.map((year) => {
            const ofYear = visible.filter((v) => v.year === year)
            const booklets = new Set(data.versions.filter((v) => v.year === year).map((v) => v.booklet))
            return (
              <li key={year} className="relative grid gap-4 pl-9 sm:grid-cols-[6.5rem_1fr] sm:gap-6">
                <span
                  aria-hidden="true"
                  className="absolute left-[4px] top-2.5 size-3 rounded-full bg-violet-500 shadow-[0_0_0_4px_rgb(139_92_246/0.18),0_0_16px_rgb(139_92_246/0.6)]"
                />
                <div>
                  <h3 className="font-display text-3xl font-bold leading-none tracking-tight">{year}</h3>
                  <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {ofYear.length} {ofYear.length === 1 ? 'prova' : 'provas'}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ofYear.map((v) => (
                    <VersionCard key={v.id} version={v} showBooklet={booklets.size > 1 && v.booklet !== v.course} />
                  ))}
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function FilterChip({
  selected, onClick, count, dot, children,
}: { selected: boolean; onClick: () => void; count: number; dot?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        selected
          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900 dark:shadow-white/10'
          : 'glass text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
      }`}
    >
      {dot && <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />}
      {children}
      <span className={`tabular-nums ${selected ? 'opacity-60' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
    </button>
  )
}

function StatsPanel({ summary, versions }: { summary: Summary; versions: ExamVersion[] }) {
  const best = summary.best ? versions.find((v) => v.id === summary.best!.id) : null
  const empty = summary.finished === 0 && summary.inProgress === 0

  return (
    <aside className="glass relative overflow-hidden rounded-3xl p-6 sm:p-7" aria-labelledby="desempenho-titulo">
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-violet-500/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-cyan-500/10 blur-3xl" />
      <h2 id="desempenho-titulo" className="relative font-display text-lg font-semibold">
        Seu desempenho
      </h2>

      {empty ? (
        <div className="relative mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <p>Faça sua primeira prova: aqui vão aparecer sua média, a melhor nota e as provas em andamento.</p>
          <ul className="grid grid-cols-2 gap-2 pt-2">
            {COURSES.map((c) => (
              <li key={c.key} className="flex items-center gap-2.5 rounded-xl bg-slate-900/[0.035] p-2 text-xs font-medium text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                <CourseIcon course={c.label} className="size-8 text-base" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <dl className="relative mt-5 grid grid-cols-3 gap-3">
            <Stat icon={<TrophyIcon />} label="Concluídas" value={String(summary.finished)} />
            <Stat icon={<TargetIcon />} label="Média" value={summary.average === null ? '—' : `${summary.average}%`} />
            <Stat icon={<SparkIcon />} label="Melhor" value={summary.best ? `${summary.best.percent}%` : '—'} />
          </dl>
          <p className="relative mt-5 text-sm text-slate-600 dark:text-slate-400">
            {summary.inProgress > 0
              ? `${summary.inProgress} ${summary.inProgress === 1 ? 'prova em andamento' : 'provas em andamento'}.`
              : 'Nenhuma prova em andamento.'}
            {best && ` Melhor nota: ${best.course} ${best.year}.`}
          </p>
        </>
      )}
    </aside>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/[0.035] p-3 dark:bg-white/[0.04]">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="text-violet-500 dark:text-violet-300" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1.5 font-display text-3xl font-bold tracking-tight">{value}</dd>
    </div>
  )
}
