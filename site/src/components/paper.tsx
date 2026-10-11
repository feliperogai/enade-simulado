import type { CSSProperties, ReactNode } from 'react'

type Tone = 'red' | 'blue' | 'green' | 'ink'

const TONE: Record<Tone, string> = {
  red: 'text-redpen border-redpen',
  blue: 'text-pen border-pen',
  green: 'text-greenpen border-greenpen',
  ink: 'text-ink-soft border-ink-soft',
}

/** Carimbo de borracha: borda dupla, tinta um pouco gasta, levemente torto. */
export function Stamp({
  children, tone = 'red', rotate = -8, animate = false, className = '',
}: { children: ReactNode; tone?: Tone; rotate?: number; animate?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[3px] border-2 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] opacity-85 outline-1 outline-offset-2 outline-current mix-blend-multiply dark:mix-blend-screen ${TONE[tone]} ${animate ? 'stamp-in' : ''} ${className}`}
      style={{ transform: `rotate(${rotate}deg)`, '--stamp-rotate': `${rotate}deg`, outlineStyle: 'solid' } as CSSProperties}
    >
      {children}
    </span>
  )
}

/** Post-it colado com fita. */
export function PostIt({ children, rotate = 2, className = '' }: { children: ReactNode; rotate?: number; className?: string }) {
  return (
    <div
      className={`relative bg-postit p-5 pt-6 text-[#3a3100] shadow-[0_18px_30px_-18px_rgb(70_50_0/0.6),0_2px_4px_rgb(70_50_0/0.12)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 -rotate-3 bg-white/55 shadow-sm backdrop-blur-[1px] dark:bg-white/25"
      />
      {children}
    </div>
  )
}

/** Círculo feito à caneta em volta do conteúdo. */
export function HandCircle({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 220 110"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -left-[18%] -top-[26%] h-[152%] w-[136%] overflow-visible"
      >
        <path
          d="M44 23C84 6 170 4 203 33C224 53 205 86 156 97C104 108 33 103 13 72C-4 46 34 21 92 15C121 12 150 13 168 19"
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="draw text-redpen"
          style={{ animationDelay: `${delay}ms` }}
        />
      </svg>
    </span>
  )
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export function HandCheck({ className = 'size-5 text-greenpen', animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M3.5 13.5C6 15 8 17.5 9.6 20.5C12 14 15.5 8.5 21 3.5" pathLength={1} strokeWidth="2.6" {...stroke} className={animate ? 'draw' : ''} />
    </svg>
  )
}

export function HandCross({ className = 'size-5 text-redpen', animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M5 4.5C9.5 9 13.5 13.5 19.5 20" pathLength={1} strokeWidth="2.6" {...stroke} className={animate ? 'draw' : ''} />
      <path d="M19 4C14 9.5 10 13.5 4.5 19.5" pathLength={1} strokeWidth="2.6" {...stroke} className={animate ? 'draw' : ''} style={{ animationDelay: '120ms' }} />
    </svg>
  )
}

export function HandUnderline({ className = 'text-redpen' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true" className={`h-3 w-full ${className}`}>
      <path d="M3 9C40 3 80 12 118 6C148 2 172 7 197 5" pathLength={1} strokeWidth="2.6" {...stroke} className="draw" />
    </svg>
  )
}

/** Rótulo pequeno em fonte de máquina, como os campos impressos na prova. */
export function Kicker({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint ${className}`}>{children}</p>
  )
}
