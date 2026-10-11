import { courseKey, type CourseKey } from '../lib/courses'

interface CoverStyle {
  /** faixa e lombada da capa */
  band: string
  /** texto na cor do curso */
  text: string
  /** marcador de aba / filtro */
  dot: string
}

/** Uma cor de capa por curso, como cadernos impressos; nunca muda. */
export const COVER: Record<CourseKey, CoverStyle> = {
  cc: { band: 'bg-cc', text: 'text-cc', dot: 'bg-cc' },
  ec: { band: 'bg-ec', text: 'text-ec', dot: 'bg-ec' },
  si: { band: 'bg-si', text: 'text-si', dot: 'bg-si' },
  lic: { band: 'bg-lic', text: 'text-lic', dot: 'bg-lic' },
}

export function coverStyle(course: string): CoverStyle {
  return COVER[courseKey(course)]
}
