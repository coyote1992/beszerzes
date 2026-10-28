import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import {
  BookIcon, CalendarCheckIcon, ChecklistIcon, CircleCheckIcon, ClipboardIcon, ClockIcon, CompassRoundIcon, LayoutDashboardIcon,
  DoorIcon, MoonIcon, PlusMediumIcon, SearchMenuIcon, SettingsGear1Icon, SunIcon, TasksIcon, TriangleExclamationIcon,
} from 'blode-icons-react'
import { S, STAGES, pendingFor, statusOf, fDay, WDN, pd, short, rolesOf } from '@/engine/engine.js'
import { commit, openDlg, openProc, setUI, useUI, type View } from '@/lib/store'
import { onSyncStatus, syncStatus, flush } from '@/lib/sync'
import { Person } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { Spinner } from '@/components/ui/spinner'

type NavItem = { id: View; label: string; icon: typeof BookIcon; count?: () => number }
const NAV: NavItem[] = [
  { id: 'dash', label: 'Irányítópult', icon: LayoutDashboardIcon },
  { id: 'procs', label: 'Beszerzések', icon: ClipboardIcon, count: () => S.procs.filter((p: any) => !p.closed).length },
  { id: 'appr', label: 'Jóváhagyásaim', icon: ChecklistIcon, count: () => pendingFor(S.user).length },
  { id: 'tasks', label: 'Feladatok', icon: TasksIcon, count: () => S.tasks.filter((t: any) => !t.done && t.owner === S.user).length },
  { id: 'audit', label: 'Auditnapló', icon: ClockIcon },
  { id: 'policy', label: 'Szabályzat', icon: BookIcon },
  { id: 'settings', label: 'Beállítások', icon: SettingsGear1Icon },
]
export const TITLES: Record<View, string> = { dash: 'Irányítópult', procs: 'Beszerzések', appr: 'Jóváhagyásaim', tasks: 'Feladatok', audit: 'Auditnapló', policy: 'Szabályzat', settings: 'Beállítások' }

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <div className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">F</div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight">Fonte Viva</div>
        <div className="text-xs text-muted-foreground">Beszerzési központ</div>
      </div>
    </div>
  )
}

