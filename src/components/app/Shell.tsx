import { useEffect, type ReactNode } from 'react'
import {
  BookIcon, CalendarCheckIcon, ChecklistIcon, ClipboardIcon, ClockIcon,
  LayoutDashboardIcon, MoonIcon, PlusMediumIcon, SearchMenuIcon, ShieldCheckIcon, SunIcon, TasksIcon,
} from 'blode-icons-react'
import { S, USERS, STAGES, pendingFor, statusOf, fDay, WDN, pd, short } from '@/engine/engine.js'
import { clockNext, resetDemo } from '@/engine/commands.js'
import { commit, openDlg, openProc, setUI, useUI, type View } from '@/lib/store'
import { Person } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Switch } from '@/components/ui/switch'
import { Kbd } from '@/components/ui/kbd'

const NAV: { id: View; label: string; icon: typeof BookIcon; hue: string; count?: () => number }[] = [
  { id: 'dash', label: 'Irányítópult', icon: LayoutDashboardIcon, hue: 'bg-s5-soft text-s5-ink' },
  { id: 'procs', label: 'Beszerzések', icon: ClipboardIcon, hue: 'bg-s2-soft text-s2-ink', count: () => S.procs.filter((p: any) => !p.closed).length },
  { id: 'appr', label: 'Jóváhagyásaim', icon: ChecklistIcon, hue: 'bg-s3-soft text-s3-ink', count: () => pendingFor(S.user).length },
  { id: 'tasks', label: 'Feladatok', icon: TasksIcon, hue: 'bg-s4-soft text-s4-ink', count: () => S.tasks.filter((t: any) => !t.done && t.owner === S.user).length },
  { id: 'audit', label: 'Auditnapló', icon: ClockIcon, hue: 'bg-s6-soft text-s6-ink' },
  { id: 'policy', label: 'Szabályzat', icon: BookIcon, hue: 'bg-s1-soft text-s1-ink' },
]
const TITLES: Record<View, string> = { dash: 'Irányítópult', procs: 'Beszerzések', appr: 'Jóváhagyásaim', tasks: 'Feladatok', audit: 'Auditnapló', policy: 'Szabályzat' }

function Logo() {
  return (
    <div className="flex items-center gap-3 px-2 pb-2 pt-1">
      <div className="relative grid size-11 place-items-center rounded-2xl text-lg font-extrabold text-white" style={{ background: 'conic-gradient(from 210deg, var(--s1), var(--s2), var(--s3), var(--s4), var(--s5), var(--s6), var(--s1))' }}>
        <span className="absolute inset-[3px] grid place-items-center rounded-[13px] bg-card font-display text-primary">F</span>
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg font-extrabold tracking-tight">Fonte Viva</div>
        <div className="text-xs text-muted-foreground">Beszerzési központ</div>
      </div>
    </div>
  )
}

