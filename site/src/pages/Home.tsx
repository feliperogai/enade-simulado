import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Cover } from '../components/Cover'
import { COVER } from '../components/course'
import { HandUnderline, Kicker, PostIt } from '../components/paper'
import { COURSES, courseKey, isCourseKey, type CourseKey } from '../lib/courses'
import { summarize, type Summary } from '../lib/stats'
import { store } from '../lib/storage'
import type { ExamVersion, ExamsData } from '../lib/types'

type Filter = CourseKey | 'all'

export function Home({ data }: { data: ExamsData }) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('curso')
  const filter: Filter = isCourseKey(requested) ? requested : 'all'

  const summary = summarize(data.versions, (id) => store.load(id))
  const visible = data.versions.filter((v) => filter === 'all' || courseKey(v.course) === filter)
  const years = [...new Set(visible.map((v) => v.year))].sort((a, b) => b - a)
  const totalQuestions = data.versions.reduce((sum, v) => sum + v.questions.length, 0)

  const choose = (f: Filter) => setParams(f === 'all' ? {} : { curso: f }, { replace: true })

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {/* Folha de rosto: no celular o post-it vem logo depois do título */}
      <section className="grid gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.4fr_1fr] lg:gap-x-16 lg:gap-y-10">
        <div className="lg:col-start-1 lg:row-start-1">
          <Kicker>Caderno de exercícios · {data.versions.length} provas · {totalQuestions} questões</Kicker>
          <h1 className="mt-5 font-serif text-[3.3rem] font-semibold leading-[0.95] tracking-tight sm:text-7xl">
            Faça a prova
            <br />
            <span className="marker italic">como no dia.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
            Todas as provas objetivas do ENADE de Computação, de 2005 a 2021, com as questões originais e o gabarito
            oficial do INEP. Marque no cartão-resposta, entregue e receba a correção.
          </p>
        </div>

        <div className="flex justify-center sm:justify-start lg:col-start-2 lg:row-start-1 lg:items-end lg:pt-4">
          <ResumeNote summary={summary} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <div className="relative max-w-xl border-2 border-ink px-5 pb-5 pt-6">
            <p className="absolute -top-3 left-4 bg-paper px-2 font-mono text-xs font-bold uppercase tracking-[0.22em]">
              Instruções
            </p>
            <ol className="space-y-3 text-[15px] leading-snug">
              <Instruction n={1}>
                Escolha um caderno na <a href="#estante" className="font-semibold text-pen underline decoration-2 underline-offset-2">estante</a>, pelo seu curso e pelo ano.
              </Instruction>
              <Instruction n={2}>
                Responda no cartão-resposta. Dá para usar o teclado: <Key>A</Key>–<Key>E</Key> marcam e <Key>←</Key>{' '}
                <Key>→</Key> viram a página.
              </Instruction>
              <Instruction n={3}>Entregue a prova e veja a correção com o gabarito, questão por questão.</Instruction>
            </ol>
          </div>
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <ReportCard summary={summary} versions={data.versions} />
        </div>
      </section>

      {/* Estante */}
      <section id="estante" className="scroll-mt-20" aria-labelledby="estante-titulo">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="estante-titulo" className="font-serif text-4xl font-semibold tracking-tight">
              Estante
            </h2>
            <p className="mt-1 text-ink-soft">Os cadernos estão organizados por ano, do mais recente ao mais antigo.</p>
          </div>
        </div>

        {/* Abas de fichário */}
        <div role="tablist" aria-label="Curso" className="-mx-4 mt-7 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <FolderTab selected={filter === 'all'} onClick={() => choose('all')} count={data.versions.length}>
            Todos
          </FolderTab>
          {COURSES.map((c) => (
            <FolderTab
              key={c.key}
              selected={filter === c.key}
              onClick={() => choose(c.key)}
              count={data.versions.filter((v) => courseKey(v.course) === c.key).length}
              color={COVER[c.key].dot}
            >
              <span className="sm:hidden">{c.short}</span>
              <span className="hidden sm:inline">{c.label}</span>
            </FolderTab>
          ))}
        </div>

        <div className="-mt-[2px] rounded-b-md rounded-tr-md border-2 border-ink bg-sheet px-4 pb-8 pt-6 sm:px-6">
          <div className="space-y-10">
            {years.map((year) => {
              const ofYear = visible.filter((v) => v.year === year)
              const booklets = new Set(data.versions.filter((v) => v.year === year).map((v) => v.booklet))
              return (
                <div key={year}>
                  <div className="flex items-end gap-4 overflow-x-auto pb-1 pt-3 [scrollbar-width:thin] sm:gap-6">
                    <p
                      aria-label={`Ano ${year}`}
                      className="shrink-0 self-stretch font-serif text-4xl font-semibold leading-none text-ink/15 [writing-mode:vertical-rl] rotate-180 sm:text-5xl"
                    >
                      {year}
                    </p>
                    {ofYear.map((v) => (
                      <div key={v.id} className="pb-0">
                        <Cover version={v} showBooklet={booklets.size > 1 && v.booklet !== v.course} />
                      </div>
                    ))}
                  </div>
                  {/* prateleira */}
                  <div aria-hidden="true" className="relative h-3 rounded-[2px] bg-shelf shadow-[0_12px_14px_-10px_rgb(60_40_10/0.6)]">
                    <span className="absolute inset-x-0 top-0 h-px bg-white/30" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function Instruction({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-mono text-xs font-semibold">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-ink/40 bg-sheet px-1.5 py-px font-mono text-[12px] font-semibold shadow-[0_1.5px_0_var(--color-ink-faint)]">
      {children}
    </kbd>
  )
}

function FolderTab({
  selected, onClick, count, color, children,
}: { selected: boolean; onClick: () => void; count: number; color?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`relative shrink-0 rounded-t-lg border-2 border-b-0 px-4 pb-2.5 pt-3 font-mono text-xs font-semibold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen ${
        selected
          ? 'z-10 border-ink bg-sheet text-ink'
          : 'border-ink/25 bg-paper text-ink-faint hover:border-ink/50 hover:text-ink'
      }`}
    >
      {color && <span aria-hidden="true" className={`absolute inset-x-3 top-1 h-1 rounded-full ${color}`} />}
      {children} <span className="opacity-60">{count}</span>
    </button>
  )
}

function ResumeNote({ summary }: { summary: Summary }) {
  if (summary.resume && summary.resumeQuestion) {
    const short = COURSES.find((c) => c.key === courseKey(summary.resume!.course))?.short
    return (
      <PostIt rotate={2.5} className="w-full max-w-[17rem]">
        <p className="font-hand text-[1.7rem] leading-[1.05]">
          Você parou na questão {summary.resumeQuestion}
        </p>
        <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wider opacity-70">
          {short} · ENADE {summary.resume.year}
        </p>
        <Link
          to={`/prova/${summary.resume.id}?q=${summary.resumeQuestion}`}
          className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider underline decoration-2 underline-offset-4 hover:no-underline"
        >
          Continuar de onde parei →
        </Link>
      </PostIt>
    )
  }
  return (
    <PostIt rotate={-2} className="w-full max-w-[17rem]">
      <p className="font-hand text-[1.7rem] leading-[1.05]">Dica: treine como se fosse o dia da prova.</p>
      <p className="mt-2 text-sm leading-snug opacity-80">
        Separe um tempo, faça o caderno inteiro e só depois olhe a correção.
      </p>
    </PostIt>
  )
}

function ReportCard({ summary, versions }: { summary: Summary; versions: ExamVersion[] }) {
  const best = summary.best ? versions.find((v) => v.id === summary.best!.id) : null
  const empty = summary.finished === 0 && summary.inProgress === 0
  return (
    <div className="sheet relative w-full rounded-sm px-5 pb-5 pt-4 sm:max-w-sm" aria-labelledby="boletim-titulo">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
        <h2 id="boletim-titulo" className="font-serif text-2xl font-semibold">
          Boletim
        </h2>
        <Kicker>neste navegador</Kicker>
      </div>
      {empty ? (
        <div className="ruled mt-1 pt-1">
          <p className="font-hand text-[1.6rem] leading-8 text-pen">Ainda em branco.</p>
          <p className="font-hand text-[1.6rem] leading-8 text-pen">Faça seu primeiro caderno!</p>
          <p className="h-8" />
        </div>
      ) : (
        <dl className="mt-2 font-mono text-[13px]">
          <Row label="Cadernos corrigidos" value={String(summary.finished)} />
          <Row label="Em andamento" value={String(summary.inProgress)} />
          <Row label="Média" value={summary.average === null ? '—' : `${summary.average}%`} />
          <Row label="Melhor nota" value={summary.best ? `${summary.best.percent}%` : '—'} />
          {best && (
            <div className="pt-3">
              <p className="font-hand text-xl leading-tight text-redpen">
                melhor: {best.course} {best.year}
              </p>
              <div className="w-40">
                <HandUnderline />
              </div>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <dt className="text-ink-soft">{label}</dt>
      <span aria-hidden="true" className="flex-1 -translate-y-1 border-b-[1.5px] border-dotted border-ink-faint/60" />
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}
