import type { ReactNode } from 'react'
import { CheckIcon, CircleExclamationIcon, ClockIcon, FileTextIcon, HourglassIcon, LockIcon, PlusMediumIcon } from 'blode-icons-react'
import {
  S, STAGES, CC, DOCS, FOLDERS, ATITLE, ADESC, W, apprState, checklist, docs, dl, fdt, fDay, fShort, ft, nextDue, nextStage, ranking, rules, short, skipped, statusOf, bidVisible,
} from '@/engine/engine.js'
import { advance, commClose, genMatrix, genSSD, requestApproval } from '@/engine/commands.js'
import { notify } from '@/engine/notify.js'
import { openDlg, run, setUI, useUI } from '@/lib/store'
import { Chip, People, Person, STAGE_BG, STAGE_SOFT, TypeChip, fixName, procName, type Tone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Step, StepContent, StepDescription, StepIndicator, StepLabel, StepSeparator, Stepper } from '@/components/ui/stepper'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AuditTimeline, TaskRow, auditRows } from './Pages'
import { Empty } from './Page'
import { UserMenu } from './Shell'

function guard(who: string) {
  if (!S.strict) return true
  if (String(who || '').split(' + ').includes(S.user)) return true
  notify(`Ezt a lépést ${who} végzi. Váltson felhasználót, vagy kapcsolja ki a szigorú szerepkör-ellenőrzést.`, 'bad')
  return false
}
function itemAct(pid: string, x: string, k: string, who: string) {
  if (x === 'tab') return setUI({ tab: k })
  if (x === 'apprReq') return run(() => requestApproval(pid, k))
  if (!guard(who)) return
  const D = (type: string, extra: object = {}) => openDlg({ type, pid, key: k, ...extra } as any)
  switch (x) {
    case 'doc': return D('upload')
    case 'flag': return D('flag')
    case 'bidders': return D('bidders')
    case 'send': return D('send')
    case 'open': return D('openbids')
    case 'resolve1': return D('resolve')
    case 'tco': return D('tco')
    case 'nego': return D('nego')
    case 'prequal': return D('prequal')
    case 'ctype': return D('ctype')
    case 'input': return D('input')
    case 'commClose': return run(() => commClose(pid))
    case 'genMatrix': return run(() => genMatrix(pid))
    case 'genSSD': return run(() => genSSD(pid))
  }
}

/* ---------- checklist item ---------- */
function Item({ p, i }: { p: any; i: any }) {
  const pending = i.appr && i.appr.requested && !i.done
  const canDecide = i.appr && i.appr.requested && i.appr.status !== 'approved' && i.appr.per.some((x: any) => x.name === S.user && (x.state === 'pending' || x.state === 'stale'))
  return (
    <div className="flex items-start gap-3 border-t border-border px-5 py-3.5 first:border-t-0">
      <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full', i.done ? 'bg-s3-soft text-s3-ink' : i.blocked ? 'bg-muted text-muted-foreground' : 'bg-s2-soft text-s2-ink')}>
        {i.done ? <CheckIcon className="size-4" /> : i.blocked ? <LockIcon className="size-3.5" /> : pending ? <HourglassIcon className="size-3.5" /> : <CircleExclamationIcon className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block leading-snug">{i.label}</b>
        {i.done && i.ev && <span className="text-sm text-muted-foreground">{i.ev}</span>}
        {!i.done && i.blocked && <span className="text-sm text-muted-foreground">{i.blocked}</span>}
        {!i.done && !i.blocked && i.due && <span className={cn('text-sm', i.due < S.today ? 'font-semibold text-destructive' : 'text-muted-foreground')}>Határidő: {fShort(i.due)}{i.due < S.today ? ' – lejárt' : ''}</span>}
        {i.appr && i.appr.requested && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {i.appr.per.map((x: any) => (
              <Chip key={x.name} tone={x.state === 'approved' ? 'ok' : x.state === 'rejected' ? 'bad' : 'warn'} className="cursor-default" >
                {x.state === 'approved' ? '✓' : x.state === 'rejected' ? '✗' : x.state === 'stale' ? '↻' : '⏳'} {fixName(x.name)}{x.state === 'approved' ? ` · ${fShort(x.dec.ts.slice(0, 10))} v${x.dec.ver}` : x.state === 'stale' ? ' · új verzió, újra kell' : ''}
              </Chip>
            ))}
            {i.appr.doc && <span className="self-center text-xs text-muted-foreground">{dl(i.appr.bound)} v{i.appr.ver}</span>}
          </div>
        )}
        <div className="mt-1.5"><People who={i.who} /></div>
      </div>
      {!p.closed && (
        <div className="flex max-w-64 flex-wrap justify-end gap-1.5">
          {i.acts.map((a: any, n: number) => a.l && <Button key={n} size="sm" variant={a.p && !i.blocked ? 'default' : 'outline'} disabled={!!(i.blocked && a.p)} onClick={() => itemAct(p.id, a.a, a.k || '', i.who)}>{a.l}</Button>)}
          {canDecide && <>
            <Button size="sm" variant="destructive" onClick={() => openDlg({ type: 'decide', pid: p.id, key: i.appr.key, dec: 'reject' })}>Elutasítom</Button>
            <Button size="sm" variant="success" onClick={() => openDlg({ type: 'decide', pid: p.id, key: i.appr.key, dec: 'approve' })}>Jóváhagyom</Button>
          </>}
        </div>
      )}
    </div>
  )
}
const Card = ({ title, sub, right, children, className }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn('mb-4 overflow-hidden rounded-3xl bg-card lift', className)}>
    <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4"><div><h3 className="font-display text-lg font-bold">{title}</h3>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>{right}</div>
    {children}
  </section>
)

