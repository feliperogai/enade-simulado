import { SECTION_LABEL, type Answers, type Question, type Section } from '../lib/types'

/** Progresso em risquinhos, um por questão, separados por seção. */
export function Tally({ questions, answers, currentIndex }: { questions: Question[]; answers: Answers; currentIndex: number }) {
  const answered = questions.filter((q) => answers[q.n] !== undefined).length
  const sections = (['FG', 'CE'] as Section[]).filter((s) => questions.some((q) => q.section === s))

  return (
    <div
      role="progressbar"
      aria-label="Questões marcadas"
      aria-valuemin={0}
      aria-valuemax={questions.length}
      aria-valuenow={answered}
      className="flex flex-wrap items-end gap-x-3 gap-y-1"
    >
      {sections.map((section) => (
        <div key={section} className="flex items-end gap-[3px]" title={SECTION_LABEL[section]}>
          {questions.map((q, i) =>
            q.section !== section ? null : (
              <span
                key={q.n}
                className={`w-[3px] rounded-full transition-all ${i === currentIndex ? 'h-5 bg-redpen' : 'h-3.5'} ${
                  i !== currentIndex ? (answers[q.n] !== undefined ? 'bg-pen' : 'bg-rule') : ''
                }`}
              />
            ),
          )}
        </div>
      ))}
      <span className="ml-1 font-mono text-[11px] tabular-nums text-ink-soft">
        {answered}/{questions.length} marcadas
      </span>
    </div>
  )
}
