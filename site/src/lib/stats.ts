import { score } from './score'
import type { Attempt } from './storage'
import type { ExamVersion } from './types'

export interface Summary {
  finished: number
  inProgress: number
  /** média dos percentuais das provas concluídas */
  average: number | null
  best: { id: string; percent: number } | null
  /** prova em andamento mexida por último */
  resume: ExamVersion | null
  /** questão onde parou nessa prova */
  resumeQuestion: number | null
}

export function summarize(versions: ExamVersion[], load: (id: string) => Attempt): Summary {
  const percents: { id: string; percent: number }[] = []
  let inProgress = 0
  let resume: { version: ExamVersion; at: string; question: number } | null = null

  for (const version of versions) {
    const attempt = load(version.id)
    if (attempt.finishedAt) {
      percents.push({ id: version.id, percent: score(version.questions, attempt.answers).percent })
      continue
    }
    const numbers = new Set(version.questions.map((q) => q.n))
    const answered = Object.keys(attempt.answers).some((n) => numbers.has(Number(n)))
    if (!answered) continue
    inProgress++
    const at = attempt.updatedAt ?? ''
    const firstBlank = version.questions.find((q) => attempt.answers[q.n] === undefined)?.n
    const question = attempt.lastQuestion ?? firstBlank ?? version.questions[0].n
    if (!resume || at > resume.at) resume = { version, at, question }
  }

  const best = percents.reduce<Summary['best']>((b, p) => (!b || p.percent > b.percent ? p : b), null)
  const average = percents.length
    ? Math.round(percents.reduce((sum, p) => sum + p.percent, 0) / percents.length)
    : null

  return {
    finished: percents.length,
    inProgress,
    average,
    best,
    resume: resume?.version ?? null,
    resumeQuestion: resume?.question ?? null,
  }
}

export function performanceMessage(percent: number): { title: string; subtitle: string } {
  if (percent >= 80) return { title: 'Excelente!', subtitle: 'Desempenho de destaque. Revise os erros e parta para outra prova.' }
  if (percent >= 60) return { title: 'Muito bem!', subtitle: 'Acima da média. Os erros mostram exatamente onde focar.' }
  if (percent >= 40) return { title: 'Bom caminho', subtitle: 'Você está evoluindo. Revise as questões erradas com calma.' }
  return { title: 'Continue treinando', subtitle: 'Cada prova feita é treino. Revise os erros e tente de novo.' }
}