/* ---------- overview ---------- */
function Overview({ p }: { p: any }) {
  const it = checklist(p), done = it.filter((i: any) => i.done).length, st = statusOf(p), sk = skipped(p)
  const nx = p.stage < 6 ? STAGES[nextStage(p) - 1] : null
  const Fact = ({ l, v, tone }: { l: string; v: ReactNode; tone?: string }) => <div className={cn('rounded-2xl p-3.5', tone || 'bg-muted/70')}><div className="text-[10px] font-bold uppercase tracking-wider opacity-70">{l}</div><div className="mt-1 font-semibold leading-snug">{v}</div></div>
  return (
    <>
      <div className="mb-4 rounded-3xl bg-card p-4 lift">
        <Stepper value={p.closed ? 6 : p.stage - 1} className="gap-2">
          {STAGES.map((s: string[], i: number) => (
            <Step key={s[0]} className="[&>[data-slot=step-label]]:mt-0">
              <StepIndicator className={cn(i + 1 <= p.stage || p.closed ? `${STAGE_BG[i]} !border-transparent !text-white` : '', i + 1 === p.stage && !p.closed && `!ring-4 ring-primary/20`, sk.includes(i + 1) && 'border-dashed opacity-70')} />
              <StepContent><StepLabel className="text-xs">{s[0]}</StepLabel><StepDescription className="hidden text-[11px] md:block">{s[1]}</StepDescription></StepContent>
              <StepSeparator className={cn(i + 1 < p.stage || p.closed ? STAGE_BG[i] : '')} />
            </Step>
          ))}
        </Stepper>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <Fact l="Aktuális státusz" v={<Chip tone={st.t as Tone} dot>{st.l}</Chip>} />
        <Fact l="Felelős beszerző" v={p.owner} /><Fact l="Igénylő" v={p.requester} />
        <Fact l="Költséghely" v={<>{p.cc}<div className="text-xs font-normal text-muted-foreground">{CC[p.cc]?.n}</div></>} />
        <Fact l="Becsült nettó érték" v={ft(p.value)} /><Fact l="Teljesítési határidő" v={fDay(p.desired)} />
      </div>
      {p.nego && <div className="mb-4 flex items-center gap-3 rounded-2xl bg-s3-soft p-4 text-sm text-s3-ink"><CheckIcon className="size-5 shrink-0" /><div><b>Tényleges érték: {ft(p.nego.final)}</b> · nyertes: {p.nego.winnerName} · megtakarítás a kezdő ajánlathoz képest: <b>{ft(p.nego.saving)}</b></div></div>}
      {p.closed ? (
        <div className={cn('mb-4 flex items-start gap-3 rounded-2xl p-4 text-sm', p.closed.failed ? 'bg-s1-soft text-s1-ink' : 'bg-s3-soft text-s3-ink')}><LockIcon className="mt-0.5 size-5 shrink-0" /><div><b>{p.closed.failed ? 'Sikertelen eljárás' : 'Lezárt beszerzés'}</b> · {fdt(p.closed.ts)} · {p.closed.by}{p.closed.reason ? ' · ' + p.closed.reason : ''}<br />A dokumentumtár zárolva. Megőrzés: szerződés lejártát követő 8 év (PO, számla: 8 év; tenderdokumentáció: 5 év).</div></div>
      ) : (
        <Card title={nx ? `Mi hiányzik a továbblépéshez? (PROC${p.stage} → ${nx[0]})` : 'Mi hiányzik a lezáráshoz?'} sub="Minden lépéshez tartozik felelős; ha minden zöld, továbbléphet." right={<b className="text-sm">{done}/{it.length}</b>}>
          <div className="mx-5 mb-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-s3 transition-[width] duration-500 ease-out" style={{ width: `${it.length ? (done / it.length) * 100 : 100}%` }} /></div>
          {it.length ? it.map((i: any) => <Item key={i.id} p={p} i={i} />) : <Empty>Nincs teendő ebben a szakaszban.</Empty>}
        </Card>
      )}
      <Card title="Automatikus szabályzatellenőrzés">
        <div className="pb-3">{rules(p).map((r: any, n: number) => (
          <div key={n} className="flex items-start gap-3 px-5 py-1.5 text-sm">
            <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', r.s === 'ok' ? 'bg-s3-soft text-s3-ink' : r.s === 'bad' ? 'bg-s1-soft text-s1-ink' : 'bg-s2-soft text-s2-ink')}>{r.s === 'ok' ? <CheckIcon className="size-3" /> : <CircleExclamationIcon className="size-3.5" />}</span>{r.t}
          </div>))}</div>
      </Card>
    </>
  )
}

