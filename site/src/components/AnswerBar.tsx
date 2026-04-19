import { LETTERS, type Letter } from '../lib/types'

interface Props {
  value: Letter | null
  onChange: (letter: Letter | null) => void
  /** Modo revisão: mostra a correta e desabilita (null = anulada). */
  review?: { correct: Letter | null }
}

function letterClass(letter: Letter, value: Letter | null, review: Props['review']): string {
  const base =
    'flex-1 rounded-xl text-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-950'
  if (review) {
    if (letter === review.correct) return `${base} bg-emerald-600 text-white`
    if (letter === value) return `${base} bg-rose-600 text-white`
    return `${base} bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600`
  }
  if (letter === value) return `${base} bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-500`
  return `${base} bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-indigo-50 hover:ring-indigo-300 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-indigo-500/10`
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
