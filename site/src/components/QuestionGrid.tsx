import type { QuestionStatus } from '../lib/score'
import { SECTION_LABEL, type Answers, type Question, type Section } from '../lib/types'

interface Props {
  questions: Question[]
  answers: Answers
  /** -1 quando nenhuma está aberta (mapa do resultado) */
  currentIndex: number
  onSelect: (index: number) => void
  /** Em revisão, cada número ganha a cor do resultado. */
  statuses?: Record<number, QuestionStatus>
  columns?: string
}

const STATUS_CLASS: Record<QuestionStatus, string> = {
  correct: 'bg-linear-to-br from-emerald-500 to-teal-600 text-white',
  wrong: 'bg-linear-to-br from-rose-500 to-pink-600 text-white',
  blank: 'bg-slate-900/[0.05] text-slate-500 ring-1 ring-slate-900/10 dark:bg-white/[0.04] dark:text-slate-400 dark:ring-white/10',
  annulled: 'bg-linear-to-br from-amber-400 to-orange-500 text-white',
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  correct: 'acerto',
  wrong: 'erro',
  blank: 'em branco',
  annulled: 'anulada',
}

export function QuestionGrid({ questions, answers, currentIndex, onSelect, statuses, columns = 'grid-cols-7 lg:grid-cols-5' }: Props) {
  const sections = (['FG', 'CE'] as Section[]).filter((s) => questions.some((q) => q.section === s))

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {SECTION_LABEL[section]}
          </p>
          <ol className={`grid gap-1.5 ${columns}`} aria-label={SECTION_LABEL[section]}>
            {questions.map((q, i) => {
              if (q.section !== section) return null
              const current = i === currentIndex
              const answered = answers[q.n] !== undefined
              const tone = statuses
                ? STATUS_CLASS[statuses[q.n]]
                : answered
                  ? 'bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-sm shadow-violet-500/30'
                  : 'bg-slate-900/[0.04] text-slate-600 ring-1 ring-slate-900/10 hover:ring-violet-400/60 dark:bg-white/[0.04] dark:text-slate-300 dark:ring-white/10'
              const state = statuses ? STATUS_LABEL[statuses[q.n]] : answered ? `respondida ${answers[q.n]}` : 'em branco'
              return (
                <li key={q.n}>
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`Questão ${q.n}, ${state}`}
                    className={`grid h-9 w-full place-items-center rounded-lg text-xs font-bold tabular-nums transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${tone} ${
                      current ? 'outline-2 outline-offset-2 outline-cyan-400' : ''
                    }`}
                  >
                    {q.n}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}

export function GridLegend({ review }: { review: boolean }) {
  const items = review
    ? [
        ['Acerto', STATUS_CLASS.correct],
        ['Erro', STATUS_CLASS.wrong],
        ['Em branco', STATUS_CLASS.blank],
        ['Anulada', STATUS_CLASS.annulled],
      ]
    : [
        ['Respondida', 'bg-linear-to-br from-violet-500 to-indigo-600'],
        ['Em branco', STATUS_CLASS.blank],
        ['Atual', 'ring-2 ring-cyan-400 bg-transparent'],
      ]
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
      {items.map(([label, cls]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={`size-3 rounded ${cls}`} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  )
}