/* ---------- bids ---------- */
function Bids({ p }: { p: any }) {
  const vis = bidVisible(p), rk = ranking(p), rankOf = (id: string) => rk.find((r: any) => r.b.id === id)?.rank
  const vh = p.proc === 'Vészhelyzeti', canRecv = (p.f.sent && !p.f.opened && !p.closed) || (vh && !p.closed)
  return (
    <>
      <Card title="Ajánlattevők és ajánlatok" sub={`${p.bidDeadline ? 'Ajánlattételi határidő: ' + fDay(p.bidDeadline) + ' · ' : ''}Az árinformációk a kiértékelés lezárásáig bizalmasak (12.3).`}
        right={!p.closed && !p.f.sent && p.stage <= 3 ? <Button size="sm" onClick={() => openDlg({ type: 'bidders', pid: p.id })}><PlusMediumIcon />Ajánlattevő</Button> : undefined}>
        {p.bidders.length === 0 ? <Empty>Még nincs ajánlattevő. Minimum 3 szükséges (SS esetén 1).</Empty> : (
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead className="pl-5">Ajánlattevő</TableHead><TableHead>Állapot</TableHead><TableHead>Formai</TableHead><TableHead>Ár (nettó)</TableHead><TableHead>Műszaki</TableHead><TableHead>Rang</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{p.bidders.map((b: any) => {
              const n = docs(p, 'bid', b.id).length
              return (
                <TableRow key={b.id}>
                  <TableCell className="pl-5"><b>{b.name}</b><div className="text-xs text-muted-foreground">{b.email}{b.isNew && ' · új beszállító'}{b.type === 'Webshop' && ' · webáruház'}</div></TableCell>
                  <TableCell>{b.status === 'beérkezett' ? <Chip tone={b.late ? 'bad' : 'ok'}>{b.late ? 'Késve érkezett' : 'Beérkezett'}</Chip> : b.status === 'lemondó' ? <Chip>Lemondó nyilatkozat</Chip> : <Chip tone="warn">Meghívva</Chip>}{b.recv && <div className="mt-0.5 text-xs text-muted-foreground">{fdt(b.recv)}{n ? ` · ${n} verzió` : ''}</div>}</TableCell>
                  <TableCell>{b.formal == null ? '–' : b.formal ? <Chip tone="ok">Megfelelő</Chip> : <Chip tone="bad">Nem megfelelő</Chip>}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.price ? (vis || vh ? ft(b.price) : <Chip><LockIcon className="size-3" />zárolt a bontásig</Chip>) : '–'}</TableCell>
                  <TableCell>{b.tech ?? '–'}</TableCell><TableCell>{rankOf(b.id) ? <b>#{rankOf(b.id)}</b> : '–'}</TableCell>
                  <TableCell className="pr-5"><div className="flex justify-end gap-1.5">
                    {!p.closed && canRecv && b.status !== 'lemondó' && <Button size="sm" variant="outline" onClick={() => openDlg({ type: 'bidrecv', pid: p.id, bid: b.id })}>{n ? 'Új verzió' : 'Ajánlat rögzítése'}</Button>}
                    {!p.closed && canRecv && b.status === 'meghívva' && <Button size="sm" variant="ghost" onClick={() => openDlg({ type: 'biddecl', pid: p.id, bid: b.id })}>Lemondó</Button>}
                    {!p.closed && p.f.opened && b.status === 'beérkezett' && p.stage <= 3 && <Button size="sm" onClick={() => openDlg({ type: 'bideval', pid: p.id, bid: b.id })}>Értékelés</Button>}
                  </div></TableCell>
                </TableRow>)
            })}</TableBody></Table></div>)}
      </Card>
      {rk.length > 0 && (
        <Card title="Kiértékelési mátrix" sub={`Súlyozás: műszaki ${W.t * 100}% · kereskedelmi ${W.c * 100}% (ár 60%, fizetési feltétel 20%, szállítási idő 20%).`} right={p.f.commDone ? <Chip tone="ok">Lezárva</Chip> : <Chip tone="warn">Folyamatban</Chip>}>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="pl-5">#</TableHead><TableHead>Ajánlattevő</TableHead><TableHead>Műszaki</TableHead><TableHead>Ár pont</TableHead><TableHead>Fizetési</TableHead><TableHead>Szállítás</TableHead><TableHead>Kereskedelmi</TableHead><TableHead className="pr-5">Összesen</TableHead></TableRow></TableHeader>
            <TableBody>{rk.map((r: any) => <TableRow key={r.b.id}><TableCell className="pl-5"><span className={cn('grid size-7 place-items-center rounded-full font-extrabold', r.rank === 1 ? 'bg-s2 text-white' : 'bg-muted')}>{r.rank}</span></TableCell><TableCell>{r.b.name}<div className="text-xs text-muted-foreground">{ft(r.b.price)}</div></TableCell><TableCell>{r.b.tech}</TableCell><TableCell>{r.sp.toFixed(1)}</TableCell><TableCell>{r.spay.toFixed(1)}</TableCell><TableCell>{r.sl.toFixed(1)}</TableCell><TableCell>{r.comm.toFixed(1)}</TableCell><TableCell className="pr-5"><b>{r.total.toFixed(1)}</b></TableCell></TableRow>)}</TableBody></Table></div>
        </Card>)}
    </>
  )
}

