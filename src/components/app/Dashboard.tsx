import { ArrowRightIcon, CheckIcon, CircleExclamationIcon, HourglassIcon, PlusMediumIcon, SparklesTwoIcon } from 'blode-icons-react'
import { S, STAGES, allTodos, apprState, diffD, fDay, nextDue, pendingFor, rel, rules, short, statusOf } from '@/engine/engine.js'
import { openDlg, openProc, setUI, useUI } from '@/lib/store'
import { Chip, STAGE_BG, STAGE_SOFT, type Tone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Empty, PageHead, Panel, PanelHead } from './Page'

function Kpi({ i, tone, label, value, sub, icon }: { i: number; tone: string; label: string; value: string | number; sub: string; icon: React.ReactNode }) {
  return (
    <div className={cn('rise lift-hover relative overflow-hidden rounded-[28px] p-5', tone)} style={{ ['--i' as string]: i }}>
      <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/30 dark:bg-white/10" />
      <div className="absolute right-4 top-4 grid size-10 place-items-center rounded-2xl bg-white/55 dark:bg-white/15">{icon}</div>
      <div className="pr-12 text-sm font-semibold opacity-80">{label}</div>
      <div className="font-display mt-4 whitespace-nowrap text-[clamp(1.9rem,2.5vw,2.7rem)] font-extrabold leading-none tracking-tight">{value}</div>
      <div className="mt-2 text-sm opacity-80">{sub}</div>
    </div>
  )
}

function Pipeline() {
  const act = S.procs.filter((p: any) => !p.closed)
  return (
    <Panel i={5} className="mb-5">
      <PanelHead title="Folyamat-térkép" sub="Minden aktív beszerzés a saját PROC-szakaszában – kattintson egy kártyára" />
      <div className="scrollbar-thin grid grid-cols-[repeat(6,minmax(10.75rem,1fr))] gap-3 overflow-x-auto px-4 pb-5">
        {STAGES.map((st: string[], idx: number) => {
          const list = act.filter((p: any) => p.stage === idx + 1)
          return (
            <div key={st[0]} className="flex flex-col gap-2 rounded-3xl bg-muted/60 p-2">
              <div className={cn('flex items-center justify-between rounded-2xl px-3 py-2', STAGE_SOFT[idx])}>
                <div><div className="text-[10px] font-extrabold tracking-[0.14em] opacity-70">{st[0]}</div><div className="font-display font-bold leading-tight">{st[1]}</div></div>
                <span className={cn('grid size-7 place-items-center rounded-full text-sm font-extrabold text-white', STAGE_BG[idx])}>{list.length}</span>
              </div>
              {list.length === 0 && <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border py-6 text-xs text-muted-foreground">nincs aktív</div>}
              {list.map((p: any) => {
                const s = statusOf(p), n = nextDue(p)
                return (
                  <button key={p.id} onClick={() => openProc(p.id)} className="lift-hover rounded-2xl bg-card p-3 text-left lift">
                    <span className="block whitespace-nowrap font-mono text-[11px] font-bold text-primary">{p.id}</span><Chip tone={s.t as Tone} dot className="mt-1 !px-2 !text-[10px]">{s.l}</Chip>
                    <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{p.subject}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span className="font-semibold text-foreground">{short(p.value)}</span><span>{n.date ? rel(n.date) : ''}</span></div>
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
  const first = String(S.user).split(' ').pop()

  return (
    <>
      <PageHead kicker={fDay(S.today)} title={`Szia, ${first}!`} sub="A következő döntések és határidők igényelnek figyelmet – minden lépés felelőshöz, határidőhöz és auditnaplóhoz kötött."
        actions={<><Button variant="outline" onClick={() => openDlg({ type: 'task' })}>Új feladat</Button><Button onClick={() => openDlg({ type: 'new' })}><PlusMediumIcon />Új beszerzés</Button></>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={1} tone="bg-s2-soft text-s2-ink" label="Aktív beszerzések" value={act.length} sub={`${newW} új folyamat ezen a héten`} icon={<SparklesTwoIcon className="size-5" />} />
        <Kpi i={2} tone="bg-s3-soft text-s3-ink" label="Jóváhagyásra vár" value={pend} sub={`${mine} döntés Önnél van`} icon={<CheckIcon className="size-5" />} />
        <Kpi i={3} tone="bg-s1-soft text-s1-ink" label="Közeli határidő / eltérés" value={near} sub={`${hiany} dokumentációs hiány`} icon={<HourglassIcon className="size-5" />} />
        <Kpi i={4} tone="bg-s5-soft text-s5-ink" label="Aktív beszerzési érték" value={short(val)} sub={`Nettó, becsült összérték`} icon={<span className="font-display text-sm font-extrabold">Ft</span>} />
      </div>
      <Pipeline />
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Panel i={6}>
          <PanelHead title="Teendők" sub="Prioritás és határidő szerint"
            right={<div className="flex rounded-full bg-muted p-1 text-sm font-semibold">{[['all', 'Összes határidő'], ['me', 'Nekem']].map(([k, l]) => <button key={k} onClick={() => setUI({ dashTab: k })} className={cn('rounded-full px-3 py-1', u.dashTab === k ? 'bg-card lift' : 'text-muted-foreground')}>{l}</button>)}</div>} />
          {todos.length === 0 ? <Empty>Nincs Önre váró teendő.</Empty> : todos.slice(0, 7).map((t: any) => (
            <button key={t.pid + t.title} onClick={() => openProc(t.pid)} className="group flex w-full items-center gap-4 border-t border-border px-6 py-3.5 text-left hover:bg-muted/50">
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', t.tone === 'warn' ? 'bg-s2-soft text-s2-ink' : t.tone === 'bad' ? 'bg-s1-soft text-s1-ink' : 'bg-s4-soft text-s4-ink')}>
                {t.ic === 'check' ? <CheckIcon className="size-5" /> : t.ic === 'alert' ? <CircleExclamationIcon className="size-5" /> : <ArrowRightIcon className="size-5" />}
              </span>
              <span className="min-w-0 flex-1"><b className="block truncate">{t.title}</b><span className="block truncate text-sm text-muted-foreground">{t.sub}</span></span>
              <span className="text-right"><b className={cn('block', t.date && t.date <= S.today && 'text-destructive')}>{rel(t.date)}</b><span className="text-sm text-muted-foreground">{t.right}</span></span>
            </button>
          ))}
        </Panel>
        <Panel i={7}>
          <PanelHead title="Szabályzati kontroll" sub="Élő figyelmeztetések az aktív folyamatokból" />
          <div className="flex flex-col gap-2 px-4 pb-4">
            {warns.length === 0 && <Empty>Minden szabály teljesül.</Empty>}
            {warns.slice(0, 6).map((w, i) => (
              <button key={i} onClick={() => openProc(w.pid)} className={cn('rounded-2xl p-3 text-left text-sm', w.s === 'bad' ? 'bg-s1-soft text-s1-ink' : 'bg-s2-soft text-s2-ink')}>
                <span className="font-mono text-[11px] font-bold opacity-80">{w.pid}</span><span className="block font-medium leading-snug">{w.t}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  )
}
