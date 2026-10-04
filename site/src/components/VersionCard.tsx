import { Link } from 'react-router'
import { score } from '../lib/score'
import { store } from '../lib/storage'
import type { ExamVersion } from '../lib/types'
import { CourseIcon, ProgressRing, courseStyle } from './course'
import { ArrowRightIcon, PlayIcon } from './icons'

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
  const style = courseStyle(version.course)

  let status: { label: string; dot: string }
  let cta: string
  if (result) {
    status = { label: `Concluída · ${result.correct}/${result.total} acertos`, dot: 'bg-emerald-500' }
    cta = 'Ver resultado'
  } else if (answered > 0) {
    status = { label: `Em andamento · ${answered}/${total}`, dot: 'bg-violet-500 animate-pulse' }
    cta = 'Continuar'
  } else {
    status = { label: 'Não iniciada', dot: 'bg-slate-400 dark:bg-slate-600' }
    cta = 'Começar'
  }

  return (
    <Link
      to={finished ? `/prova/${version.id}/resultado` : `/prova/${version.id}`}
      className={`group glass relative flex flex-col overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${style.hover}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-14 -top-14 size-40 rounded-full opacity-50 blur-2xl transition duration-500 group-hover:opacity-100 ${style.blob}`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <CourseIcon course={version.course} />
        <ProgressRing
          course={version.course}
          value={result ? result.percent / 100 : answered / total}
          label={result ? `${result.percent}%` : answered > 0 ? answered : <PlayIcon className="size-3.5 translate-x-px" />}
        />
      </div>

      <h3 className="relative mt-4 font-display text-[17px] font-semibold leading-snug tracking-tight">{version.course}</h3>
      <p className="relative mt-1 text-sm text-slate-500 dark:text-slate-400">
        {showBooklet ? `Caderno ${version.booklet}` : `ENADE ${version.year}`} · {total} questões
      </p>

      <div className="relative mt-auto flex items-center justify-between gap-3 pt-6">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className={`size-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
          <span className="truncate">{status.label}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-violet-700 transition-all group-hover:gap-2 dark:text-violet-300">
          {cta} <ArrowRightIcon />
        </span>
      </div>
    </Link>
  )
}
