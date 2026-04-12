import { useSearchParams } from 'react-router'
import { VersionCard } from '../components/VersionCard'
import type { ExamsData } from '../lib/types'

export function Home({ data }: { data: ExamsData }) {
  const [params, setParams] = useSearchParams()
  const years = [...new Set(data.versions.map((v) => v.year))].sort((a, b) => a - b)
  const latest = years[years.length - 1]
  const requested = Number(params.get('ano'))
  const year = years.includes(requested) ? requested : latest

  const versions = data.versions.filter((v) => v.year === year)
  const booklets = new Set(versions.map((v) => v.booklet))
  const totalQuestions = data.versions.reduce((sum, v) => sum + v.questions.length, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:pt-14">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Treine com as provas do <span className="text-indigo-600 dark:text-indigo-400">ENADE</span> de Computação
        </h1>
        <p className="mt-3 text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
          Escolha o ano e a versão da prova, responda as questões objetivas e veja sua nota pelo gabarito oficial.
        </p>
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          {data.versions.length} provas · {years[0]} a {latest} · {totalQuestions} questões
        </p>
      </section>

      <section className="mt-10" aria-labelledby="ano-label">
        <h2 id="ano-label" className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Ano
        </h2>
        <div
          role="tablist"
          aria-labelledby="ano-label"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"
        >
          {years.map((y) => {
            const selected = y === year
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setParams({ ano: String(y) }, { replace: true })}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  selected
                    ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                    : 'bg-white text-zinc-700 ring-1 ring-zinc-200 hover:ring-indigo-300 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800 dark:hover:ring-indigo-500/60'
                }`}
              >
                {y}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6" aria-label={`Provas de ${year}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {versions.map((v) => (
            <VersionCard key={v.id} version={v} showBooklet={booklets.size > 1 && v.booklet !== v.course} />
          ))}
        </div>
      </section>
    </div>
  )
}