/* ---------- documents ---------- */
function Docs({ p }: { p: any }) {
  const locked = !!p.closed
  return (
    <>
      {!locked && <div className="mb-4 flex items-center gap-3 rounded-2xl bg-s4-soft p-3.5 text-sm text-s4-ink"><FileTextIcon className="size-5 shrink-0" />Verziókövetés: új feltöltés nem írja felül a korábbi verziót. Ha a jóváhagyott dokumentumból új verzió készül, a kapcsolódó jóváhagyások érvénytelenné válnak.</div>}
      {FOLDERS.map((f: string, i: number) => {
        const n = i + 1, ds = p.docs.filter((d: any) => DOCS[d.key][1] === n), seen: Record<string, boolean> = {}, latest: any[] = []
        ds.slice().reverse().forEach((d: any) => { const k = d.key + (d.bid || ''); if (!seen[k]) { seen[k] = true; latest.push(d) } })
        const hide = n === 4 && !(bidVisible(p) || p.proc === 'Vészhelyzeti')
        return (
          <Card key={n} title={`${String(n).padStart(2, '0')} – ${f}`} className="!mb-3" right={locked ? <Chip tone="ok"><LockIcon className="size-3" />Lezárt</Chip> : (n === 3 || n === 4 ? undefined : <Button size="sm" variant="outline" onClick={() => openDlg({ type: 'upload', pid: p.id, folder: n })}>Feltöltés</Button>)}>
            {latest.length ? latest.reverse().map((d: any) => {
              const cnt = ds.filter((x: any) => x.key === d.key && x.bid === d.bid).length
              return (
                <div key={d.id} className="flex items-center gap-3 border-t border-border px-5 py-2.5 first:border-t-0">
                  <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1"><b className="truncate">{hide ? '🔒 zárolt ajánlat (' + (p.bidders.find((b: any) => b.id === d.bid)?.name || '') + ')' : d.name}</b> <Chip tone="inf" className="!px-1.5 !py-0">v{d.ver}</Chip>
                    <div className="text-xs text-muted-foreground">{d.by} · {fdt(d.ts)}{d.size ? ` · ${Math.round(d.size / 1024)} KB` : ''}{d.note ? ` · ${d.note}` : ''}{cnt > 1 ? ` · ${cnt} verzió (mind megőrizve)` : ''}</div></div>
                  {d.content && !hide && <Button size="sm" variant="outline" onClick={() => openDlg({ type: 'viewdoc', key: d.id, pid: p.id })}>Megnyitás</Button>}
                </div>)
            }) : <div className="px-5 pb-3 text-sm text-muted-foreground">Nincs dokumentum.</div>}
          </Card>)
      })}
    </>
  )
}

