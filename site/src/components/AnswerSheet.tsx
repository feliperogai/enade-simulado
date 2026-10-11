import { useEffect, useRef } from 'react'
import type { QuestionStatus } from '../lib/score'
import { LETTERS, SECTION_LABEL, type Answers, type Letter, type Question, type Section } from '../lib/types'
import { HandCheck, HandCross } from './paper'

const pad = (n: number) => String(n).padStart(2, '0')

interface Props {
  questions: Question[]
  answers: Answers
  /** -1 quando nenhuma está aberta */
  currentIndex: number
  onGo: (index: number) => void
  /** modo de marcação: tocar numa bolinha responde a questão */
  onAnswer?: (n: number, letter: Letter | null) => void
  /** modo corrigido: resultado de cada questão */
  corrected?: Record<number, QuestionStatus>
  /** mostra só estas questões (ex.: só os erros) */
  only?: Set<number>
  caption?: string
  /** classes de colunas (CSS columns) para o cartão inteiro */
  columns?: string
}

/** Cartão-resposta como o do exame: uma linha por questão, bolinhas A–E. */
export function AnswerSheet({ questions, answers, currentIndex, onGo, onAnswer, corrected, only, caption, columns = '' }: Props) {
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    if (currentIndex >= 0) rowRefs.current[currentIndex]?.scrollIntoView({ block: 'nearest' })
  }, [currentIndex])

  const sections = (['FG', 'CE'] as Section[]).filter((s) => questions.some((q) => q.section === s))

  return (
    <div className="sheet rounded-md px-4 pb-4 pt-3">
      <div className="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em]">
          Cartão-resposta{corrected ? ' · corrigido' : ''}
        </p>
        {caption && <p className="truncate font-mono text-[10px] uppercase tracking-wider text-ink-faint">{caption}</p>}
      </div>
      {!corrected && <p className="mt-1.5 text-[11px] italic text-ink-soft">Marque uma alternativa por questão.</p>}

      <div className={columns}>
        {sections.map((section) => {
          const rows = questions
            .map((q, i) => ({ q, i }))
            .filter(({ q }) => q.section === section && (!only || only.has(q.n)))
          if (rows.length === 0) return null
          return (
            <div key={section}>
              <p className="mb-1 mt-3 break-after-avoid border-b border-dashed border-rule pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                {SECTION_LABEL[section]}
              </p>
              <ol>
                {rows.map(({ q, i }) => (
                  <li
                    key={q.n}
                    ref={(el) => {
                      rowRefs.current[i] = el
                    }}
                    className="break-inside-avoid"
                  >
                    {corrected ? (
                      <CorrectedRow q={q} given={answers[q.n] ?? null} status={corrected[q.n]} onGo={() => onGo(i)} />
                    ) : (
                      <AnswerRow
                        q={q}
                        given={answers[q.n] ?? null}
                        current={i === currentIndex}
                        onGo={() => onGo(i)}
                        onAnswer={onAnswer}
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const bubbleBase =
  'grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-[9.5px] font-semibold leading-none'

function AnswerRow({
  q, given, current, onGo, onAnswer,
}: { q: Question; given: Letter | null; current: boolean; onGo: () => void; onAnswer?: Props['onAnswer'] }) {
  return (
    <div className={`flex items-center gap-1 rounded-sm px-1 py-[3px] ${current ? 'bg-marker/70' : ''}`}>
      <button
        type="button"
        onClick={onGo}
        aria-current={current ? 'step' : undefined}
        aria-label={`Ir para a questão ${q.n}`}
        className={`w-7 shrink-0 text-right font-mono text-[11px] tabular-nums hover:text-pen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen ${
          current ? 'font-bold text-ink' : 'text-ink-soft'
        }`}
      >
        {pad(q.n)}
      </button>
      <span className="ml-1 flex gap-1">
        {LETTERS.map((letter) => {
          const filled = given === letter
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={filled}
              aria-label={`Questão ${q.n}, alternativa ${letter}`}
              onClick={() => {
                onAnswer?.(q.n, filled ? null : letter)
                onGo()
              }}
              className={`${bubbleBase} transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen ${
                filled
                  ? 'ink border-pen bg-pen text-sheet'
                  : 'border-ink-faint/70 text-ink-faint hover:border-pen hover:text-pen'
              }`}
            >
              {letter}
            </button>
          )
        })}
      </span>
    </div>
  )
}

function CorrectedRow({ q, given, status, onGo }: { q: Question; given: Letter | null; status: QuestionStatus; onGo: () => void }) {
  const annulled = status === 'annulled'
  const label = { correct: 'acerto', wrong: 'erro', blank: 'em branco', annulled: 'anulada' }[status]
  return (
    <button
      type="button"
      onClick={onGo}
      aria-label={`Questão ${q.n}: ${label}. Sua resposta ${given ?? 'em branco'}, gabarito ${q.answer ?? 'anulada'}. Revisar`}
      className="flex w-full items-center gap-1 rounded-sm px-1 py-[3px] text-left transition hover:bg-marker/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen"
    >
      <span className={`w-7 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-soft ${annulled ? 'line-through' : ''}`}>
        {pad(q.n)}
      </span>
      <span className={`ml-1 flex gap-1 ${annulled ? 'opacity-40' : ''}`} aria-hidden="true">
        {LETTERS.map((letter) => {
          const filled = given === letter
          const isAnswer = !annulled && q.answer === letter && status !== 'correct'
          return (
            <span
              key={letter}
              className={`${bubbleBase} ${
                filled ? 'border-pen bg-pen text-sheet' : 'border-ink-faint/60 text-ink-faint'
              } ${isAnswer ? 'ring-2 ring-redpen ring-offset-1 ring-offset-sheet' : ''}`}
            >
              {letter}
            </span>
          )
        })}
      </span>
      <span className="ml-2 grid w-6 shrink-0 place-items-center" aria-hidden="true">
        {status === 'correct' && <HandCheck />}
        {status === 'wrong' && <HandCross />}
        {status === 'blank' && <span className="font-mono text-xs text-ink-faint">—</span>}
        {annulled && <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-ink-faint">anul.</span>}
      </span>
    </button>
  )
}
