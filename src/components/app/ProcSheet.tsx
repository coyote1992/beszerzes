import type { ReactNode } from 'react'
import { CheckIcon, CircleExclamationIcon, ClockIcon, EditIcon, FileTextIcon, FolderOpenIcon, HourglassIcon, LockIcon, PlusMediumIcon, TrashIcon } from 'blode-icons-react'
import {
  S, STAGES, CC, DOCS, FOLDERS, ATITLE, ADESC, W, apprState, checklist, docs, dl, fdt, fDay, fShort, ft, nextDue, nextStage, ranking, rules, short, skipped, statusOf, bidVisible, nm, canProxy,
} from '@/engine/engine.js'
import { advance, commClose, genMatrix, genSSD, requestApproval } from '@/engine/commands.js'
import { openDlg, run, setUI, useUI } from '@/lib/store'
import { Chip, People, Person, STAGE_BG, TypeChip, fixName, procName, type Tone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Step, StepContent, StepDescription, StepIndicator, StepLabel, StepSeparator, Stepper } from '@/components/ui/stepper'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AuditTimeline, TaskRow, TestBadge, auditRows } from './Pages'
import { Empty } from './Page'

function itemAct(pid: string, x: string, k: string) {
  if (x === 'tab') return setUI({ tab: k })
  if (x === 'apprReq') return run(() => requestApproval(pid, k))
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
  const canDecide = i.appr && i.appr.requested && i.appr.status !== 'approved' && (canProxy(p, S.user) || i.appr.per.some((x: any) => x.name === S.user && (x.state === 'pending' || x.state === 'stale')))
  return (
    <div className="flex items-start gap-3 border-t px-4 py-2.5 first:border-t-0">
      <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', i.done ? 'bg-s3-soft text-s3-ink' : 'bg-muted text-muted-foreground')}>
        {i.done ? <CheckIcon className="size-3" /> : i.blocked ? <LockIcon className="size-3" /> : pending ? <HourglassIcon className="size-3" /> : <CircleExclamationIcon className="size-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">{i.label}</span>
        {i.done && i.ev && <span className="text-xs text-muted-foreground">{i.ev}</span>}
        {!i.done && i.blocked && <span className="text-xs text-muted-foreground">{i.blocked}</span>}
        {!i.done && !i.blocked && i.due && <span className={cn('text-xs', i.due < S.today ? 'font-medium text-destructive' : 'text-muted-foreground')}>Határidő: {fShort(i.due)}{i.due < S.today ? ' – lejárt' : ''}</span>}
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
          {i.acts.map((a: any, n: number) => a.l && <Button key={n} size="sm" variant={a.p && !i.blocked ? 'default' : 'outline'} disabled={!!(i.blocked && a.p)} onClick={() => itemAct(p.id, a.a, a.k || '')}>{a.l}</Button>)}
          {canDecide && <>
            <Button size="sm" variant="destructive" onClick={() => openDlg({ type: 'decide', pid: p.id, key: i.appr.key, dec: 'reject' })}>Elutasítom</Button>
            <Button size="sm" onClick={() => openDlg({ type: 'decide', pid: p.id, key: i.appr.key, dec: 'approve' })}>Jóváhagyom</Button>
          </>}
        </div>
      )}
    </div>
  )
}
const Card = ({ title, sub, right, children, className }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cn('mb-3 overflow-hidden rounded-lg border bg-card', className)}>
    <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3"><div><h3 className="text-sm font-semibold">{title}</h3>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>{right}</div>
    {children}
  </section>
)