/* ---------- approvals / mail / tasks ---------- */
function Approvals({ p }: { p: any }) {
  const keys = Object.keys(p.appr)
  if (!keys.length) return <Empty>Még nem indult jóváhagyás.</Empty>
  return <>{keys.map((k) => {
    const a = apprState(p, k)
    return (
      <Card key={k} title={ATITLE[k]} sub={`${ADESC[k]} · indította: ${a.req.by} · ${fdt(a.req.ts)}${a.doc ? ' · ' + dl(a.bound) + ' v' + a.ver : ''}`} right={<Chip tone={a.status === 'approved' ? 'ok' : a.status === 'rejected' ? 'bad' : 'warn'} dot>{a.status === 'approved' ? 'Jóváhagyva' : a.status === 'rejected' ? 'Elutasítva' : 'Folyamatban'}</Chip>}>
        {a.per.map((x: any) => (
          <div key={x.name} className="flex items-center gap-3 border-t border-border px-5 py-2.5">
            <Person name={x.name} size="md" />
            <span className="flex-1 text-sm text-muted-foreground">{x.dec ? `${fdt(x.dec.ts)} · v${x.dec.ver}${x.dec.c ? ` · „${x.dec.c}"` : ''}` : 'Még nem döntött'}</span>
            <Chip tone={x.state === 'approved' ? 'ok' : x.state === 'rejected' ? 'bad' : 'warn'}>{x.state === 'approved' ? 'Jóváhagyta' : x.state === 'rejected' ? 'Elutasította' : x.state === 'stale' ? 'Érvénytelen (új verzió)' : 'Vár'}</Chip>
          </div>))}
      </Card>)
  })}</>
}
function Mail({ p }: { p: any }) {
  const open = p.f.sent && !p.f.opened && !p.closed
  return (
    <>
      <div className={cn('mb-4 rounded-2xl p-4 text-sm', open ? 'bg-s2-soft text-s2-ink' : 'bg-muted text-muted-foreground')}><b>arajanlat@fonteviva.hu</b> – zárt tendercsatorna. Hozzáférés kizárólag a kijelölt beszerzési adminisztrátornak, csak kiírás, bontás és értékelés időszakában. Jelenleg: <b>{open ? 'nyitott (tender folyamatban)' : 'nem használt ennél a beszerzésnél'}</b>.</div>
      {p.mail.length === 0 ? <Empty>Nincs levelezés.</Empty> : p.mail.slice().reverse().map((m: any, i: number) => (
        <Card key={i} title={`${m.dir === 'out' ? '↗ Kimenő' : '↙ Bejövő'}: ${m.subj}`} sub={`${fdt(m.ts)} · ${m.from} → ${m.to}`}>
          <div className="px-5 pb-4 text-sm">{m.body && <p className="mb-2 whitespace-pre-wrap">{m.body}</p>}<div className="flex flex-wrap gap-1.5">{m.att?.map((a: string) => <Chip key={a} tone="inf"><FileTextIcon className="size-3" />{m.dir === 'in' && !bidVisible(p) ? '🔒 melléklet zárolva a bontásig' : a}</Chip>)}</div></div>
        </Card>))}
    </>
  )
}

/* ---------- sheet ---------- */
export function ProcSheet() {
  const u = useUI()
  const p = u.open ? S.procs.find((x: any) => x.id === u.open) : null
  const hue = p ? p.stage - 1 : 4
  const it = p ? checklist(p) : [], miss = it.filter((i: any) => !i.done)
  const last = p?.stage === 6
  const nd = p ? nextDue(p) : null
  const tasks = p ? S.tasks.filter((t: any) => t.pid === p.id) : []
  const tabs: [string, string][] = p ? [['ov', 'Áttekintés'], ['bids', `Ajánlatok (${p.bidders.filter((b: any) => b.status === 'beérkezett').length}/${p.bidders.length})`], ['docs', `Dokumentumok (${p.docs.length})`], ['tasks', `Feladatok (${tasks.length})`], ['appr', 'Jóváhagyások'], ['mail', 'Levelezés'], ['log', 'Napló']] : []
  return (
    <Sheet open={!!p} onOpenChange={(o: boolean) => { if (!o) setUI({ open: null }) }}>
      <SheetContent className="w-full gap-0 bg-background p-0 sm:max-w-[54rem]" showCloseButton>
        {p && (
          <>
            <div className={cn('relative shrink-0 px-6 pb-0 pt-6', STAGE_SOFT[hue])}>
              <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-white/30 blur-2xl dark:bg-white/10" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.14em] opacity-80"><span className="font-mono">{p.id}</span>·<span>PROC{p.stage} {STAGES[p.stage - 1][1].toUpperCase()}</span></div>
                <SheetTitle className="font-display mt-1 pr-8 text-3xl font-extrabold leading-tight text-current">{p.subject}</SheetTitle>
                <SheetDescription className="mt-1 text-current/80">{nd?.text}{nd?.date ? ` · határidő: ${fDay(nd.date)}` : ''}</SheetDescription>
                <div className="mt-3 flex flex-wrap gap-1.5"><Chip className="bg-white/70 text-foreground dark:bg-white/15">{p.cat}</Chip><TypeChip value={p.value} /><Chip className="bg-white/70 text-foreground dark:bg-white/15">{procName(p.proc)}</Chip><Chip className="bg-white/70 text-foreground dark:bg-white/15">{short(p.value)}</Chip>{p.ifs && <Chip tone="bad">IFS-kritikus</Chip>}</div>
              </div>
            </div>
            <Tabs value={u.tab} onValueChange={(v: string) => setUI({ tab: v })} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="scrollbar-thin shrink-0 overflow-x-auto bg-card px-4 pt-2 lift"><TabsList variant="line" className="h-11 w-max gap-1 bg-transparent">{tabs.map(([k, l]) => <TabsTrigger key={k} value={k} className="px-3">{l}</TabsTrigger>)}</TabsList></div>
              <div key={u.tab} className="pop scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
                <TabsContent value="ov"><Overview p={p} /></TabsContent>
                <TabsContent value="bids"><Bids p={p} /></TabsContent>
                <TabsContent value="docs"><Docs p={p} /></TabsContent>
                <TabsContent value="tasks"><div className="mb-3 text-right"><Button onClick={() => openDlg({ type: 'task', pid: p.id })}><PlusMediumIcon />Új feladat</Button></div><div className="rounded-3xl bg-card lift">{tasks.length ? tasks.map((t: any) => <TaskRow key={t.id} t={t} />) : <Empty>Ehhez a beszerzéshez még nincs feladat.</Empty>}</div></TabsContent>
                <TabsContent value="appr"><Approvals p={p} /></TabsContent>
                <TabsContent value="mail"><Mail p={p} /></TabsContent>
                <TabsContent value="log"><div className="rounded-3xl bg-card lift"><AuditTimeline rows={auditRows(p.id, '')} showProc={false} /></div></TabsContent>
              </div>
            </Tabs>
            <div className="flex shrink-0 items-center justify-between gap-3 bg-card px-6 py-3.5 lift">
              <div className="flex min-w-0 items-center gap-3"><UserMenu compact /><span className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><ClockIcon className="size-4 shrink-0" />{p.closed ? 'Lezárt – csak olvasható' : miss.length ? `${miss.length} hiányzó feltétel` : 'Minden feltétel teljesült'}</span></div>
              {!p.closed && <div className="flex gap-2">
                <Button variant="ghost" onClick={() => openDlg({ type: 'fail', pid: p.id })}>Sikertelen eljárás</Button>
                <Button disabled={miss.length > 0} title={miss.map((m: any) => m.short || m.label).join(' | ')} onClick={() => { const r = run(() => advance(p.id)); if (r === 'close') openDlg({ type: 'close', pid: p.id }) }}>{last ? 'Beszerzés lezárása' : 'Tovább a következő szakaszba'}</Button>
              </div>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