function Sidebar() {
  const u = useUI()
  const wd = (WDN as string[])[pd(S.today).getUTCDay()]
  return (
    <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-56 shrink-0 flex-col gap-3 rounded-lg border bg-card p-2 lg:flex" data-tour="nav">
      <Logo />
      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => {
          const on = u.view === n.id, c = n.count?.()
          return (
            <button key={n.id} data-tour={`nav-${n.id}`} onClick={() => setUI({ view: n.id, open: null })} className={cn('flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium', on ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <n.icon className="size-4" />
              <span className="flex-1">{n.label}</span>
              {c ? <span className={cn('grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{c}</span> : null}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <button data-tour="tour" onClick={() => setUI({ tour: 0, open: null })} className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          <CompassRoundIcon className="size-4" />Bemutató
        </button>
        <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"><span className="block font-medium text-foreground">{fDay(S.today)}</span><span className="capitalize">{wd}</span></div>
      </div>
    </aside>
  )
}

function SyncIndicator() {
  const st = useSyncExternalStore(onSyncStatus, () => JSON.stringify(syncStatus()))
  const s = JSON.parse(st)
  if (s.state === 'saving') return <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Spinner className="size-3.5" />Mentés…</span>
  if (s.state === 'error') return <button title={s.lastError} onClick={() => void flush()} className="flex items-center gap-1.5 text-xs font-medium text-destructive"><TriangleExclamationIcon className="size-3.5" /><span className="hidden sm:inline">Mentési hiba – újra</span></button>
  return <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" title="Minden módosítás mentve a SharePointba"><CircleCheckIcon className="size-3.5" />Mentve</span>
}

function UserMenu() {
  const roles = rolesOf(S.user)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button data-tour="user" className="flex h-9 items-center gap-2 rounded-md border bg-card px-2 text-left hover:bg-muted">
          <Person name={S.user} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-2 py-1.5">
          <div className="text-sm font-semibold">{S.me?.name}</div>
          <div className="truncate text-xs text-muted-foreground">{S.me?.email}</div>
          <div className="mt-1.5 flex flex-wrap gap-1">{roles.map((r: string) => <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{r}</span>)}{S.me?.admin && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">Adminisztrátor</span>}</div>
        </div>
        <div className="my-1 h-px bg-border" />
        <button onClick={() => setUI({ tour: 0, open: null })} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><CompassRoundIcon className="size-4" />Bemutató indítása</button>
        <button onClick={async () => { await flush(); location.href = '/api/auth/logout' }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><DoorIcon className="size-4" />Kijelentkezés</button>
        <p className="px-2 pt-1 text-[11px] text-muted-foreground">A bejelentkezés 10 óráig érvényes.</p>
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
        {S.procs.length > 0 && <CommandGroup heading="Beszerzések">
          {S.procs.map((p: any) => (
            <CommandItem key={p.id} value={`${p.id} ${p.subject} ${p.bidders.map((b: any) => b.name).join(' ')}`} onSelect={() => go(() => openProc(p.id))}>
              <span className="mr-3 font-mono text-xs font-semibold">{p.id}</span><span className="flex-1 truncate">{p.subject}</span>
              <span className="ml-2 text-xs text-muted-foreground">{short(p.value)} · {STAGES[p.stage - 1][0]} · {statusOf(p).l}</span>
            </CommandItem>
          ))}
        </CommandGroup>}
        <CommandGroup heading="Ugrás">
          {NAV.map((n) => <CommandItem key={n.id} value={'ugrás ' + n.label} onSelect={() => go(() => setUI({ view: n.id, open: null }))}><n.icon className="mr-2" />{n.label}</CommandItem>)}
          <CommandItem value="új beszerzés indítása" onSelect={() => go(() => openDlg({ type: 'new' }))}><PlusMediumIcon className="mr-2" />Új beszerzés indítása</CommandItem>
          <CommandItem value="új feladat" onSelect={() => go(() => openDlg({ type: 'task' }))}><CalendarCheckIcon className="mr-2" />Új feladat</CommandItem>
          <CommandItem value="bemutató súgó" onSelect={() => go(() => setUI({ tour: 0, open: null }))}><CompassRoundIcon className="mr-2" />Bemutató</CommandItem>
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
    <div className="flex min-h-screen gap-3 p-2 lg:p-3">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-2 z-30 mb-4 flex h-11 items-center gap-2 rounded-lg border bg-card/90 px-3 backdrop-blur-md lg:top-3">
          <h2 className="truncate text-sm font-semibold">{TITLES[u.view]}</h2>
          <button data-tour="search" onClick={() => setUI({ palette: true })} aria-label="Keresés" className="ml-auto flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-left text-sm text-muted-foreground hover:bg-muted md:w-full md:max-w-xs">
            <SearchMenuIcon className="size-4" /><span className="hidden flex-1 truncate md:block">Keresés…</span><Kbd className="hidden md:inline-flex">Ctrl K</Kbd>
          </button>
          <span data-tour="sync" className="flex"><SyncIndicator /></span>
          <button aria-label="Téma váltása" className="grid size-8 place-items-center rounded-md border hover:bg-muted" onClick={() => { S.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('bsz-theme', S.theme) } catch { /* ignore */ } commit() }}>
            {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </button>
          <UserMenu />
        </header>
        <main key={u.view} className="pb-24 lg:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-2 bottom-2 z-40 flex justify-between rounded-xl border bg-card/95 p-1 backdrop-blur-md lg:hidden">
        {NAV.map((n) => { const on = u.view === n.id; return (
          <button key={n.id} data-tour={`nav-${n.id}`} aria-label={n.label} onClick={() => setUI({ view: n.id, open: null })} className={cn('relative grid h-10 flex-1 place-items-center rounded-lg', on ? 'bg-accent' : '')}>
            <n.icon className="size-[18px]" />
            {n.count?.() ? <span className="absolute right-1.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{n.count()}</span> : null}
          </button>) })}
      </nav>
      <Palette />
    </div>
  )
}
