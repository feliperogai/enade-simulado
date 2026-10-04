import type { ComponentType, ReactNode, SVGProps } from 'react'
import { courseKey, type CourseKey } from '../lib/courses'
import { CapIcon, ChartIcon, CodeIcon, CpuIcon } from './icons'

interface CourseStyle {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** ícone/rótulo sobre fundo tingido */
  badge: string
  /** traço do anel de progresso */
  stroke: string
  /** borda e brilho no hover do cartão */
  hover: string
  /** mancha de cor decorativa */
  blob: string
  /** ponto da linha do tempo / filtro ativo */
  dot: string
}

/** Uma cor por curso, sempre a mesma em todo o site. */
export const COURSE_STYLE: Record<CourseKey, CourseStyle> = {
  cc: {
    Icon: CodeIcon,
    badge: 'bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20',
    stroke: 'stroke-violet-500 dark:stroke-violet-400',
    hover: 'hover:border-violet-400/50 hover:shadow-violet-500/15 dark:hover:border-violet-400/40',
    blob: 'bg-violet-500/20 dark:bg-violet-500/25',
    dot: 'bg-violet-500',
  },
  ec: {
    Icon: CpuIcon,
    badge: 'bg-cyan-500/12 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/20',
    stroke: 'stroke-cyan-500 dark:stroke-cyan-400',
    hover: 'hover:border-cyan-400/50 hover:shadow-cyan-500/15 dark:hover:border-cyan-400/40',
    blob: 'bg-cyan-500/20 dark:bg-cyan-500/20',
    dot: 'bg-cyan-500',
  },
  si: {
    Icon: ChartIcon,
    badge: 'bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
    stroke: 'stroke-amber-500 dark:stroke-amber-400',
    hover: 'hover:border-amber-400/50 hover:shadow-amber-500/15 dark:hover:border-amber-400/40',
    blob: 'bg-amber-500/20 dark:bg-amber-500/15',
    dot: 'bg-amber-500',
  },
  lic: {
    Icon: CapIcon,
    badge: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    stroke: 'stroke-emerald-500 dark:stroke-emerald-400',
    hover: 'hover:border-emerald-400/50 hover:shadow-emerald-500/15 dark:hover:border-emerald-400/40',
    blob: 'bg-emerald-500/20 dark:bg-emerald-500/15',
    dot: 'bg-emerald-500',
  },
}

export function courseStyle(course: string): CourseStyle {
  return COURSE_STYLE[courseKey(course)]
}

export function CourseIcon({ course, className = 'size-10 text-xl' }: { course: string; className?: string }) {
  const s = courseStyle(course)
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl ring-1 ${s.badge} ${className}`} aria-hidden="true">
      <s.Icon />
    </span>
  )
}

interface RingProps {
  /** 0–1 */
  value: number
  course: string
  label: ReactNode
  size?: number
}

/** Anel de progresso no traço do curso; trilho no mesmo tom, mais claro. */
export function ProgressRing({ value, course, label, size = 44 }: RingProps) {
  const r = 18
  const c = 2 * Math.PI * r
  const clamped = Math.min(Math.max(value, 0), 1)
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-slate-900/[0.07] dark:stroke-white/10" />
        {clamped > 0 && (
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${clamped * c} ${c}`}
            className={courseStyle(course).stroke}
          />
        )}
      </svg>
      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </span>
  )
}
