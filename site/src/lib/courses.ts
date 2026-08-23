export type CourseKey = 'cc' | 'ec' | 'si' | 'lic'

export interface CourseMeta {
  key: CourseKey
  /** nome para filtros e legendas */
  label: string
  /** sigla curta para chips */
  short: string
}

/** Ordem fixa (cor e posição de cada curso nunca mudam). */
export const COURSES: readonly CourseMeta[] = [
  { key: 'cc', label: 'Ciência da Computação', short: 'CC' },
  { key: 'ec', label: 'Engenharia de Computação', short: 'EC' },
  { key: 'si', label: 'Sistemas de Informação', short: 'SI' },
  { key: 'lic', label: 'Licenciatura', short: 'Lic' },
]

export function courseKey(course: string): CourseKey {
  if (/licenciatura/i.test(course)) return 'lic'
  if (/engenharia/i.test(course)) return 'ec'
  if (/sistemas de informa/i.test(course)) return 'si'
  return 'cc'
}

export function isCourseKey(value: unknown): value is CourseKey {
  return COURSES.some((c) => c.key === value)
}
