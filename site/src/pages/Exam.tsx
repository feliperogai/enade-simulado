import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnswerBar } from '../components/AnswerBar'
import { ArrowLeftIcon, ArrowRightIcon, GridIcon } from '../components/icons'
import { ConfirmDialog, Modal } from '../components/Modal'
import { QuestionGrid } from '../components/QuestionGrid'
import { QuestionImage } from '../components/QuestionImage'
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
  if (blanks.length === 0) return 'Todas as questões foram respondidas.'
  return `Você deixou ${blanks.length} em branco: ${blanks.join(', ')}.`
}

const navButton =
  'inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium sm:px-4 sm:text-base lg:w-auto text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-800'

function ExamView({ version }: { version: ExamVersion }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { attempt, setAnswer, finish } = useAttempt(version)
  const [confirming, setConfirming] = useState(false)
  const [gridOpen, setGridOpen] = useState(false)

  const questions = version.questions
  const qParam = params.get('q')
  const index = resolveQuestionIndex(questions, qParam)
  const question = questions[index]
  const review = Boolean(attempt.finishedAt)
  const answered = questions.length - blankNumbers(questions, attempt.answers).length
  const statuses = useMemo(
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
    window.scrollTo({ top: 0 })
    const next = questions[index + 1]
    if (next) new Image().src = imageUrl(next) // pré-carrega a próxima
  }, [index, questions])

  const goTo = (i: number) => {
    const target = questions[Math.min(Math.max(i, 0), questions.length - 1)]
    setParams({ q: String(target.n) }, { replace: true })
    setGridOpen(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.querySelector('dialog[open]')) return
      const action = keyToAction(e)
      if (!action) return
      if (action.type === 'prev') goTo(index - 1)
      else if (action.type === 'next') goTo(index + 1)
      else if (review) return
      else if (action.type === 'clear') setAnswer(question.n, null)
      else setAnswer(question.n, attempt.answers[question.n] === action.letter ? null : action.letter)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const blanks = blankNumbers(questions, attempt.answers)
  const progress = Math.round((answered / questions.length) * 100)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-48 lg:pb-16">
      {/* Barra da prova */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-zinc-200/80 bg-zinc-50/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center gap-3">
          <Link
            to={`/?ano=${version.year}`}
            aria-label="Voltar para a escolha de provas"
            className="grid size-10 shrink-0 place-items-center rounded-full text-lg text-zinc-600 transition hover:bg-zinc-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeftIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{version.course}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ENADE {version.year} · {answered} de {questions.length} respondidas
            </p>
          </div>
          {review ? (
            <Link
              to={`/prova/${version.id}/resultado`}
              className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-950"
            >
              Ver resultado
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:ring-offset-zinc-950"
            >
              Finalizar
            </button>
          )}
        </div>
        <div
          role="progressbar"
          aria-label="Questões respondidas"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answered}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        >
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
        <section aria-labelledby="questao-titulo" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 id="questao-titulo" className="text-xl font-bold tracking-tight">
              Questão {question.n}
            </h1>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">· {SECTION_LABEL[question.section]}</span>
            {review && question.answer === null && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                Anulada
              </span>
            )}
          </div>

          <QuestionImage question={question} />

          {/* Resposta: fixa embaixo no celular, logo após a questão no desktop */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-zinc-50/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 dark:border-zinc-800 dark:bg-zinc-950/95 lg:dark:bg-transparent">
            <div className="mx-auto max-w-5xl space-y-3">
              {review && (
                <p className="text-center text-sm text-zinc-600 lg:text-left dark:text-zinc-400">
                  {question.answer === null
                    ? `Questão anulada · sua resposta: ${attempt.answers[question.n] ?? '—'}`
                    : `Sua resposta: ${attempt.answers[question.n] ?? '—'} · Gabarito: ${question.answer}`}
                </p>
              )}
              <AnswerBar
                value={attempt.answers[question.n] ?? null}
                onChange={(letter) => setAnswer(question.n, letter)}
                review={review ? { correct: question.answer } : undefined}
              />
              <div className="grid grid-cols-3 gap-2 lg:flex lg:justify-between">
                <button type="button" className={navButton} disabled={index === 0} onClick={() => goTo(index - 1)}>
                  <ArrowLeftIcon /> Anterior
                </button>
                <button type="button" className={`${navButton} lg:hidden`} onClick={() => setGridOpen(true)}>
                  <GridIcon /> Questões
                </button>
                <button
                  type="button"
                  className={navButton}
                  disabled={index === questions.length - 1}
                  onClick={() => goTo(index + 1)}
                >
                  Próxima <ArrowRightIcon />
                </button>
              </div>
              <p className="hidden text-xs text-zinc-500 lg:block dark:text-zinc-500">
                Atalhos: A–E marcam · ← → navegam · Backspace limpa
              </p>
            </div>
          </div>
        </section>

        <aside className="hidden lg:block" aria-label="Navegação entre questões">
          <div className="sticky top-40">
            <p className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Questões</p>
            <QuestionGrid
              questions={questions}
              answers={attempt.answers}
              currentIndex={index}
              onSelect={goTo}
              statuses={statuses}
            />
          </div>
        </aside>
      </div>

      <Modal
        open={gridOpen}
        onClose={() => setGridOpen(false)}
        label="Questões"
        className="mb-0 mt-auto w-full max-w-none"
      >
        <div className="rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Questões · {answered}/{questions.length} respondidas</h2>
            <button type="button" onClick={() => setGridOpen(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Fechar
            </button>
          </div>
          <QuestionGrid
            questions={questions}
            answers={attempt.answers}
            currentIndex={index}
            onSelect={goTo}
            statuses={statuses}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Finalizar prova?"
        confirmLabel="Finalizar"
        cancelLabel="Continuar respondendo"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          finish()
          setConfirming(false)
          navigate(`/prova/${version.id}/resultado`)
        }}
      >
        <p>{blankMessage(blanks)}</p>
      </ConfirmDialog>
    </div>
  )
}
