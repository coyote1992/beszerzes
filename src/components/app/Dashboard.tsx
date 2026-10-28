import { ArrowRightIcon, CheckIcon, CircleExclamationIcon, CompassRoundIcon, PlusMediumIcon, SettingsGear1Icon } from 'blode-icons-react'
import { S, STAGES, allTodos, apprState, diffD, fDay, nextDue, pendingFor, rel, rules, short, statusOf } from '@/engine/engine.js'
import { openDlg, openProc, setUI, useUI } from '@/lib/store'
import { Chip, type Tone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Empty, PageHead, Panel, PanelHead } from './Page'
import { TestBadge } from './Pages'

function Kpi({ i, label, value, sub }: { i: number; label: string; value: string | number; sub: string }) {
  return (
    <div className="rise rounded-lg border bg-card p-4" style={{ ['--i' as string]: i }}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 whitespace-nowrap text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

function Pipeline() {
  const act = S.procs.filter((p: any) => !p.closed)
  return (
    <Panel i={5} className="mb-4">
      <PanelHead title="Folyamat-térkép" sub="Aktív beszerzések PROC-szakaszonként" />
      <div className="scrollbar-thin grid grid-cols-[repeat(6,minmax(9.5rem,1fr))] gap-2 overflow-x-auto px-3 pb-3">
        {STAGES.map((st: string[], idx: number) => {
          const list = act.filter((p: any) => p.stage === idx + 1)
          return (
            <div key={st[0]} className="flex flex-col gap-1.5 rounded-md bg-muted/60 p-1.5">
              <div className="flex items-center justify-between px-1.5 py-1">
                <div><div className="font-mono text-[10px] text-muted-foreground">{st[0]}</div><div className="text-sm font-medium leading-tight">{st[1]}</div></div>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">{list.length}</span>
              </div>
              {list.length === 0 && <div className="grid flex-1 place-items-center rounded-md border border-dashed py-4 text-xs text-muted-foreground">–</div>}
              {list.map((p: any) => {
                const s = statusOf(p), n = nextDue(p)
                return (
                  <button key={p.id} onClick={() => openProc(p.id)} className="lift-hover rounded-md border bg-card p-2 text-left">
                    <span className="flex items-center gap-1 whitespace-nowrap font-mono text-[10px] text-muted-foreground">{p.id}{p.test && <TestBadge />}</span>
                    <div className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug">{p.subject}</div>
                    <Chip tone={s.t as Tone} dot className="mt-1 !px-1.5 !text-[10px]">{s.l}</Chip>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground"><span className="font-medium text-foreground">{short(p.value)}</span><span>{n.date ? rel(n.date) : ''}</span></div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

function Welcome() {
  const admin = !!S.me?.admin
  const step = (n: number, title: string, text: string, action: React.ReactNode) => (
    <div className="flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{n}</span>
      <div className="min-w-0 flex-1"><div className="text-sm font-medium">{title}</div><div className="text-sm text-muted-foreground">{text}</div></div>
      {action}
    </div>
  )
  return (
    <Panel i={1} className="mb-4">
      <PanelHead title="Első lépések" sub="Az alkalmazás üres – néhány perc alatt beállítható." />
      {step(1, 'Ismerd meg az alkalmazást', 'Rövid, kattintható bemutató a fő funkciókról.', <Button size="sm" variant="outline" onClick={() => setUI({ tour: 0 })}><CompassRoundIcon />Bemutató</Button>)}
      {step(2, 'Szerepkörök kijelölése', admin ? 'Jelöld ki a CEO-t, a CFO-t, az SCM vezetőt és a többi szerepkört, valamint a költséghely-jóváhagyókat. A kollégák az első bejelentkezéskor kerülnek a listára – előre is felveheted őket.' : 'Az adminisztrátor jelöli ki a szerepköröket (CEO, CFO, SCM…) és a költséghely-jóváhagyókat.', <Button size="sm" variant="outline" onClick={() => setUI({ view: 'settings' })}><SettingsGear1Icon />Beállítások</Button>)}
      {step(3, 'Első beszerzés', 'Indíts egy beszerzést. Gyakorláshoz jelöld be a „Gyakorló (TESZT)” opciót – az ilyen beszerzés külön mappába kerül, és utólag véglegesen törölhető.', <Button size="sm" onClick={() => openDlg({ type: 'new' })}><PlusMediumIcon />Új beszerzés</Button>)}
    </Panel>
  )
}

export function Dashboard() {
  const u = useUI()
  const act = S.procs.filter((p: any) => !p.closed)
  const pend = act.reduce((n: number, p: any) => n + Object.keys(p.appr).filter((k) => apprState(p, k).status === 'pending').length, 0)
  const mine = pendingFor(S.user).length
  let near = 0, hiany = 0
  act.forEach((p: any) => { const n = nextDue(p); if (n.date && diffD(S.today, n.date) <= 5) near++; if (p.proc === 'Vészhelyzeti' && statusOf(p).l === 'Dokumentáció hiányos') hiany++ })
  const val = act.reduce((s: number, p: any) => s + p.value, 0)
  const newW = act.filter((p: any) => diffD(p.created, S.today) <= 7).length
  const todos = allTodos(u.dashTab === 'me' ? S.user : null)
  const warns: { pid: string; t: string; s: string }[] = []
  act.forEach((p: any) => rules(p).forEach((r: any) => { if (r.s !== 'ok') warns.push({ pid: p.id, t: r.t, s: r.s }) }))
  const first = String(S.me?.name || '').trim().split(/\s+/).pop()
  const fresh = S.procs.length === 0

  return (
    <>
      <PageHead kicker={fDay(S.today)} title={first ? `Szia, ${first}!` : 'Irányítópult'} sub="A következő döntések és határidők, amelyek figyelmet igényelnek."
        actions={<><Button variant="outline" onClick={() => openDlg({ type: 'task' })}>Új feladat</Button><Button onClick={() => openDlg({ type: 'new' })} data-tour="new"><PlusMediumIcon />Új beszerzés</Button></>} />
      {fresh && <Welcome />}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4" data-tour="kpis">
        <Kpi i={1} label="Aktív beszerzések" value={act.length} sub={`${newW} új ezen a héten`} />
        <Kpi i={2} label="Jóváhagyásra vár" value={pend} sub={`${mine} döntés nálad`} />
        <Kpi i={3} label="Közeli határidő (5 napon belül)" value={near} sub={`${hiany} dokumentációs hiány`} />
        <Kpi i={4} label="Aktív beszerzési érték" value={short(val)} sub="Nettó, becsült összérték" />
      </div>
      {!fresh && <Pipeline />}
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel i={6}>
          <PanelHead title="Teendők" sub="Prioritás és határidő szerint"
            right={<div className="flex rounded-md bg-muted p-0.5 text-xs font-medium">{[['all', 'Összes'], ['me', 'Nekem']].map(([k, l]) => <button key={k} onClick={() => setUI({ dashTab: k })} className={cn('rounded px-2.5 py-1', u.dashTab === k ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{l}</button>)}</div>} />
          {todos.length === 0 ? <Empty>Nincs teendő.</Empty> : todos.slice(0, 8).map((t: any) => (
            <button key={t.pid + t.title} onClick={() => openProc(t.pid)} className="flex w-full items-center gap-3 border-t px-4 py-2.5 text-left hover:bg-muted/50">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-md', t.tone === 'bad' ? 'bg-s1-soft text-s1-ink' : t.tone === 'warn' ? 'bg-s2-soft text-s2-ink' : 'bg-muted')}>
                {t.ic === 'check' ? <CheckIcon className="size-3.5" /> : t.ic === 'alert' ? <CircleExclamationIcon className="size-3.5" /> : <ArrowRightIcon className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{t.title}</span><span className="block truncate text-xs text-muted-foreground">{t.sub}</span></span>
              <span className="text-right"><span className={cn('block text-sm font-medium', t.date && t.date <= S.today && 'text-destructive')}>{rel(t.date)}</span><span className="text-xs text-muted-foreground">{t.right}</span></span>
            </button>
          ))}
        </Panel>
        <Panel i={7}>
          <PanelHead title="Szabályzati kontroll" sub="Élő figyelmeztetések az aktív beszerzésekből" />
          <div className="flex flex-col gap-1.5 px-3 pb-3">
            {warns.length === 0 && <Empty>Minden szabály teljesül.</Empty>}
            {warns.slice(0, 6).map((w, i) => (
              <button key={i} onClick={() => openProc(w.pid)} className={cn('rounded-md border p-2.5 text-left text-sm hover:bg-muted/50', w.s === 'bad' && 'border-s1/30')}>
                <span className="font-mono text-[10px] text-muted-foreground">{w.pid}</span><span className="block leading-snug">{w.t}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
