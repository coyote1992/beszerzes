import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHead({ kicker, title, sub, actions }: { kicker?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="rise mb-6 flex flex-wrap items-end justify-between gap-4" style={{ ['--i' as string]: 0 }}>
      <div>
        {kicker && <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{kicker}</div>}
        <h1 className="font-display text-4xl font-extrabold leading-none md:text-5xl">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
export function Panel({ className, children, i = 1 }: { className?: string; children: ReactNode; i?: number }) {
  return <section className={cn('rise rounded-[28px] bg-card lift', className)} style={{ ['--i' as string]: i }}>{children}</section>
}
export function PanelHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
      <div><h3 className="font-display text-xl font-bold">{title}</h3>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>
      {right}
    </div>
  )
}
export const Empty = ({ children }: { children: ReactNode }) => <div className="px-6 py-10 text-center text-sm text-muted-foreground">{children}</div>
