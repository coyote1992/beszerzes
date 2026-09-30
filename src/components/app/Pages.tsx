import { ArrowRightIcon, FileDownloadIcon, LockIcon, PlusMediumIcon, ShieldCheckIcon } from 'blode-icons-react'
import {
  S, STAGES, CC, TYPEDESC, ATITLE, ADESC, nf, INF, fdt, fDay, ft, nextDue, pendingFor, rel, short, statusOf, typeOf, verifyChain, fShort,
} from '@/engine/engine.js'
import { csvExport, toggleTask } from '@/engine/commands.js'
import { commit, openDlg, openProc, run, setUI, useUI } from '@/lib/store'
import { Chip, People, Person, STAGE_BG, TypeChip, procName, procTone, typeTone, fixName, type Tone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, PageHead, Panel, PanelHead } from './Page'
import { Sel } from './Sel'

/* ================= Procurements ================= */
export function StageDots({ stage, closed }: { stage: number; closed?: boolean }) {
  return (
    <span className="flex items-center gap-1" title={`PROC${stage}`}>
      {STAGES.map((_: any, i: number) => <span key={i} className={cn('h-1.5 rounded-full transition-all', i + 1 <= stage || closed ? cn(STAGE_BG[i], i + 1 === stage && !closed ? 'w-6' : 'w-3') : 'w-3 bg-border')} />)}
    </span>
  )
}
export function Procurements() {
  const u = useUI()
  const l = S.procs.filter((p: any) => {
    const q = u.q.toLowerCase()
    return (!q || (p.id + p.subject + p.bidders.map((b: any) => b.name).join(' ')).toLowerCase().includes(q)) && (!u.fType || typeOf(p.value) === u.fType) && (!u.fStage || String(p.stage) === u.fStage) && (!u.fProc || p.proc === u.fProc)
  })
  return (
    <>
      <PageHead kicker="Tenderportfólió" title="Beszerzések" sub="Minden folyamat egy helyen, a teljes döntési és dokumentációs lánccal." actions={<Button onClick={() => openDlg({ type: 'new' })}><PlusMediumIcon />Új beszerzés</Button>} />
      <Panel className="mb-5 p-3" i={1}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1"><Input placeholder="Keresés azonosító, tárgy vagy beszállító alapján…" value={u.q} onChange={(e) => setUI({ q: e.target.value })} /></div>
          <div className="w-44"><Sel value={u.fType} onChange={(v) => setUI({ fType: v })} options={[['', 'Minden típus'], ['Egyedi', 'Egyedi'], ['Egyszerű', 'Egyszerű'], ['Kiemelt', 'Kiemelt']]} /></div>
          <div className="w-52"><Sel value={u.fStage} onChange={(v) => setUI({ fStage: v })} options={[['', 'Minden szakasz'], ...STAGES.map((s: string[], i: number) => [String(i + 1), `${s[0]} · ${s[1]}`] as [string, string])]} /></div>
          <div className="w-44"><Sel value={u.fProc} onChange={(v) => setUI({ fProc: v })} options={[['', 'Minden eljárás'], ['Tender', 'Tender'], ['SS', 'Sole Source'], ['Vészhelyzeti', 'Vészhelyzeti']]} /></div>
          <Button variant="ghost" onClick={() => setUI({ q: '', fType: '', fStage: '', fProc: '' })}>Szűrők törlése</Button>
        </div>
      </Panel>
      <Panel i={2} className="overflow-hidden">
        <PanelHead title={`${l.length} beszerzés`} sub="Az értékek nettó HUF összegek." />
        {l.length === 0 ? <Empty>Nincs a szűrésnek megfelelő beszerzés.</Empty> : (
          <Table>
            <TableHeader><TableRow><TableHead className="pl-6">Azonosító / tárgy</TableHead><TableHead>Kategória</TableHead><TableHead>Eljárás</TableHead><TableHead>Érték</TableHead><TableHead>Szakasz</TableHead><TableHead>Státusz</TableHead><TableHead>Felelős</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {l.map((p: any) => { const s = statusOf(p); return (
                <TableRow key={p.id} className="cursor-pointer hover:bg-accent/40" onClick={() => openProc(p.id)}>
                  <TableCell className="pl-6"><span className="font-mono text-xs font-bold text-primary">{p.id}</span><div className="font-semibold">{p.subject}</div></TableCell>
                  <TableCell><b>{p.cat}</b>{p.ifs && <div className="text-xs text-muted-foreground">IFS-kritikus</div>}</TableCell>
                  <TableCell><Chip tone={procTone(p.proc)}>{procName(p.proc)}</Chip></TableCell>
                  <TableCell><b>{short(p.value)}</b><div className="mt-0.5"><TypeChip value={p.value} /></div></TableCell>
                  <TableCell><div className="text-sm"><b>PROC{p.stage}</b> <span className="text-muted-foreground">{STAGES[p.stage - 1][1]}</span></div><StageDots stage={p.stage} closed={!!p.closed} /></TableCell>
                  <TableCell><Chip tone={s.t as Tone} dot>{s.l}</Chip></TableCell>
                  <TableCell><Person name={p.owner} /></TableCell>
                  <TableCell className="pr-6"><ArrowRightIcon className="size-4 text-muted-foreground" /></TableCell>
                </TableRow>) })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}

/* ================= Approvals ================= */
export function Approvals() {
  const u = useUI()
  const wait = pendingFor(S.user)
  const hist: any[] = []
  S.procs.forEach((p: any) => Object.keys(p.appr).forEach((k) => p.appr[k].decisions.forEach((d: any) => { if (d.by === S.user) hist.push({ p, k, d }) })))
  hist.sort((a, b) => (a.d.ts < b.d.ts ? 1 : -1))
  return (
    <>
      <PageHead kicker="Személyes munkalista" title="Jóváhagyásaim" sub="A jóváhagyás a dokumentum aktuális verziójához és időbélyegéhez kötődik – új verzió érvényteleníti." />
      <div className="mb-5 flex gap-2">
        <Button variant={u.apprTab === 'wait' ? 'default' : 'outline'} onClick={() => setUI({ apprTab: 'wait' })}>Jóváhagyásra vár <span className="ml-1 rounded-full bg-white/25 px-1.5 text-xs">{wait.length}</span></Button>
        <Button variant={u.apprTab === 'hist' ? 'default' : 'outline'} onClick={() => setUI({ apprTab: 'hist' })}>Korábbi döntések</Button>
      </div>
      {u.apprTab === 'wait' ? (wait.length === 0 ? <Panel><Empty>{S.user} számára nincs függő jóváhagyás. Váltson felhasználót a jobb felső menüben (pl. CEO / CFO).</Empty></Panel> :
        <div className="flex flex-col gap-4">{wait.map((x: any, i: number) => {
          const p = x.p, a = x.a, others = a.per.filter((y: any) => y.name !== S.user), conflict = (x.key === 'ssd' || x.key === 'ss') && S.user === p.requester
          return (
            <Panel key={p.id + x.key} i={i + 1} className="flex flex-wrap items-center justify-between gap-5 p-6">
              <div className="min-w-72 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-primary">{p.id}</span><TypeChip value={p.value} /><Chip tone={procTone(p.proc)}>{procName(p.proc)}</Chip></div>
                <h3 className="font-display mt-2 text-2xl font-bold leading-tight">{ATITLE[x.key]} · {p.subject}</h3>
                <p className="text-sm text-muted-foreground">{ADESC[x.key]}</p>
                <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <Meta l="Érték" v={ft(p.value)} /><Meta l="Igénylő" v={p.requester} /><Meta l="Dokumentumverzió" v={a.doc ? 'v' + a.ver : '–'} /><Meta l="Határidő" v={fDay(nextDue(p).date || p.due[p.stage])} />
                  {others.length > 0 && <Meta l="További jóváhagyók" v={others.map((o: any) => fixName(o.name) + (o.state === 'approved' ? ' ✓' : ' ⏳')).join(', ')} />}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => openProc(p.id, 'appr')}>Részletek</Button>
                <Button variant="destructive" disabled={conflict} onClick={() => openDlg({ type: 'decide', pid: p.id, key: x.key, dec: 'reject' })}>Elutasítom</Button>
                <Button variant="success" disabled={conflict} onClick={() => openDlg({ type: 'decide', pid: p.id, key: x.key, dec: 'approve' })}>Jóváhagyom</Button>
              </div>
            </Panel>)
        })}</div>) : (
        <Panel className="overflow-hidden">
          {hist.length === 0 ? <Empty>Még nincs korábbi döntés.</Empty> : (
            <Table><TableHeader><TableRow><TableHead className="pl-6">Időpont</TableHead><TableHead>Beszerzés</TableHead><TableHead>Jóváhagyás</TableHead><TableHead>Döntés</TableHead><TableHead>Megjegyzés</TableHead></TableRow></TableHeader>
              <TableBody>{hist.map((h, i) => (
                <TableRow key={i} className="cursor-pointer" onClick={() => openProc(h.p.id)}><TableCell className="pl-6">{fdt(h.d.ts)}</TableCell><TableCell><span className="font-mono text-xs font-bold text-primary">{h.p.id}</span><div>{h.p.subject}</div></TableCell><TableCell>{ATITLE[h.k]} · v{h.d.ver}</TableCell><TableCell><Chip tone={h.d.dec === 'approve' ? 'ok' : 'bad'}>{h.d.dec === 'approve' ? 'Jóváhagyva' : 'Elutasítva'}</Chip></TableCell><TableCell>{h.d.c}</TableCell></TableRow>))}</TableBody></Table>)}
        </Panel>)}
    </>
  )
}
const Meta = ({ l, v }: { l: string; v: string }) => <div><div className="text-xs text-muted-foreground">{l}</div><b>{v}</b></div>

/* ================= Tasks ================= */
export function TaskRow({ t }: { t: any }) {
  const p = S.procs.find((x: any) => x.id === t.pid)
  const late = !t.done && t.due < S.today
  return (
    <div className="flex items-start gap-4 border-t border-border px-6 py-4 first:border-t-0">
      <Checkbox className="mt-1" checked={!!t.done} onCheckedChange={(v: any) => { run(() => toggleTask(t.id, !!v)) }} />
      <div className="min-w-0 flex-1">
        <b className={cn('block', t.done && 'text-muted-foreground line-through')}>{t.title}</b>
        <span className="block text-sm text-muted-foreground">{t.desc}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{p && <button className="font-mono font-bold text-primary hover:underline" onClick={() => openProc(p.id)}>{p.id}</button>}· kiosztotta: {t.by}</span>
      </div>
      <div className="text-right"><People who={t.owner} /><b className={cn('mt-1 block text-sm', late && 'text-destructive')}>{t.done ? 'Kész: ' + fShort(t.done.slice(0, 10)) : 'Határidő: ' + rel(t.due)}</b></div>
    </div>
  )
}
export function Tasks() {
  const u = useUI(), f = u.taskF
  const l = S.tasks.filter((t: any) => (f === 'me' ? t.owner === S.user && !t.done : f === 'by' ? t.by === S.user && !t.done : f === 'done' ? !!t.done : !t.done)).sort((a: any, b: any) => (a.due < b.due ? -1 : 1))
  return (
    <>
      <PageHead kicker="Személyes munkalista" title="Feladatok" sub="Felelős, határidő és leírás – minden feladat az auditnaplóba kerül." actions={<Button onClick={() => openDlg({ type: 'task' })}><PlusMediumIcon />Új feladat</Button>} />
      <div className="mb-5 flex flex-wrap gap-2">{[['me', 'Feladataim'], ['by', 'Általam kiosztott'], ['all', 'Minden nyitott'], ['done', 'Lezárt']].map(([k, l2]) => <Button key={k} variant={f === k ? 'default' : 'outline'} onClick={() => setUI({ taskF: k })}>{l2}</Button>)}</div>
      <Panel>{l.length ? l.map((t: any) => <TaskRow key={t.id} t={t} />) : <Empty>Nincs megjeleníthető feladat.</Empty>}</Panel>
    </>
  )
}

/* ================= Audit ================= */
export function auditRows(pid: string, q: string) {
  const s = q.toLowerCase()
  return S.audit.slice().reverse().filter((e: any) => (!pid || e.proc === pid) && (!s || (e.title + e.detail + e.user + e.proc + e.type).toLowerCase().includes(s)))
}
export function AuditTimeline({ rows, showProc = true }: { rows: any[]; showProc?: boolean }) {
  if (!rows.length) return <Empty>Nincs találat.</Empty>
  return (
    <ol className="px-6 pb-6">
      {rows.map((e) => (
        <li key={e.n} className="relative grid grid-cols-[8.5rem_2.5rem_1fr_auto] items-start gap-4 py-3 max-md:grid-cols-[2.5rem_1fr]">
          <time className="pt-2 text-xs text-muted-foreground max-md:col-span-2 max-md:pt-0">{fdt(e.ts)}</time>
          <span className="relative grid size-10 place-items-center rounded-full bg-s5-soft font-display text-sm font-extrabold text-s5-ink after:absolute after:left-1/2 after:top-11 after:h-[calc(100%-1.6rem)] after:w-px after:bg-border last:after:hidden">{e.user[0]}</span>
          <div><b className="block">{e.title}</b><span className="text-sm text-muted-foreground">{e.detail} · <b className="text-foreground">{e.user}</b></span><div className="font-mono text-[10px] text-muted-foreground/70">#{e.n} · {e.hash.slice(0, 10)}</div></div>
          {showProc && <button className="font-mono text-xs font-bold text-primary hover:underline" onClick={() => openProc(e.proc)}>{e.proc}</button>}
        </li>
      ))}
    </ol>
  )
}
export function Audit() {
  const u = useUI()
  const rows = auditRows(u.auditP, u.auditQ).slice(0, 120)
  const verify = () => { const r = verifyChain(); setUI({ auditMsg: r.ok ? ['ok', `A hash-lánc ép: mind a(z) ${r.n} bejegyzés az előzőhöz kapcsolódik, egyik sem módosult.`] : ['bad', `Integritási hiba a(z) #${r.at} bejegyzésnél – a napló tartalma megváltozott a rögzítés óta.`] }) }
  const tamper = () => {
    if (u.tamper) { S.audit[u.tamper.i].detail = u.tamper.orig; setUI({ tamper: null, auditMsg: ['ok', 'Az eredeti bejegyzés visszaállítva (csak demó). Éles rendszerben ez nem lehetséges.'] }) }
    else { const i = Math.floor(S.audit.length / 2), e = S.audit[i]; const orig = e.detail; e.detail += ' (utólag módosítva)'; setUI({ tamper: { i, orig }, auditMsg: ['bad', `A(z) #${e.n} bejegyzést szimuláltan módosítottuk. Futtassa a lánc-ellenőrzést!`] }) }
    commit()
  }
  return (
    <>
      <PageHead kicker="Csak hozzáfűzhető eseménynapló" title="Auditnapló" sub="Minden művelet felhasználóhoz, rendszeridőhöz és tenderazonosítóhoz kötve; a bejegyzések hash-lánccal kapcsolódnak."
        actions={<><Button variant="outline" onClick={verify}><ShieldCheckIcon />Lánc ellenőrzése</Button><Button variant="outline" onClick={tamper}>{u.tamper ? 'Visszaállítás' : 'Manipuláció szimulálása'}</Button><Button variant="outline" onClick={csvExport}><FileDownloadIcon />CSV export</Button></>} />
      {u.auditMsg && <div className={cn('pop mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium', u.auditMsg[0] === 'ok' ? 'bg-s3-soft text-s3-ink' : 'bg-s1-soft text-s1-ink')}><ShieldCheckIcon className="size-5" />{u.auditMsg[1]}</div>}
      <Panel>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-56 flex-1"><Input placeholder="Keresés az eseményekben…" value={u.auditQ} onChange={(e) => setUI({ auditQ: e.target.value })} /></div>
          <div className="w-56"><Sel value={u.auditP} onChange={(v) => setUI({ auditP: v })} options={[['', 'Minden beszerzés'], ...S.procs.map((p: any) => [p.id, p.id] as [string, string])]} /></div>
          <Chip tone="ok"><LockIcon className="size-3" />Csak olvasható</Chip>
        </div>
        <AuditTimeline rows={rows} />
      </Panel>
    </>
  )
}

/* ================= Policy ================= */
export function Policy() {
  const band = (b: any[]) => b.map((x, i) => { const lo = i ? b[i - 1][0] : 0; return (x[1] ? x[1] : 'nincs jóváhagyás') + ' (' + (x[0] === INF ? '≥ ' + nf.format(lo) : '< ' + nf.format(x[0])) + ' Ft)' }).join(' → ')
  const rows: [string, string][] = [['Tenderkiírás kiküldése (minden értéken)', 'CEO + CFO együtt'], ['Szerződés > 20 M Ft', 'Jogi + Pénzügy (5 munkanap)'], ['Cégszerű aláírás', 'CEO + CFO együtt'], ['Sole Source', 'Értékhatár szerinti jóváhagyók + indoklás'], ['Vészhelyzeti < 2 M Ft / ≥ 2 M Ft', 'Költséghely-felelős / CEO'], ['Előleg bankgarancia nélkül', 'CFO'], ['SSD végső jóváhagyás', 'Az igénylő nem vehet részt']]
  return (
    <>
      <PageHead kicker="Beszerzési szabályzat 01. verzió" title="Szabályzat a rendszerben" sub="Az alkalmazás ezeket a szabályokat kényszeríti ki – nem a felhasználó választja ki, hanem az érték alapján számolja." />
      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Panel i={1}><PanelHead title="Típusok és értékhatárok (7. fejezet)" />
          <div className="flex flex-col gap-2 px-4 pb-4">
            {(['Egyedi', 'Egyszerű', 'Kiemelt'] as const).map((t) => <div key={t} className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"><Chip tone={typeTone(t)}>{t}</Chip><b className="w-40 shrink-0 text-sm">{t === 'Egyedi' ? '< 2 000 000 Ft' : t === 'Egyszerű' ? '2 – 20 000 000 Ft' : '> 20 000 000 Ft'}</b><span className="text-sm text-muted-foreground">{TYPEDESC[t]}</span></div>)}
            <div className="rounded-2xl bg-s2-soft p-3 text-sm text-s2-ink"><b>Eltérés a szabályzatban:</b> az 1. melléklet (BSD) még 1 / 10 M Ft határokat említ. Az alkalmazás egyetlen mátrixot – a 7. fejezetet – használja; a BSD-sablont ehhez kell igazítani.</div>
          </div>
        </Panel>
        <Panel i={2}><PanelHead title="Kötelező jóváhagyások (8.2)" />
          <div className="px-4 pb-4">{rows.map(([a, b]) => <div key={a} className="flex justify-between gap-4 border-t border-border px-2 py-2.5 text-sm first:border-t-0"><span>{a}</span><b className="text-right">{b}</b></div>)}</div>
        </Panel>
      </div>
      <Panel i={3} className="mb-5 overflow-hidden"><PanelHead title="Költséghelyek és jóváhagyási szintek (11. melléklet)" />
        <Table><TableHeader><TableRow><TableHead className="pl-6">Kód</TableHead><TableHead>Név</TableHead><TableHead>Jóváhagyási szintek</TableHead></TableRow></TableHeader>
          <TableBody>{Object.keys(CC).map((k) => <TableRow key={k}><TableCell className="pl-6 font-mono text-xs">{k}</TableCell><TableCell>{CC[k].n}</TableCell><TableCell className="text-sm">{band(CC[k].b)}</TableCell></TableRow>)}</TableBody></Table>
      </Panel>
      <Panel i={4}><PanelHead title="Folyamatlépések és megőrzési idők" />
        <div className="grid gap-2 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {STAGES.map((s: string[], i: number) => <div key={s[0]} className="rounded-2xl bg-muted/60 p-3 text-sm"><span className={cn('mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white', STAGE_BG[i])}>{s[0]}</span><b>{s[1]}</b><div className="mt-1 text-muted-foreground">{['Igénylő', 'Beszerzés + Igénylő + MI', 'Beszerzés + Igénylő', 'Beszerzés (vezeti) + Igénylő', 'Beszerzés + Jogi/Pénzügy + CEO/CFO', 'Beszerzés + MDM + Raktár + MI'][i]}</div></div>)}
        </div>
        <div className="border-t border-border px-6 py-4 text-sm text-muted-foreground">Megőrzés: szerződések és kapcsolódó dokumentáció a lejártot követő <b className="text-foreground">8 év</b> · PO és számla <b className="text-foreground">8 év</b> · tenderdokumentáció (nem nyertes ajánlatok is) <b className="text-foreground">5 év</b>.</div>
      </Panel>
    </>
  )
}
