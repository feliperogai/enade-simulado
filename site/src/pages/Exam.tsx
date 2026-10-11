import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnswerSheet } from '../components/AnswerSheet'
import { Bubbles } from '../components/Bubbles'
import { coverStyle } from '../components/course'
import { ArrowLeftIcon, ArrowRightIcon, GridIcon } from '../components/icons'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Kicker, Stamp } from '../components/paper'
import { QuestionImage } from '../components/QuestionImage'
import { Tally } from '../components/Tally'
import { courseKey } from '../lib/courses'
import { imageUrl } from '../lib/data'
import { keyToAction } from '../lib/keys'
import { blankNumbers, resolveQuestionIndex } from '../lib/nav'
import { score } from '../lib/score'
import { SECTION_LABEL, type ExamVersion, type ExamsData } from '../lib/types'
import { useAttempt } from '../lib/useAttempt'

export function Exam({ data }: { data: ExamsData }) {
  const { id } = useParams()
  const version = data.versions.find((v) => v.id === id)
  if (!version) return <Navigate to="/" replace />
  return <ExamView key={version.id} version={version} />
}

function blankMessage(blanks: number[]): string {
  if (blanks.length === 0) return 'Todas as questões estão marcadas.'
  return `Você deixou ${blanks.length} em branco: ${blanks.join(', ')}.`
}

const pad = (n: number) => String(n).padStart(2, '0')

const pageTurn =
  'inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink transition hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen'

