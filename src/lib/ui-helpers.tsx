import type { ReactNode } from 'react'
import { USERS, typeOf, STAGES } from '@/engine/engine.js'
import { cn } from '@/lib/utils'

export const SC = (n: number) => `s${Math.min(6, Math.max(1, n))}`
/** Static class maps so Tailwind can see every class name */
export const STAGE_BG = ['bg-s1', 'bg-s2', 'bg-s3', 'bg-s4', 'bg-s5', 'bg-s6']
export const STAGE_SOFT = ['bg-s1-soft text-s1-ink', 'bg-s2-soft text-s2-ink', 'bg-s3-soft text-s3-ink', 'bg-s4-soft text-s4-ink', 'bg-s5-soft text-s5-ink', 'bg-s6-soft text-s6-ink']
export const STAGE_TXT = ['text-s1-ink', 'text-s2-ink', 'text-s3-ink', 'text-s4-ink', 'text-s5-ink', 'text-s6-ink']
export const stageName = (n: number) => STAGES[n - 1][1]

export type Tone = 'ok' | 'warn' | 'bad' | 'inf' | 'pur' | 'mut' | 'rose'
const TONE: Record<Tone, string> = {
  ok: 'bg-s3-soft text-s3-ink', warn: 'bg-s2-soft text-s2-ink', bad: 'bg-s1-soft text-s1-ink',
  inf: 'bg-s4-soft text-s4-ink', pur: 'bg-s5-soft text-s5-ink', rose: 'bg-s6-soft text-s6-ink', mut: 'bg-muted text-muted-foreground',
}
export function Chip({ tone = 'mut', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
export const typeTone = (t: string): Tone => (t === 'Kiemelt' ? 'pur' : t === 'Egyszerű' ? 'inf' : 'mut')
export const procTone = (p: string): Tone => (p === 'Tender' ? 'inf' : p === 'SS' ? 'warn' : 'bad')
export const procName = (p: string) => (p === 'SS' ? 'Sole Source' : p)
export const TypeChip = ({ value }: { value: number }) => { const t = typeOf(value); return <Chip tone={typeTone(t)}>{t}</Chip> }

const AVC = ['bg-s1-soft text-s1-ink', 'bg-s2-soft text-s2-ink', 'bg-s3-soft text-s3-ink', 'bg-s4-soft text-s4-ink', 'bg-s5-soft text-s5-ink', 'bg-s6-soft text-s6-ink']
export function Person({ name, sub, size = 'sm' }: { name: string; sub?: string; size?: 'sm' | 'md' }) {
  const u = (USERS as any[]).find((x) => x.n === name)
  const idx = Math.max(0, (USERS as any[]).findIndex((x) => x.n === name)) % 6
  const s = size === 'md' ? 'size-9 text-xs' : 'size-6 text-[10px]'
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={cn('grid shrink-0 place-items-center rounded-full font-bold', s, AVC[idx])}>{u ? u.ini : name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
      <span className="text-sm font-medium">{name}{sub && <span className="block text-xs font-normal text-muted-foreground">{sub}</span>}</span>
    </span>
  )
}
export const People = ({ who }: { who: string }) => <span className="inline-flex flex-wrap gap-x-3 gap-y-1">{String(who || '').split(' + ').filter(Boolean).map((n) => <Person key={n} name={n} />)}</span>
export const fixName = (n: string) => (n === 'Haász Róbert' ? 'CEO' : n === 'Török András' ? 'CFO' : n)
