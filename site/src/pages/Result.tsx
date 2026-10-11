import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { AnswerSheet } from '../components/AnswerSheet'
import { RefreshIcon } from '../components/icons'
import { ConfirmDialog } from '../components/Modal'
import { HandCheck, HandCircle, HandCross, Kicker, Stamp } from '../components/paper'
import { courseKey } from '../lib/courses'
import { score, type QuestionResult, type QuestionStatus } from '../lib/score'
import { performanceMessage } from '../lib/stats'
import { SECTION_LABEL, type ExamVersion, type ExamsData, type Section } from '../lib/types'
import { useAttempt } from '../lib/useAttempt'

export function Result({ data }: { data: ExamsData }) {
  const { id } = useParams()
  const version = data.versions.find((v) => v.id === id)
  if (!version) return <Navigate to="/" replace />
  return <ResultView key={version.id} version={version} />
}

const STROKE: Record<QuestionStatus, string> = {
  correct: 'bg-greenpen',
  wrong: 'bg-redpen',
  blank: 'bg-rule',
  annulled: 'bg-ink-faint/40',
}

/** Uma seção como fileira de riscos, um por questão, na cor do resultado. */
function SectionStrokes({ section, results }: { section: Section; results: QuestionResult[] }) {
  const own = results.filter((r) => r.section === section)
  if (own.length === 0) return null
  const counted = own.filter((r) => r.status !== 'annulled')
  const correct = counted.filter((r) => r.status === 'correct').length
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-serif text-lg">{SECTION_LABEL[section]}</p>
        <p className="font-mono text-sm font-semibold tabular-nums">
          {correct}/{counted.length}
        </p>
      </div>
      <div
        className="mt-2 flex flex-wrap gap-[3px]"
        role="img"
        aria-label={`${SECTION_LABEL[section]}: ${correct} de ${counted.length} acertos`}
      >
        {own.map((r) => (
          <span key={r.n} className={`h-6 w-[5px] rounded-full ${STROKE[r.status]}`} />
        ))}
      </div>
    </div>
  )
}

function ResultView({ version }: { version: ExamVersion }) {
  const navigate = useNavigate()
  const { attempt, reset } = useAttempt(version)
  const [onlyMistakes, setOnlyMistakes] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!attempt.finishedAt) return <Navigate to={`/prova/${version.id}`} replace />

  const result = score(version.questions, attempt.answers)
  const message = performanceMessage(result.percent)
  const corrected = Object.fromEntries(result.perQuestion.map((r) => [r.n, r.status]))
  const mistakes = new Set(result.perQuestion.filter((r) => r.status === 'wrong' || r.status === 'blank').map((r) => r.n))
  const backTo = `/?curso=${courseKey(version.course)}`
  const date = new Date(attempt.finishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <Link to={backTo} className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-ink">
        ← Voltar à estante
      </Link>

      {/* Folha corrigida */}
      <section
        aria-labelledby="nota-titulo"
        className="sheet margin-line relative mt-4 overflow-hidden rounded-sm py-8 pl-14 pr-6 sm:py-10 sm:pl-[4.5rem] sm:pr-10"
      >
        <div className="absolute right-5 top-6 sm:right-10 sm:top-9">
          <Stamp tone="red" rotate={-11} animate className="!text-sm">
            Corrigido
          </Stamp>
        </div>

        <Kicker>Correção · ENADE {version.year}</Kicker>
        <p className="mt-1 max-w-[70%] font-serif text-2xl leading-tight sm:text-3xl">{version.course}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">Entregue em {date}</p>

        <div className="mt-10 flex flex-wrap items-center gap-x-14 gap-y-8">
          <div>
            <h1 id="nota-titulo" className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              Nota
            </h1>
            <HandCircle delay={350} className="mt-3">
              <span className="px-2 font-serif text-7xl font-semibold leading-none tracking-tight sm:text-8xl">
                {result.correct}
                <span className="text-4xl text-ink-faint sm:text-5xl">/{result.total}</span>
              </span>
            </HandCircle>
            <p className="mt-6 font-mono text-sm font-semibold">{result.percent}% de aproveitamento</p>
          </div>

          <div className="max-w-xs -rotate-2">
            <p className="font-hand text-[2.6rem] leading-none text-redpen">{message.title}</p>
            <p className="mt-2 font-hand text-2xl leading-tight text-redpen/85">{message.subtitle}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-8 border-t border-dashed border-rule pt-7 sm:grid-cols-[1fr_auto]">
          <div className="space-y-5">
            <SectionStrokes section="FG" results={result.perQuestion} />
            <SectionStrokes section="CE" results={result.perQuestion} />
          </div>
          <ul className="space-y-2 font-mono text-sm sm:border-l sm:border-dashed sm:border-rule sm:pl-8">
            <li className="flex items-center gap-2.5">
              <HandCheck /> <b>{result.correct}</b> acertos
            </li>
            <li className="flex items-center gap-2.5">
              <HandCross /> <b>{result.wrong}</b> erros
            </li>
            <li className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center text-ink-faint">—</span> <b>{result.blank}</b> em branco
            </li>
            <li className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center text-[10px] font-bold text-ink-faint">⊘</span>{' '}
              <b>{result.annulled}</b> anuladas
            </li>
          </ul>
        </div>
      </section>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => setConfirming(true)} className="btn-pen">
          <RefreshIcon /> Refazer prova
        </button>
        <Link to={backTo} className="btn-paper">
          Escolher outro caderno
        </Link>
      </div>

      {/* Cartão-resposta corrigido */}
      <section className="mt-14" aria-labelledby="cartao-titulo">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="cartao-titulo" className="font-serif text-3xl font-semibold tracking-tight">
              Seu cartão-resposta
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Em azul, o que você marcou; o círculo vermelho mostra a resposta certa quando você errou. Toque numa
              questão para revisar.
            </p>
          </div>
          <label className="inline-flex cursor-pointer select-none items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider">
            <input
              type="checkbox"
              checked={onlyMistakes}
              onChange={(e) => setOnlyMistakes(e.target.checked)}
              className="size-4 accent-redpen"
            />
            Só erros e brancos ({mistakes.size})
          </label>
        </div>

        <div className="mt-5">
          {onlyMistakes && mistakes.size === 0 ? (
            <p className="sheet rounded-md p-8 text-center font-hand text-3xl text-greenpen">Nenhum erro. Gabaritou!</p>
          ) : (
            <AnswerSheet
              questions={version.questions}
              answers={attempt.answers}
              currentIndex={-1}
              onGo={(i) => navigate(`/prova/${version.id}?q=${version.questions[i].n}`)}
              corrected={corrected}
              only={onlyMistakes ? mistakes : undefined}
              caption={`ENADE ${version.year}`}
              columns="gap-8 sm:columns-2 lg:columns-3"
            />
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Refazer a prova?"
        confirmLabel="Refazer"
        cancelLabel="Cancelar"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          reset()
          setConfirming(false)
          navigate(`/prova/${version.id}`)
        }}
      >
        <p>Suas marcações deste caderno serão apagadas e você começa do zero.</p>
      </ConfirmDialog>
    </div>
  )
}