function Sidebar() {
  const u = useUI()
  const wd = (WDN as string[])[pd(S.today).getUTCDay()]
  return (
    <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[17rem] shrink-0 flex-col gap-4 rounded-[28px] bg-card p-3 lift lg:flex">
      <Logo />
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const on = u.view === n.id, c = n.count?.()
          return (
            <button key={n.id} onClick={() => setUI({ view: n.id, open: null })} className={cn('group flex items-center gap-3 rounded-2xl px-2 py-2 text-left text-[15px] font-semibold', on ? 'bg-accent text-accent-foreground' : 'text-foreground/75 hover:bg-muted')}>
              <span className={cn('grid size-9 place-items-center rounded-xl transition-transform duration-200 group-hover:-rotate-6', n.hue)}><n.icon className="size-[18px]" /></span>
              <span className="flex-1">{n.label}</span>
              {c ? <span className={cn('grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{c}</span> : null}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-3xl bg-s2-soft p-4 text-s2-ink">
          <SunIcon className="absolute -right-3 -top-3 size-20 rotate-12 opacity-25" />
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">Demó dátuma</div>
          <div className="font-display text-xl font-extrabold leading-tight">{fDay(S.today)}</div>
          <div className="text-sm capitalize opacity-80">{wd}</div>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-xl bg-card/80 px-2 py-1.5 text-xs font-bold text-foreground hover:bg-card" onClick={() => { clockNext(); commit() }}>+1 munkanap</button>
            <button className="rounded-xl bg-card/50 px-2 py-1.5 text-xs font-bold text-foreground hover:bg-card" onClick={() => { if (confirm('Visszaállítja a demó adatait az induló állapotra?')) { resetDemo(); setUI({ open: null, view: 'dash' }); commit() } }}>Alaphelyzet</button>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-s3-soft px-3 py-2.5 text-s3-ink">
          <ShieldCheckIcon className="size-5 shrink-0" />
          <div className="text-xs leading-tight"><b className="block text-[13px]">Auditált munkamenet</b>Entra ID azonosítás aktív</div>
        </div>
        <button className="px-2 text-left text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => openDlg({ type: 'about' })}>A demóról</button>
      </div>
    </aside>
  )
}

export function UserMenu({ compact }: { compact?: boolean }) {
  const me = (USERS as any[]).find((x) => x.n === S.user)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 rounded-2xl bg-card py-1.5 pl-1.5 pr-4 text-left lift">
          <Person name={S.user} size="md" />
          {!compact && <span className="hidden text-xs leading-tight text-muted-foreground sm:block">{me.role}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align={compact ? "start" : "end"} side={compact ? "top" : "bottom"} className="w-[22rem] p-2">
        <div className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Megjelenítés mint</div>
        <div className="scrollbar-thin max-h-[52vh] overflow-auto">
          {(USERS as any[]).map((x) => (
            <button key={x.n} onClick={() => { S.user = x.n; commit() }} className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-muted', x.n === S.user && 'bg-accent')}>
              <Person name={x.n} sub={x.role} size="md" />
            </button>
          ))}
        </div>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl bg-muted p-3 text-sm">
          <Switch checked={S.strict} onCheckedChange={(v: boolean) => { S.strict = v; commit() }} />
          <span><b>Szigorú szerepkör-ellenőrzés</b><span className="block text-xs text-muted-foreground">Minden lépést csak a felelős végezhet. A jóváhagyások mindig szigorúak.</span></span>
        </label>
      </PopoverContent>
    </Popover>
  )
}

function Palette() {
  const u = useUI()
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setUI({ palette: !u.palette }) } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })
  const go = (fn: () => void) => { setUI({ palette: false }); fn() }
  return (
    <CommandDialog open={u.palette} onOpenChange={(o: boolean) => setUI({ palette: o })} title="Keresés" description="Beszerzések, oldalak, műveletek">
      <CommandInput placeholder="Azonosító, tárgy vagy beszállító…" />
      <CommandList>
        <CommandEmpty>Nincs találat.</CommandEmpty>
        <CommandGroup heading="Beszerzések">
          {S.procs.map((p: any) => (
            <CommandItem key={p.id} value={`${p.id} ${p.subject} ${p.bidders.map((b: any) => b.name).join(' ')}`} onSelect={() => go(() => openProc(p.id))}>
              <span className="mr-3 font-mono text-xs font-bold text-primary">{p.id}</span><span className="flex-1 truncate">{p.subject}</span>
              <span className="ml-2 text-xs text-muted-foreground">{short(p.value)} · {STAGES[p.stage - 1][0]} · {statusOf(p).l}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Ugrás">
          {NAV.map((n) => <CommandItem key={n.id} value={'ugrás ' + n.label} onSelect={() => go(() => setUI({ view: n.id, open: null }))}><n.icon className="mr-2" />{n.label}</CommandItem>)}
          <CommandItem value="új beszerzés indítása" onSelect={() => go(() => openDlg({ type: 'new' }))}><PlusMediumIcon className="mr-2" />Új beszerzés indítása</CommandItem>
          <CommandItem value="új feladat" onSelect={() => go(() => openDlg({ type: 'task' }))}><CalendarCheckIcon className="mr-2" />Új feladat</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const u = useUI()
  const dark = S.theme === 'dark'
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  return (
    <div className="flex min-h-screen gap-4 p-3 lg:p-4">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-3 z-30 mb-5 flex items-center gap-3 rounded-[24px] bg-card/85 px-4 py-2.5 backdrop-blur-md lift lg:top-4">
          <h2 className="font-display truncate text-xl font-extrabold sm:text-2xl">{TITLES[u.view]}</h2>
          <span className="hidden rounded-full bg-s5-soft px-2.5 py-1 text-[11px] font-bold tracking-wider text-s5-ink sm:inline">KATTINTHATÓ DEMÓ</span>
          <button onClick={() => setUI({ palette: true })} aria-label="Keresés" className="ml-auto flex h-11 items-center gap-2 rounded-2xl bg-muted px-3 text-left text-sm text-muted-foreground hover:bg-accent/60 md:w-full md:max-w-md">
            <SearchMenuIcon className="size-4" /><span className="hidden flex-1 truncate md:block">Keresés azonosító, tárgy vagy beszállító alapján</span><Kbd className="hidden md:inline-flex">Ctrl K</Kbd>
          </button>
          <button aria-label="Téma váltása" className="grid size-11 place-items-center rounded-2xl bg-card lift" onClick={() => { S.theme = dark ? 'light' : 'dark'; commit() }}>
            {dark ? <SunIcon className="size-5" /> : <MoonIcon className="size-5" />}
          </button>
          <UserMenu />
        </header>
        <main key={u.view} className="pb-28 lg:pb-16">{children}</main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-between rounded-[26px] bg-card/95 p-1.5 backdrop-blur-md lift lg:hidden">
        {NAV.map((n) => { const on = u.view === n.id; return (
          <button key={n.id} aria-label={n.label} onClick={() => setUI({ view: n.id, open: null })} className={cn('relative grid flex-1 place-items-center rounded-2xl py-2', on ? 'bg-accent' : '')}>
            <span className={cn('grid size-9 place-items-center rounded-xl', n.hue)}><n.icon className="size-[18px]" /></span>
            {n.count?.() ? <span className="absolute right-2 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{n.count()}</span> : null}
          </button>) })}
      </nav>
      <Palette />
    </div>
  )
}