/* ---------- overview ---------- */
function Overview({ p }: { p: any }) {
  const it = checklist(p), done = it.filter((i: any) => i.done).length, st = statusOf(p), sk = skipped(p)
  const nx = p.stage < STAGES.length ? STAGES[nextStage(p) - 1] : null
  const Fact = ({ l, v }: { l: string; v: ReactNode }) => <div className="rounded-lg border bg-card p-2.5"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-0.5 text-sm font-medium leading-snug">{v}</div></div>
  return (
    <>
      <div className="mb-3 rounded-lg border bg-card p-3">
        <Stepper value={p.closed ? STAGES.length : p.stage - 1} className="gap-2">
          {STAGES.map((s: string[], i: number) => (
            <Step key={s[0]} className="[&>[data-slot=step-label]]:mt-0">
              <StepIndicator className={cn(i + 1 <= p.stage || p.closed ? `${STAGE_BG[i]} !border-transparent !text-primary-foreground` : '', i + 1 === p.stage && !p.closed && `!ring-4 ring-primary/15`, sk.includes(i + 1) && 'border-dashed opacity-70')} />
              <StepContent><StepLabel className="text-xs">{s[0]}</StepLabel><StepDescription className="hidden text-[11px] md:block">{s[1]}</StepDescription></StepContent>
              <StepSeparator className={cn(i + 1 < p.stage || p.closed ? STAGE_BG[i] : '')} />
            </Step>
          ))}
        </Stepper>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3">
        <Fact l="Aktuális státusz" v={<Chip tone={st.t as Tone} dot>{st.l}</Chip>} />
        <Fact l="Felelős beszerző" v={<Person name={p.owner} />} /><Fact l="Igénylő" v={<Person name={p.requester} />} />
        <Fact l="Költséghely" v={<>{p.cc}<div className="text-xs font-normal text-muted-foreground">{CC[p.cc]?.n}</div></>} />
        <Fact l="Becsült nettó érték" v={ft(p.value)} /><Fact l="Teljesítési határidő" v={fDay(p.desired)} />
      </div>
      {p.nego && <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-s3-soft p-3 text-sm text-s3-ink"><CheckIcon className="size-4 shrink-0" /><div><b>Tényleges érték: {ft(p.nego.final)}</b> · nyertes: {p.nego.winnerName} · megtakarítás a kezdő ajánlathoz képest: <b>{ft(p.nego.saving)}</b></div></div>}
      {p.closed ? (
        <div className="mb-3 flex items-start gap-2.5 rounded-lg border bg-muted p-3 text-sm"><LockIcon className="mt-0.5 size-4 shrink-0" /><div><b>{p.closed.failed ? 'Sikertelen eljárás' : 'Lezárt beszerzés'}</b> · {fdt(p.closed.ts)} · {nm(p.closed.by)}{p.closed.reason ? ' · ' + p.closed.reason : ''}<br />A dokumentumtár zárolva. Megőrzés: szerződés lejártát követő 8 év (PO, számla: 8 év; tenderdokumentáció: 5 év).</div></div>
      ) : (
        <Card title={nx ? `Mi hiányzik a továbblépéshez? (PROC${p.stage} → ${nx[0]})` : 'Mi hiányzik a lezáráshoz?'} sub="Minden lépéshez tartozik felelős; ha minden zöld, továbbléphet." right={<span className="text-sm font-medium tabular-nums">{done}/{it.length}</span>}>
          <div className="mx-4 mb-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-s3 transition-[width] duration-500 ease-out" style={{ width: `${it.length ? (done / it.length) * 100 : 100}%` }} /></div>
          {it.length ? it.map((i: any) => <Item key={i.id} p={p} i={i} />) : <Empty>Nincs teendő ebben a szakaszban.</Empty>}
        </Card>
      )}
      <Card title="Automatikus szabályzatellenőrzés">
        <div className="pb-3">{rules(p).map((r: any, n: number) => (
          <div key={n} className="flex items-start gap-2.5 px-4 py-1 text-sm">
            <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full', r.s === 'ok' ? 'bg-s3-soft text-s3-ink' : r.s === 'bad' ? 'bg-s1-soft text-s1-ink' : 'bg-s2-soft text-s2-ink')}>{r.s === 'ok' ? <CheckIcon className="size-2.5" /> : <CircleExclamationIcon className="size-2.5" />}</span>{r.t}
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
            <TableHeader><TableRow><TableHead className="pl-4">Ajánlattevő</TableHead><TableHead>Állapot</TableHead><TableHead>Formai</TableHead><TableHead>Ár (nettó)</TableHead><TableHead>Műszaki</TableHead><TableHead>Rang</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{p.bidders.map((b: any) => {
              const n = docs(p, 'bid', b.id).reduce((m: number, d: any) => Math.max(m, d.ver), 0)
              return (
                <TableRow key={b.id}>
                  <TableCell className="pl-4"><span className="font-medium">{b.name}</span><div className="text-xs text-muted-foreground">{b.email}{b.isNew && ' · új beszállító'}{b.type === 'Webshop' && ' · webáruház'}</div></TableCell>
                  <TableCell>{b.status === 'beérkezett' ? <Chip tone={b.late ? 'bad' : 'ok'}>{b.late ? 'Késve érkezett' : 'Beérkezett'}</Chip> : b.status === 'lemondó' ? <Chip>Lemondó nyilatkozat</Chip> : <Chip tone="warn">Meghívva</Chip>}{b.recv && <div className="mt-0.5 text-xs text-muted-foreground">{fdt(b.recv)}{n ? ` · ${n} verzió` : ''}</div>}</TableCell>
                  <TableCell>{b.formal == null ? '–' : b.formal ? <Chip tone="ok">Megfelelő</Chip> : <Chip tone="bad">Nem megfelelő</Chip>}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.price ? (vis || vh ? ft(b.price) : <Chip><LockIcon className="size-3" />zárolt a bontásig</Chip>) : '–'}</TableCell>
                  <TableCell>{b.tech ?? '–'}</TableCell><TableCell>{rankOf(b.id) ? <b>#{rankOf(b.id)}</b> : '–'}</TableCell>
                  <TableCell className="pr-4"><div className="flex justify-end gap-1.5">
                    {!p.closed && canRecv && b.status !== 'lemondó' && <Button size="sm" variant="outline" onClick={() => openDlg({ type: 'bidrecv', pid: p.id, bid: b.id })}>{n ? 'Új verzió' : 'Ajánlat rögzítése'}</Button>}
                    {!p.closed && canRecv && b.status === 'meghívva' && <Button size="sm" variant="ghost" onClick={() => openDlg({ type: 'biddecl', pid: p.id, bid: b.id })}>Lemondó</Button>}
                    {!p.closed && p.f.opened && b.status === 'beérkezett' && p.stage <= 3 && <Button size="sm" onClick={() => openDlg({ type: 'bideval', pid: p.id, bid: b.id })}>Értékelés</Button>}
                  </div></TableCell>
                </TableRow>)
            })}</TableBody></Table></div>)}
      </Card>
      {rk.length > 0 && (
        <Card title="Kiértékelési mátrix" sub={`Súlyozás: műszaki ${W.t * 100}% · kereskedelmi ${W.c * 100}% (ár 60%, fizetési feltétel 20%, szállítási idő 20%).`} right={p.f.commDone ? <Chip tone="ok">Lezárva</Chip> : <Chip tone="warn">Folyamatban</Chip>}>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="pl-4">#</TableHead><TableHead>Ajánlattevő</TableHead><TableHead>Műszaki</TableHead><TableHead>Ár pont</TableHead><TableHead>Fizetési</TableHead><TableHead>Szállítás</TableHead><TableHead>Kereskedelmi</TableHead><TableHead className="pr-4">Összesen</TableHead></TableRow></TableHeader>
            <TableBody>{rk.map((r: any) => <TableRow key={r.b.id}><TableCell className="pl-4"><span className={cn('grid size-6 place-items-center rounded-full text-xs font-semibold', r.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{r.rank}</span></TableCell><TableCell>{r.b.name}<div className="text-xs text-muted-foreground">{ft(r.b.price)}</div></TableCell><TableCell>{r.b.tech}</TableCell><TableCell>{r.sp.toFixed(1)}</TableCell><TableCell>{r.spay.toFixed(1)}</TableCell><TableCell>{r.sl.toFixed(1)}</TableCell><TableCell>{r.comm.toFixed(1)}</TableCell><TableCell className="pr-4 font-semibold">{r.total.toFixed(1)}</TableCell></TableRow>)}</TableBody></Table></div>
        </Card>)}
    </>
  )
}

/* ---------- documents ---------- */
function Docs({ p }: { p: any }) {
  const locked = !!p.closed
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-muted/50 p-3 text-sm"><FileTextIcon className="size-4 shrink-0" /><span className="min-w-0 flex-1">{locked ? 'A dokumentumtár lezárva.' : 'A fájlok a beszerzés SharePoint-mappájába kerülnek. Új feltöltés nem írja felül a korábbi verziót; ha a jóváhagyott dokumentumból új verzió készül, a kapcsolódó jóváhagyások érvénytelenné válnak.'}</span></div>
      {FOLDERS.map((f: string, i: number) => {
        const n = i + 1, ds = p.docs.filter((d: any) => DOCS[d.key][1] === n), top: Record<string, number> = {}
        ds.forEach((d: any) => { const k = d.key + (d.bid || ''); top[k] = Math.max(top[k] || 0, d.ver) })
        const latest = ds.filter((d: any) => d.ver === top[d.key + (d.bid || '')])
        const hide = n === 4 && !(bidVisible(p) || p.proc === 'Vészhelyzeti')
        return (
          <Card key={n} title={`${String(n).padStart(2, '0')} – ${f}`} className="!mb-2" right={locked ? <Chip tone="ok"><LockIcon className="size-3" />Lezárt</Chip> : (n === 3 || n === 4 ? undefined : <Button size="sm" variant="outline" onClick={() => openDlg({ type: 'upload', pid: p.id, folder: n })}>Feltöltés</Button>)}>
            {latest.length ? latest.map((d: any) => {
              const cnt = d.ver
              return (
                <div key={d.id} className="flex items-center gap-3 border-t px-4 py-2 first:border-t-0">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1"><span className="truncate text-sm font-medium">{hide ? '🔒 zárolt ajánlat (' + (p.bidders.find((b: any) => b.id === d.bid)?.name || '') + ')' : d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">{d.name}</a> : d.name}</span> <Chip className="!px-1.5 !py-0">v{d.ver}</Chip>
                    <div className="text-xs text-muted-foreground">{dl(d.key)} · {nm(d.by)} · {fdt(d.ts)}{d.size ? ` · ${Math.round(d.size / 1024)} KB` : ''}{d.note ? ` · ${d.note}` : ''}{cnt > 1 ? ` · ${cnt}. verzió, a korábbiak megőrizve` : ''}</div></div>
                  {!hide && (d.content ? <Button size="xs" variant="outline" onClick={() => openDlg({ type: 'viewdoc', key: d.id, pid: p.id })}>Megtekintés</Button> : d.url ? <Button asChild size="xs" variant="outline"><a href={d.url} target="_blank" rel="noreferrer">Megnyitás</a></Button> : null)}
                </div>)
            }) : <div className="px-4 pb-3 text-xs text-muted-foreground">Nincs dokumentum.</div>}
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
      <Card key={k} title={ATITLE[k]} sub={`${ADESC[k]} · indította: ${nm(a.req.by)} · ${fdt(a.req.ts)}${a.doc ? ' · ' + dl(a.bound) + ' v' + a.ver : ''}`} right={<Chip tone={a.status === 'approved' ? 'ok' : a.status === 'rejected' ? 'bad' : 'warn'} dot>{a.status === 'approved' ? 'Jóváhagyva' : a.status === 'rejected' ? 'Elutasítva' : 'Folyamatban'}</Chip>}>
        {a.per.map((x: any) => (
          <div key={x.name} className="flex items-center gap-3 border-t px-4 py-2">
            <Person name={x.name} />
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
      <div className={cn('mb-3 rounded-lg border p-3 text-sm', open ? 'bg-muted' : 'bg-muted/50 text-muted-foreground')}><b>arajanlat@fonteviva.hu</b> – zárt tendercsatorna. Csak a kiírás, bontás és értékelés időszakában használható. Jelenleg: <b>{open ? 'nyitott (tender folyamatban)' : 'nem használt ennél a beszerzésnél'}</b>.</div>
      {p.mail.length === 0 ? <Empty>Nincs levelezés.</Empty> : p.mail.slice().reverse().map((m: any, i: number) => (
        <Card key={i} title={`${m.dir === 'out' ? '↗ Kimenő' : '↙ Bejövő'}: ${m.subj}`} sub={`${fdt(m.ts)} · ${m.from} → ${m.to}`}>
          <div className="px-4 pb-3 text-sm">{m.body && <p className="mb-2 whitespace-pre-wrap">{m.body}</p>}<div className="flex flex-wrap gap-1.5">{m.att?.map((a: string) => <Chip key={a} tone="inf"><FileTextIcon className="size-3" />{m.dir === 'in' && !bidVisible(p) ? '🔒 melléklet zárolva a bontásig' : a}</Chip>)}</div></div>
        </Card>))}
    </>
  )
}

/* ---------- sheet ---------- */
function FolderLink({ p }: { p: any }) {
  if (p.folderUrl) return <a href={p.folderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium hover:underline"><FolderOpenIcon className="size-4" />SharePoint-mappa ↗</a>
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"><FolderOpenIcon className="size-4" />Mappa létrehozása…</span>
}
export function ProcSheet() {
  const u = useUI()
  const p = u.open ? S.procs.find((x: any) => x.id === u.open) : null
  const it = p ? checklist(p) : [], miss = it.filter((i: any) => !i.done)
  const last = p?.stage === STAGES.length
  const nd = p ? nextDue(p) : null
  const tasks = p ? S.tasks.filter((t: any) => t.pid === p.id) : []
  const canDelete = p?.test && (S.me?.admin || p.createdBy === S.user)
  const tabs: [string, string][] = p ? [['ov', 'Áttekintés'], ['bids', `Ajánlatok (${p.bidders.filter((b: any) => b.status === 'beérkezett').length}/${p.bidders.length})`], ['docs', `Dokumentumok (${p.docs.length})`], ['tasks', `Feladatok (${tasks.length})`], ['appr', 'Jóváhagyások'], ['mail', 'Levelezés'], ['log', 'Napló']] : []
  return (
    <Sheet open={!!p} onOpenChange={(o: boolean) => { if (!o) setUI({ open: null }) }}>
      <SheetContent className="w-full gap-0 bg-background p-0 sm:max-w-[52rem]" showCloseButton>
        {p && (
          <>
            <div className="shrink-0 border-b bg-card px-5 pb-3 pt-4" data-tour="sheet-head">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="font-mono">{p.id}</span>·<span>PROC{p.stage} {STAGES[p.stage - 1][1]}</span>{p.test && <TestBadge />}</div>
              <SheetTitle className="mt-0.5 pr-8 text-lg font-semibold leading-snug">{p.subject}</SheetTitle>
              <SheetDescription className="text-sm">{nd?.text}{nd?.date ? ` · határidő: ${fDay(nd.date)}` : ''}</SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5"><Chip>{p.cat}</Chip><TypeChip value={p.value} /><Chip>{procName(p.proc)}</Chip><Chip>{short(p.value)}</Chip>{p.ifs && <Chip tone="bad">IFS-kritikus</Chip>}
                <span className="ml-auto flex items-center gap-3">{!p.closed && <Button size="xs" variant="outline" onClick={() => openDlg({ type: 'editproc', pid: p.id })}><EditIcon />Adatok szerkesztése</Button>}<FolderLink p={p} /></span></div>
              {p.test && !p.closed && canProxy(p, S.user) && <p className="mt-2 rounded-md bg-s2-soft px-2 py-1 text-xs text-s2-ink">Teszt beszerzés: minden jóváhagyást te is rögzíthetsz a jóváhagyók nevében, és az ajánlatok a határidő előtt is bonthatók – így végig tudod kattintani a folyamatot.</p>}
            </div>
            <Tabs value={u.tab} onValueChange={(v: string) => setUI({ tab: v })} className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="scrollbar-thin shrink-0 overflow-x-auto border-b bg-card px-3" data-tour="sheet-tabs"><TabsList variant="line" className="h-10 w-max gap-0.5 bg-transparent">{tabs.map(([k, l]) => <TabsTrigger key={k} value={k} className="px-2.5 text-[13px]">{l}</TabsTrigger>)}</TabsList></div>
              <div key={u.tab} className="pop scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
                <TabsContent value="ov"><Overview p={p} /></TabsContent>
                <TabsContent value="bids"><Bids p={p} /></TabsContent>
                <TabsContent value="docs"><Docs p={p} /></TabsContent>
                <TabsContent value="tasks"><div className="mb-3 text-right"><Button size="sm" onClick={() => openDlg({ type: 'task', pid: p.id })}><PlusMediumIcon />Új feladat</Button></div><div className="rounded-lg border bg-card">{tasks.length ? tasks.map((t: any) => <TaskRow key={t.id} t={t} />) : <Empty>Ehhez a beszerzéshez még nincs feladat.</Empty>}</div></TabsContent>
                <TabsContent value="appr"><Approvals p={p} /></TabsContent>
                <TabsContent value="mail"><Mail p={p} /></TabsContent>
                <TabsContent value="log"><div className="rounded-lg border bg-card"><AuditTimeline rows={auditRows(p.id, '')} showProc={false} /></div></TabsContent>
              </div>
            </Tabs>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-card px-5 py-3" data-tour="sheet-foot">
              <div className="flex min-w-0 items-center gap-3">
                <span className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><ClockIcon className="size-4 shrink-0" />{p.closed ? 'Lezárt – csak olvasható' : miss.length ? `${miss.length} hiányzó feltétel` : 'Minden feltétel teljesült'}</span>
                {canDelete && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openDlg({ type: 'deletetest', pid: p.id })}><TrashIcon />Teszt törlése</Button>}
              </div>
              {!p.closed && <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => openDlg({ type: 'fail', pid: p.id })}>Sikertelen eljárás</Button>
                <Button size="sm" disabled={miss.length > 0} title={miss.map((m: any) => m.short || m.label).join(' | ')} onClick={() => { const r = run(() => advance(p.id)); if (r === 'close') openDlg({ type: 'close', pid: p.id }) }}>{last ? 'Beszerzés lezárása' : 'Tovább a következő szakaszba'}</Button>
              </div>}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