function ExamView({ version }: { version: ExamVersion }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { attempt, setAnswer, finish, latest, visit } = useAttempt(version)
  const [confirming, setConfirming] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const questions = version.questions
  const qParam = params.get('q')
  const index = resolveQuestionIndex(questions, qParam)
  const question = questions[index]
  const review = Boolean(attempt.finishedAt)
  const answered = questions.length - blankNumbers(questions, attempt.answers).length
  const corrected = useMemo(
    () =>
      review
        ? Object.fromEntries(score(questions, attempt.answers).perQuestion.map((r) => [r.n, r.status]))
        : undefined,
    [review, questions, attempt.answers],
  )

  // ?q= inválido ou ausente: corrige a URL para a questão aberta.
  useEffect(() => {
    if (qParam !== String(question.n)) setParams({ q: String(question.n) }, { replace: true })
  }, [qParam, question.n, setParams])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    visit(question.n)
    const next = questions[index + 1]
    if (next) new Image().src = imageUrl(next) // pré-carrega a próxima
  }, [index, question.n, questions, visit])

  // Questão aberta "de verdade": goTo atualiza na hora, antes de o React
  // redesenhar. Teclas em sequência rápida leem daqui, não do render.
  const indexRef = useRef(index)
  useLayoutEffect(() => {
    indexRef.current = index
  }, [index])

  const goTo = useCallback(
    (i: number) => {
      const target = Math.min(Math.max(i, 0), questions.length - 1)
      indexRef.current = target
      setParams({ q: String(questions[target].n) }, { replace: true })
      setSheetOpen(false)
    },
    [questions, setParams],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.querySelector('dialog[open]')) return
      const action = keyToAction(e)
      if (!action) return
      const current = indexRef.current
      const q = questions[current]
      const now = latest()
      if (action.type === 'prev') goTo(current - 1)
      else if (action.type === 'next') goTo(current + 1)
      else if (now.finishedAt) return
      else if (action.type === 'clear') setAnswer(q.n, null)
      else setAnswer(q.n, now.answers[q.n] === action.letter ? null : action.letter)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [questions, goTo, setAnswer, latest])

  const blanks = blankNumbers(questions, attempt.answers)
  const backTo = `/?curso=${courseKey(version.course)}`
  const sheet = (
    <AnswerSheet
      questions={questions}
      answers={attempt.answers}
      currentIndex={index}
      onGo={goTo}
      onAnswer={review ? undefined : setAnswer}
      corrected={corrected}
      caption={`ENADE ${version.year}`}
    />
  )

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12">
      {/* Cabeçalho da prova */}
      <div className="sticky top-[calc(3.5rem+3px)] z-20 -mx-4 border-b-2 border-ink bg-paper/95 px-4 pb-3 pt-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            to={backTo}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen"
          >
            <ArrowLeftIcon /> <span className="hidden sm:inline">Estante</span>
          </Link>
          <span aria-hidden="true" className={`hidden h-8 w-1.5 shrink-0 rounded-sm sm:block ${coverStyle(version.course).band}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg font-semibold leading-tight">{version.course}</p>
            <Kicker className="mt-0.5">
              ENADE {version.year}<span className="hidden sm:inline"> · caderno de prova</span>
            </Kicker>
          </div>
          {review ? (
            <Link to={`/prova/${version.id}/resultado`} className="btn-paper shrink-0 !px-3 !py-2 !text-xs">
              Ver correção
            </Link>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="btn-pen shrink-0 !px-3 !py-2 !text-xs">
              Entregar prova
            </button>
          )}
        </div>
        <div className="mt-2.5">
          <Tally questions={questions} answers={attempt.answers} currentIndex={index} />
        </div>
      </div>

      <div className="mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
        <section aria-labelledby="questao-titulo" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 id="questao-titulo" className="font-serif text-4xl font-semibold tracking-tight">
              Questão {pad(question.n)}
            </h1>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              {index + 1} de {questions.length} · {SECTION_LABEL[question.section]}
            </span>
            {review && question.answer === null && (
              <Stamp tone="ink" rotate={-4} className="self-center">
                Anulada
              </Stamp>
            )}
          </div>

          {/* A questão é uma folha da prova sobre a mesa */}
          <div className="relative w-fit max-w-full">
            <span aria-hidden="true" className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-[0.8deg] bg-sheet shadow-sm" />
            <div className="relative bg-white p-3 shadow-[0_18px_30px_-22px_rgb(60_40_10/0.6)] sm:p-4">
              <QuestionImage question={question} />
            </div>
          </div>

          {/* Faixa de resposta: acompanha a rolagem */}
          <div className="sticky bottom-3 z-20 mt-7 rounded-md border-2 border-ink bg-sheet/95 p-3 shadow-[4px_4px_0_var(--color-ink)] backdrop-blur-sm sm:p-4">
            {review && (
              <p className="mb-3 text-center font-mono text-xs uppercase tracking-wider text-ink-soft sm:text-left">
                {question.answer === null
                  ? `Questão anulada · você marcou ${attempt.answers[question.n] ?? '—'}`
                  : `Você marcou ${attempt.answers[question.n] ?? '—'} · gabarito ${question.answer}`}
              </p>
            )}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Bubbles
                value={attempt.answers[question.n] ?? null}
                onChange={(letter) => setAnswer(question.n, letter)}
                review={review ? { correct: question.answer } : undefined}
              />
              <div className="grid grid-cols-3 gap-1 lg:flex">
                <button type="button" className={pageTurn} disabled={index === 0} onClick={() => goTo(index - 1)}>
                  <ArrowLeftIcon /> Anterior
                </button>
                <button type="button" className={`${pageTurn} lg:hidden`} onClick={() => setSheetOpen(true)}>
                  <GridIcon /> Cartão
                </button>
                <button
                  type="button"
                  className={pageTurn}
                  disabled={index === questions.length - 1}
                  onClick={() => goTo(index + 1)}
                >
                  Próxima <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-4 hidden font-mono text-[11px] uppercase tracking-wider text-ink-faint lg:block">
            Teclado: <Key>A</Key>–<Key>E</Key> marcam · <Key>←</Key> <Key>→</Key> viram a página · <Key>Backspace</Key> apaga
          </p>
        </section>

        <aside className="hidden lg:block" aria-label="Cartão-resposta">
          <div className="sticky top-[10.5rem] max-h-[calc(100dvh-12rem)] overflow-y-auto pb-2 pr-1 [scrollbar-width:thin]">
            {sheet}
          </div>
        </aside>
      </div>

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} label="Cartão-resposta" className="mb-0 mt-auto w-full max-w-none">
        <div className="max-h-[85dvh] overflow-y-auto rounded-t-xl border-t-2 border-ink bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <Kicker>{answered} de {questions.length} marcadas</Kicker>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="rounded-md px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-pen"
            >
              Fechar
            </button>
          </div>
          {sheet}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Entregar a prova?"
        confirmLabel="Entregar"
        cancelLabel="Continuar respondendo"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          finish()
          setConfirming(false)
          navigate(`/prova/${version.id}/resultado`)
        }}
      >
        <p>{blankMessage(blanks)}</p>
        <p className="mt-2 text-sm">Depois de entregar, você vê a correção e pode revisar cada questão.</p>
      </ConfirmDialog>
    </div>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-ink/30 bg-sheet px-1.5 py-px font-mono text-[11px] font-semibold text-ink-soft shadow-[0_1.5px_0_var(--color-ink-faint)]">
      {children}
    </kbd>
  )
}
