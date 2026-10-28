import type { ReactNode } from 'react'
import { S, typeOf, STAGES, nm, unassigned, rolesOf, CEO, CFO } from '@/engine/engine.js'
import { cn } from '@/lib/utils'

export const SC = (n: number) => `s${Math.min(6, Math.max(1, n))}`
/** Static class maps so Tailwind can see every class name */
export const STAGE_BG = ['bg-primary', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary']
export const STAGE_SOFT = ['bg-muted text-foreground', 'bg-muted text-foreground', 'bg-muted text-foreground', 'bg-muted text-foreground', 'bg-muted text-foreground', 'bg-muted text-foreground']
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

const initials = (n: string) => n.replace(/^(dr\.?|ifj\.?|id\.?)\s+/i, '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
/** A person chip. `name` is a person key (e-mail) or an unassigned role / cost-centre placeholder. */
export function Person({ name, sub, size = 'sm' }: { name: string; sub?: string; size?: 'sm' | 'md' }) {
  const s = size === 'md' ? 'size-8 text-[11px]' : 'size-5 text-[9px]'
  if (unassigned(name)) return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground">{nm(name)}</span>
  const label = nm(name) || name
  return (
    <span className="inline-flex min-w-0 items-center gap-2 whitespace-nowrap">
      <span className={cn('grid shrink-0 place-items-center rounded-full bg-muted font-semibold text-foreground', s)}>{initials(label)}</span>
      <span className="min-w-0 truncate text-[13px]">{label}{sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}</span>
    </span>
  )
}
export const People = ({ who }: { who: string }) => <span className="inline-flex flex-wrap gap-x-3 gap-y-1">{String(who || '').split(' + ').filter(Boolean).map((n) => <Person key={n} name={n} />)}</span>
export const fixName = (n: string) => (n === CEO ? 'CEO' : n === CFO ? 'CFO' : nm(n))
export const activePeople = () => (S?.people || []).filter((p: any) => p.active !== false).sort((a: any, b: any) => a.name.localeCompare(b.name, 'hu'))
export const peopleOpts = (withEmpty?: string): [string, string][] => [...(withEmpty !== undefined ? [['', withEmpty] as [string, string]] : []), ...activePeople().map((p: any) => [p.email, `${p.name}${rolesOf(p.email).length ? ' – ' + rolesOf(p.email).join(', ') : ''}`] as [string, string])]
