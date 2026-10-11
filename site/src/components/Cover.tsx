import { Link } from 'react-router'
import { score } from '../lib/score'
import { store } from '../lib/storage'
import type { ExamVersion } from '../lib/types'
import { coverStyle } from './course'
import { Stamp } from './paper'

interface Props {
  version: ExamVersion
  showBooklet: boolean
}

/** Capa de caderno de prova: faixa e lombada na cor do curso, ano grande, carimbo de estado. */
export function Cover({ version, showBooklet }: Props) {
  const attempt = store.load(version.id)
  const numbers = new Set(version.questions.map((q) => q.n))
  const answered = Object.keys(attempt.answers).filter((n) => numbers.has(Number(n))).length
  const total = version.questions.length
  const result = attempt.finishedAt ? score(version.questions, attempt.answers) : null
  const style = coverStyle(version.course)

  const cta = result ? 'Correção' : answered > 0 ? 'Continuar' : 'Abrir'
  const state = result
    ? `corrigida, ${result.correct} de ${result.total} acertos`
    : answered > 0
      ? `em andamento, ${answered} de ${total} marcadas`
      : 'não iniciada'

  return (
    <Link
      to={result ? `/prova/${version.id}/resultado` : `/prova/${version.id}`}
      aria-label={`${version.course}, ENADE ${version.year}: ${state}. ${cta}`}
      className="group block w-[9.75rem] shrink-0 focus-visible:outline-none sm:w-44"
    >
      <div className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-l-[3px] rounded-r-md bg-sheet shadow-[0_1px_0_rgb(0_0_0/0.05),0_16px_22px_-14px_rgb(60_40_10/0.55),inset_-1px_0_0_rgb(0_0_0/0.06)] transition duration-300 group-hover:-translate-y-2 group-hover:-rotate-[1.5deg] group-hover:shadow-[0_24px_28px_-16px_rgb(60_40_10/0.6)] group-focus-visible:ring-2 group-focus-visible:ring-pen group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper">
        {/* lombada */}
        <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-2.5 ${style.band} brightness-[0.82]`} />
        <span aria-hidden="true" className="absolute inset-y-0 left-2.5 w-px bg-black/10" />

        {/* faixa do topo, como na capa da prova */}
        <div className={`ml-2.5 px-3 pb-2 pt-2.5 text-white ${style.band}`}>
          <p className="font-mono text-[8px] font-semibold uppercase leading-[1.35] tracking-[0.14em] opacity-90">
            Exame Nacional de
            <br />
            Desempenho dos Estudantes
          </p>
        </div>

        <div className="ml-2.5 flex flex-1 flex-col px-3 pb-3 pt-2.5">
          <p className="font-serif text-[2.6rem] font-semibold leading-none tracking-tight">{version.year}</p>
          <p className="mt-2 font-serif text-[15px] leading-snug">{version.course}</p>
          {showBooklet && (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-ink-faint">Caderno {version.booklet}</p>
          )}
          <p className="mt-auto flex items-baseline justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.12em]">
            <span className="text-ink-faint">{total} questões</span>
            <span className="font-semibold text-pen transition group-hover:translate-x-0.5">{cta} →</span>
          </p>
        </div>

        {result && (
          <div className="absolute bottom-9 right-2">
            <Stamp tone="red" rotate={-9}>
              <span className="flex flex-col items-center">
                <span>Corrigida</span>
                <span className="text-[13px]">{result.correct}/{result.total}</span>
              </span>
            </Stamp>
          </div>
        )}
        {!result && answered > 0 && (
          <div className="absolute bottom-9 right-2">
            <Stamp tone="blue" rotate={6}>
              <span className="flex flex-col items-center">
                <span>Em andamento</span>
                <span className="text-[13px]">{answered}/{total}</span>
              </span>
            </Stamp>
          </div>
        )}
      </div>
    </Link>
  )
}
