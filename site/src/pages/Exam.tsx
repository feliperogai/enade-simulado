import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnswerBar } from '../components/AnswerBar'
import { CourseIcon } from '../components/course'
import { ArrowLeftIcon, ArrowRightIcon, GridIcon } from '../components/icons'
import { ConfirmDialog, Modal } from '../components/Modal'
import { GridLegend, QuestionGrid } from '../components/QuestionGrid'
import { QuestionImage } from '../components/QuestionImage'
import { courseKey } from '../lib/courses'
import { imageUrl } from '../lib/data'
import { keyToAction } from '../lib/keys'
import { blankNumbers, resolveQuestionIndex } from '../lib/nav'
import { score } from '../lib/score'
import { SECTION_LABEL, type Answers, type ExamVersion, type ExamsData, type Question, type Section } from '../lib/types'
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
  'inline-flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-900/10 transition hover:bg-slate-900/5 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:px-4 lg:w-auto dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/[0.07]'

function ExamView({ version }: { version: ExamVersion }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { attempt, setAnswer, finish, latest } = useAttempt(version)
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
    window.scrollTo({ top: 0, behavior: 'instant' })
    const next = questions[index + 1]
    if (next) new Image().src = imageUrl(next) // pré-carrega a próxima
  }, [index, questions])

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
      setGridOpen(false)
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10">
      {/* Barra da prova */}
      <div className="glass sticky top-[4.5rem] z-20 mt-4 rounded-2xl px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Link
            to={backTo}
            aria-label="Voltar para a escolha de provas"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-lg text-slate-600 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeftIcon />
          </Link>
          <CourseIcon course={version.course} className="hidden size-10 text-xl sm:grid" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-semibold leading-tight">{version.course}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ENADE {version.year} · {answered} de {questions.length} respondidas
            </p>
          </div>
          {review ? (
            <Link
              to={`/prova/${version.id}/resultado`}
              className="shrink-0 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Ver resultado
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="btn-aurora shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Finalizar
            </button>
          )}
        </div>
        <SectionProgress questions={questions} answers={attempt.answers} />
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
        <section aria-labelledby="questao-titulo" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h1 id="questao-titulo" className="font-display text-2xl font-bold tracking-tight">
              Questão {question.n}
            </h1>
            <span className="glass rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              {SECTION_LABEL[question.section]}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {index + 1} de {questions.length}
            </span>
            {review && question.answer === null && (
              <span className="rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
                Anulada
              </span>
            )}
          </div>

          <div className="glass w-fit max-w-full rounded-3xl p-2 sm:p-3">
            <QuestionImage question={question} />
          </div>

          {/* Dock de resposta: acompanha a rolagem e fica sempre à mão */}
          <div className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-slate-900/[0.08] bg-white/85 p-3 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d0d18]/85 dark:shadow-black/50">
            <div className="space-y-3">
              {review && (
                <p className="text-center text-sm text-slate-600 dark:text-slate-300">
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
            </div>
          </div>
          <p className="mt-3 hidden text-center text-xs text-slate-500 lg:block dark:text-slate-500">
            Atalhos: <Kbd>A</Kbd>–<Kbd>E</Kbd> marcam · <Kbd>←</Kbd> <Kbd>→</Kbd> navegam · <Kbd>Backspace</Kbd> limpa
          </p>
        </section>

        <aside className="hidden lg:block" aria-label="Navegação entre questões">
          <div className="glass sticky top-44 space-y-4 rounded-3xl p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display font-semibold">Mapa da prova</p>
              <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {answered}/{questions.length}
              </p>
            </div>
            <GridLegend review={review} />
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

      <Modal open={gridOpen} onClose={() => setGridOpen(false)} label="Questões" className="mb-0 mt-auto w-full max-w-none">
        <div className="rounded-t-3xl border-t border-slate-900/10 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-white/10 dark:bg-[#0d0d18]">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15" aria-hidden="true" />
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-semibold">
              Mapa da prova · {answered}/{questions.length}
            </h2>
            <button
              type="button"
              onClick={() => setGridOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300"
            >
              Fechar
            </button>
          </div>
          <div className="space-y-4">
            <GridLegend review={review} />
            <QuestionGrid
              questions={questions}
              answers={attempt.answers}
              currentIndex={index}
              onSelect={goTo}
              statuses={statuses}
            />
          </div>
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

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-slate-900/10 bg-slate-900/[0.04] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
      {children}
    </kbd>
  )
}

/** Progresso em dois trechos, proporcionais ao número de questões de cada seção. */
function SectionProgress({ questions, answers }: { questions: Question[]; answers: Answers }) {
  const parts = (['FG', 'CE'] as Section[])
    .map((section) => {
      const ofSection = questions.filter((q) => q.section === section)
      return { section, total: ofSection.length, done: ofSection.filter((q) => answers[q.n] !== undefined).length }
    })
    .filter((p) => p.total > 0)
  const answered = parts.reduce((sum, p) => sum + p.done, 0)

  return (
    <div
      role="progressbar"
      aria-label="Questões respondidas"
      aria-valuemin={0}
      aria-valuemax={questions.length}
      aria-valuenow={answered}
      className="mt-3"
    >
      <div className="flex gap-1.5">
        {parts.map((p) => (
          <div key={p.section} className="h-1.5 overflow-hidden rounded-full bg-violet-500/15" style={{ flexGrow: p.total }}>
            <div
              className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${(p.done / p.total) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        {parts.map((p) => (
          <span key={p.section} style={{ flexGrow: p.total }} className="min-w-0 truncate">
            {SECTION_LABEL[p.section]} <span className="tabular-nums">{p.done}/{p.total}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
