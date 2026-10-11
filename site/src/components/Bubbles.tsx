import { LETTERS, type Letter } from '../lib/types'
import { HandCheck, HandCross } from './paper'

interface Props {
  value: Letter | null
  onChange: (letter: Letter | null) => void
  /** Modo revisão: mostra o gabarito e desabilita (null = anulada). */
  review?: { correct: Letter | null }
}

const BASE =
  'relative grid size-12 shrink-0 place-items-center rounded-full border-2 font-serif text-xl font-semibold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-2 focus-visible:ring-offset-sheet sm:size-14 sm:text-2xl'

function bubbleClass(letter: Letter, value: Letter | null, review: Props['review']): string {
  if (review) {
    if (letter === review.correct) return `${BASE} border-greenpen bg-greenpen text-sheet`
    if (letter === value) return `${BASE} border-redpen text-redpen`
    return `${BASE} border-rule text-ink-faint`
  }
  if (letter === value) return `${BASE} ink border-pen bg-pen text-sheet shadow-[0_6px_14px_-6px] shadow-pen`
  return `${BASE} border-ink/70 bg-sheet text-ink hover:-translate-y-0.5 hover:border-pen hover:text-pen active:scale-95`
}

/** As cinco bolinhas da questão aberta, grandes, prontas para "pintar" de caneta. */
export function Bubbles({ value, onChange, review }: Props) {
  return (
    <div role="group" aria-label="Alternativas" className="flex items-center justify-between gap-2 sm:justify-start sm:gap-4">
      {LETTERS.map((letter) => (
        <button
          key={letter}
          type="button"
          disabled={Boolean(review)}
          aria-pressed={letter === value}
          aria-label={`Alternativa ${letter}${review && letter === review.correct ? ' (gabarito)' : ''}`}
          onClick={() => onChange(letter === value ? null : letter)}
          className={bubbleClass(letter, value, review)}
        >
          {letter}
          {review && letter === review.correct && (
            <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-sheet">
              <HandCheck className="size-5 text-greenpen" animate />
            </span>
          )}
          {review && letter === value && letter !== review.correct && (
            <HandCross className="absolute inset-1 size-auto text-redpen" animate />
          )}
        </button>
      ))}
    </div>
  )
}
