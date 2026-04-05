/** Formato de public/data/exams.json, gerado por `python -m pipeline.build`. */

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E'
export const LETTERS: readonly Letter[] = ['A', 'B', 'C', 'D', 'E']

export type Section = 'FG' | 'CE'
export const SECTION_LABEL: Record<Section, string> = {
  FG: 'Formação Geral',
  CE: 'Componente Específico',
}

export interface Question {
  n: number
  section: Section
  /** null = questão anulada */
  answer: Letter | null
  image: string
  width: number
  height: number
}

export interface ExamVersion {
  id: string
  year: number
  course: string
  booklet: string
  questions: Question[]
}

export interface ExamsData {
  generatedAt: string
  versions: ExamVersion[]
}

export type Answers = Record<number, Letter>

export function isLetter(value: unknown): value is Letter {
  return typeof value === 'string' && (LETTERS as readonly string[]).includes(value)
}
