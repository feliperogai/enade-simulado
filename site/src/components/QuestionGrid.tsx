import type { QuestionStatus } from '../lib/score'
import type { Answers, Question } from '../lib/types'

interface Props {
  questions: Question[]
  answers: Answers
  currentIndex: number
  onSelect: (index: number) => void
  /** Em revisão, cada número ganha a cor do resultado. */
  statuses?: Record<number, QuestionStatus>
}

const STATUS_CLASS: Record<QuestionStatus, string> = {
  correct: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  wrong: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300',
  blank: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  annulled: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
}

export function QuestionGrid({ questions, answers, currentIndex, onSelect, statuses }: Props) {
  return (
    <ol className="grid grid-cols-7 gap-1.5 lg:grid-cols-5" aria-label="Questões">
      {questions.map((q, i) => {
        const current = i === currentIndex
        const answered = answers[q.n] !== undefined
        const tone = statuses
          ? STATUS_CLASS[statuses[q.n]]
          : answered
            ? 'bg-indigo-600 text-white dark:bg-indigo-500'
            : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:ring-indigo-300 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700'
        return (
          <li key={q.n}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={current ? 'step' : undefined}
              aria-label={`Questão ${q.n}${answered ? `, respondida ${answers[q.n]}` : ', em branco'}`}
              className={`grid h-10 w-full place-items-center rounded-lg text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${tone} ${
                current ? 'outline-2 outline-offset-2 outline-indigo-500' : ''
              }`}
            >
              {q.n}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
