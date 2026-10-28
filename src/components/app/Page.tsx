import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHead({ kicker, title, sub, actions }: { kicker?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="rise mb-4 flex flex-wrap items-end justify-between gap-3" style={{ ['--i' as string]: 0 }}>
      <div>
        {kicker && <div className="mb-0.5 text-xs font-medium text-muted-foreground">{kicker}</div>}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
export function Panel({ className, children, i = 1 }: { className?: string; children: ReactNode; i?: number }) {
  return <section className={cn('rise rounded-lg border bg-card', className)} style={{ ['--i' as string]: i }}>{children}</section>
}
export function PanelHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3.5">
      <div><h3 className="text-sm font-semibold">{title}</h3>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
      {right}
    </div>
  )
}
export const Empty = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground"><p className="max-w-md">{children}</p>{action}</div>
)
