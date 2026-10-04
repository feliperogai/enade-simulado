import { LETTERS, type Letter } from '../lib/types'

interface Props {
  value: Letter | null
  onChange: (letter: Letter | null) => void
  /** Modo revisão: mostra a correta e desabilita (null = anulada). */
  review?: { correct: Letter | null }
}

const BASE =
  'relative flex-1 rounded-xl font-display text-lg font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink'

function letterClass(letter: Letter, value: Letter | null, review: Props['review']): string {
  if (review) {
    if (letter === review.correct)
      return `${BASE} bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25`
    if (letter === value) return `${BASE} bg-linear-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25`
    return `${BASE} bg-slate-900/[0.03] text-slate-400 dark:bg-white/[0.03] dark:text-slate-600`
  }
  if (letter === value)
    return `${BASE} -translate-y-0.5 bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/35`
  return `${BASE} bg-slate-900/[0.04] text-slate-700 ring-1 ring-slate-900/10 hover:-translate-y-0.5 hover:bg-violet-500/10 hover:text-violet-700 hover:ring-violet-400/50 active:scale-95 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/10 dark:hover:text-white`
}

export function AnswerBar({ value, onChange, review }: Props) {
  return (
    <div role="group" aria-label="Alternativas" className="flex h-12 gap-2 sm:h-14">
      {LETTERS.map((letter) => (
        <button
          key={letter}
          type="button"
          disabled={Boolean(review)}
          aria-pressed={letter === value}
          aria-label={`Alternativa ${letter}${review && letter === review.correct ? ' (gabarito)' : ''}`}
          onClick={() => onChange(letter === value ? null : letter)}
          className={letterClass(letter, value, review)}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}
