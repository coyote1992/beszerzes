import { useState } from 'react'
import { ArrowRightIcon, EditIcon, FileDownloadIcon, LockIcon, PlusMediumIcon, ShieldCheckIcon } from 'blode-icons-react'
import {
  S, STAGES, CC, ROLES, TYPEDESC, ATITLE, ADESC, nf, fdt, fDay, ft, nextDue, pendingFor, rel, short, statusOf, typeOf, fShort, nm, resolveRef, log, applyRoles, isBuiltinRole,
} from '@/engine/engine.js'
import { csvExport, toggleTask } from '@/engine/commands.js'
import { notify } from '@/engine/notify.js'
import { commit, openDlg, openProc, run, setUI, useUI } from '@/lib/store'
import { Chip, People, Person, STAGE_BG, TypeChip, procName, procTone, typeTone, fixName, peopleOpts, type Tone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Empty, PageHead, Panel, PanelHead } from './Page'
import { Sel, type Opt } from './Sel'

/* ================= Procurements ================= */
export function StageDots({ stage, closed }: { stage: number; closed?: boolean }) {
  return (
    <span className="flex items-center gap-1" title={`PROC${stage}`}>
      {STAGES.map((_: any, i: number) => <span key={i} className={cn('h-1 rounded-full transition-all', i + 1 <= stage || closed ? cn(STAGE_BG[i], i + 1 === stage && !closed ? 'w-5' : 'w-2.5') : 'w-2.5 bg-border')} />)}
    </span>
  )
}
export const TestBadge = () => <span className="rounded border border-dashed px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">teszt</span>

export function Procurements() {
  const u = useUI()
  const filtered = u.q || u.fType || u.fStage || u.fProc
  const l = S.procs.filter((p: any) => {
    const q = u.q.toLowerCase()
    return (!q || (p.id + p.subject + p.bidders.map((b: any) => b.name).join(' ')).toLowerCase().includes(q)) && (!u.fType || typeOf(p.value) === u.fType) && (!u.fStage || String(p.stage) === u.fStage) && (!u.fProc || p.proc === u.fProc)
  })
  return (
    <>
      <PageHead title="Beszerzések" sub="Minden beszerzés a teljes döntési és dokumentációs lánccal." actions={<Button onClick={() => openDlg({ type: 'new' })} data-tour="new"><PlusMediumIcon />Új beszerzés</Button>} />
      {S.procs.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-56 flex-1"><Input placeholder="Keresés azonosító, tárgy vagy beszállító alapján…" value={u.q} onChange={(e) => setUI({ q: e.target.value })} /></div>
          <div className="w-40"><Sel value={u.fType} onChange={(v) => setUI({ fType: v })} options={[['', 'Minden típus'], ['Egyedi', 'Egyedi'], ['Egyszerű', 'Egyszerű'], ['Kiemelt', 'Kiemelt']]} /></div>
          <div className="w-48"><Sel value={u.fStage} onChange={(v) => setUI({ fStage: v })} options={[['', 'Minden szakasz'], ...STAGES.map((s: string[], i: number) => [String(i + 1), `${s[0]} · ${s[1]}`] as Opt)]} /></div>
          <div className="w-40"><Sel value={u.fProc} onChange={(v) => setUI({ fProc: v })} options={[['', 'Minden eljárás'], ['Tender', 'Tender'], ['SS', 'Sole Source'], ['Vészhelyzeti', 'Vészhelyzeti']]} /></div>
          {filtered && <Button variant="ghost" onClick={() => setUI({ q: '', fType: '', fStage: '', fProc: '' })}>Szűrők törlése</Button>}
        </div>
      )}
      <Panel className="overflow-hidden">
        {S.procs.length === 0 ? (
          <Empty action={<Button onClick={() => openDlg({ type: 'new' })}><PlusMediumIcon />Első beszerzés indítása</Button>}>
            Még nincs beszerzés. Indíts egyet – ha csak kipróbálnád, jelöld be a „Gyakorló (TESZT) beszerzés” opciót, így később nyomtalanul törölhető.
          </Empty>
        ) : l.length === 0 ? <Empty>Nincs a szűrésnek megfelelő beszerzés.</Empty> : (
          <Table>
            <TableHeader><TableRow><TableHead className="pl-4">Azonosító / tárgy</TableHead><TableHead>Kategória</TableHead><TableHead>Eljárás</TableHead><TableHead>Érték</TableHead><TableHead>Szakasz</TableHead><TableHead>Státusz</TableHead><TableHead>Felelős</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {l.map((p: any) => { const s = statusOf(p); return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => openProc(p.id)}>
                  <TableCell className="pl-4"><span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">{p.id}{p.test && <TestBadge />}</span><div className="font-medium">{p.subject}</div></TableCell>
                  <TableCell>{p.cat}{p.ifs && <div className="text-xs text-muted-foreground">IFS-kritikus</div>}</TableCell>
                  <TableCell><Chip tone={procTone(p.proc)}>{procName(p.proc)}</Chip></TableCell>
                  <TableCell><span className="font-medium tabular-nums">{short(p.value)}</span><div className="mt-0.5"><TypeChip value={p.value} /></div></TableCell>
                  <TableCell><div className="text-xs"><span className="font-medium">PROC{p.stage}</span> <span className="text-muted-foreground">{STAGES[p.stage - 1][1]}</span></div><StageDots stage={p.stage} closed={!!p.closed} /></TableCell>
                  <TableCell><Chip tone={s.t as Tone} dot>{s.l}</Chip></TableCell>
                  <TableCell><Person name={p.owner} /></TableCell>
                  <TableCell className="pr-4"><ArrowRightIcon className="size-4 text-muted-foreground" /></TableCell>
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
      <PageHead title="Jóváhagyásaim" sub="A jóváhagyás a dokumentum aktuális verziójához és időbélyegéhez kötődik – új verzió érvényteleníti." />
      <div className="mb-3 flex gap-1.5">
        <Button size="sm" variant={u.apprTab === 'wait' ? 'default' : 'outline'} onClick={() => setUI({ apprTab: 'wait' })}>Jóváhagyásra vár <span className="ml-1 tabular-nums opacity-70">{wait.length}</span></Button>
        <Button size="sm" variant={u.apprTab === 'hist' ? 'default' : 'outline'} onClick={() => setUI({ apprTab: 'hist' })}>Korábbi döntések</Button>
      </div>
      {u.apprTab === 'wait' ? (wait.length === 0 ? <Panel><Empty>Nincs függő jóváhagyásod. Ha egy beszerzés a te jóváhagyásodra vár, itt jelenik meg.</Empty></Panel> :
        <div className="flex flex-col gap-3">{wait.map((x: any, i: number) => {
          const p = x.p, a = x.a, others = a.per.filter((y: any) => y.name !== S.user), conflict = !p.test && (x.key === 'ssd' || x.key === 'ss') && S.user === p.requester
          return (
            <Panel key={p.id + x.key} i={i + 1} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-72 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{p.id}</span><TypeChip value={p.value} /><Chip tone={procTone(p.proc)}>{procName(p.proc)}</Chip></div>
                <h3 className="mt-1.5 text-base font-semibold leading-snug">{ATITLE[x.key]} · {p.subject}</h3>
                <p className="text-sm text-muted-foreground">{ADESC[x.key]}</p>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <Meta l="Érték" v={ft(p.value)} /><Meta l="Igénylő" v={nm(p.requester)} /><Meta l="Dokumentumverzió" v={a.doc ? 'v' + a.ver : '–'} /><Meta l="Határidő" v={fDay(nextDue(p).date || p.due[p.stage])} />
                  {others.length > 0 && <Meta l="További jóváhagyók" v={others.map((o: any) => fixName(o.name) + (o.state === 'approved' ? ' ✓' : ' ⏳')).join(', ')} />}
                </div>
                {conflict && <p className="mt-2 text-xs text-destructive">Az igénylő nem hagyhatja jóvá a saját beszerzésének kiválasztását.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openProc(p.id, 'appr')}>Részletek</Button>
                <Button size="sm" variant="destructive" disabled={conflict} onClick={() => openDlg({ type: 'decide', pid: p.id, key: x.key, dec: 'reject' })}>Elutasítom</Button>
                <Button size="sm" disabled={conflict} onClick={() => openDlg({ type: 'decide', pid: p.id, key: x.key, dec: 'approve' })}>Jóváhagyom</Button>
              </div>
            </Panel>)
        })}</div>) : (
        <Panel className="overflow-hidden">
          {hist.length === 0 ? <Empty>Még nincs korábbi döntés.</Empty> : (
            <Table><TableHeader><TableRow><TableHead className="pl-4">Időpont</TableHead><TableHead>Beszerzés</TableHead><TableHead>Jóváhagyás</TableHead><TableHead>Döntés</TableHead><TableHead>Megjegyzés</TableHead></TableRow></TableHeader>
              <TableBody>{hist.map((h, i) => (
                <TableRow key={i} className="cursor-pointer" onClick={() => openProc(h.p.id)}><TableCell className="pl-4">{fdt(h.d.ts)}</TableCell><TableCell><span className="font-mono text-xs text-muted-foreground">{h.p.id}</span><div>{h.p.subject}</div></TableCell><TableCell>{ATITLE[h.k]} · v{h.d.ver}</TableCell><TableCell><Chip tone={h.d.dec === 'approve' ? 'ok' : 'bad'}>{h.d.dec === 'approve' ? 'Jóváhagyva' : 'Elutasítva'}</Chip></TableCell><TableCell>{h.d.c}</TableCell></TableRow>))}</TableBody></Table>)}
        </Panel>)}
    </>
  )
}
const Meta = ({ l, v }: { l: string; v: string }) => <div><div className="text-xs text-muted-foreground">{l}</div><span className="font-medium">{v}</span></div>

/* ================= Tasks ================= */
export function TaskRow({ t }: { t: any }) {
  const p = S.procs.find((x: any) => x.id === t.pid)
  const late = !t.done && t.due < S.today
  return (
    <div className="flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
      <Checkbox className="mt-0.5" checked={!!t.done} onCheckedChange={(v: any) => { run(() => toggleTask(t.id, !!v)) }} />
      <div className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium', t.done && 'text-muted-foreground line-through')}>{t.title}</span>
        {t.desc && <span className="block text-sm text-muted-foreground">{t.desc}</span>}
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{p && <><button className="font-mono hover:text-foreground hover:underline" onClick={() => openProc(p.id)}>{p.id}</button>·</>} kiosztotta: {nm(t.by)}</span>
      </div>
      <div className="text-right"><People who={t.owner} /><span className={cn('mt-1 block text-xs font-medium', late && 'text-destructive')}>{t.done ? 'Kész: ' + fShort(t.done.slice(0, 10)) : 'Határidő: ' + rel(t.due)}</span></div>
    </div>
  )
}
export function Tasks() {
  const u = useUI(), f = u.taskF
  const l = S.tasks.filter((t: any) => (f === 'me' ? t.owner === S.user && !t.done : f === 'by' ? t.by === S.user && !t.done : f === 'done' ? !!t.done : !t.done)).sort((a: any, b: any) => (a.due < b.due ? -1 : 1))
  return (
    <>
      <PageHead title="Feladatok" sub="Felelős, határidő és leírás – minden feladat az auditnaplóba kerül." actions={<Button onClick={() => openDlg({ type: 'task' })}><PlusMediumIcon />Új feladat</Button>} />
      <div className="mb-3 flex flex-wrap gap-1.5">{[['me', 'Feladataim'], ['by', 'Általam kiosztott'], ['all', 'Minden nyitott'], ['done', 'Lezárt']].map(([k, l2]) => <Button size="sm" key={k} variant={f === k ? 'default' : 'outline'} onClick={() => setUI({ taskF: k })}>{l2}</Button>)}</div>
      <Panel>{l.length ? l.map((t: any) => <TaskRow key={t.id} t={t} />) : <Empty>Nincs megjeleníthető feladat.</Empty>}</Panel>
    </>
  )
}

/* ================= Audit ================= */
export function auditRows(pid: string, q: string) {
  const s = q.toLowerCase()
  return S.audit.slice().reverse().filter((e: any) => (!pid || e.proc === pid) && (!s || (e.title + e.detail + e.user + (e.userName || '') + e.proc + e.type).toLowerCase().includes(s)))
}
export function AuditTimeline({ rows, showProc = true }: { rows: any[]; showProc?: boolean }) {
  if (!rows.length) return <Empty>Nincs bejegyzés.</Empty>
  return (
    <ol className="px-4 pb-3">
      {rows.map((e, i) => (
        <li key={e.hash || e.n || i} className="grid grid-cols-[7.5rem_1fr_auto] items-start gap-3 border-t py-2.5 first:border-t-0 max-md:grid-cols-[1fr_auto]">
          <time className="pt-0.5 text-xs tabular-nums text-muted-foreground max-md:col-span-2">{e.ts ? fdt(e.ts) : 'mentés alatt…'}</time>
          <div className="min-w-0">
            <span className="block text-sm font-medium">{e.title}</span>
            <span className="text-sm text-muted-foreground">{e.detail}{e.detail && ' · '}<span className="text-foreground">{e.userName || nm(e.user)}</span></span>
            {e.hash && <div className="font-mono text-[10px] text-muted-foreground/70">{e.test ? 'teszt' : '#' + e.n} · {e.hash.slice(0, 10)}</div>}
          </div>
          {showProc && e.proc ? <button className="font-mono text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => openProc(e.proc)}>{e.proc}</button> : <span />}
        </li>
      ))}
    </ol>
  )
}
export function Audit() {
  const u = useUI()
  const [busy, setBusy] = useState(false)
  const all = auditRows(u.auditP, u.auditQ)
  const rows = all.slice(0, 200)
  const verify = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/audit/verify', { credentials: 'same-origin' }).then((x) => x.json())
      if (r.error) throw new Error(r.message || r.error)
      setUI({ auditMsg: r.ok ? ['ok', `A hash-lánc ép: mind a(z) ${r.n} bejegyzés az előzőhöz kapcsolódik, egyik sem módosult.`] : ['bad', r.missing ? `Integritási hiba: ${r.missing} bejegyzés hiányzik a naplóból.` : `Integritási hiba a(z) #${r.at} bejegyzésnél – a napló tartalma megváltozott a rögzítés óta.`] })
    } catch (e) { notify('Ellenőrzés sikertelen: ' + (e as Error).message, 'bad') } finally { setBusy(false) }
  }
  return (
    <>
      <PageHead title="Auditnapló" sub="Csak hozzáfűzhető napló: minden művelet felhasználóhoz, szerveridőhöz és beszerzéshez kötve, SHA-256 hash-lánccal."
        actions={<><Button variant="outline" onClick={() => void verify()} disabled={busy}><ShieldCheckIcon />{busy ? 'Ellenőrzés…' : 'Lánc ellenőrzése'}</Button><Button variant="outline" onClick={csvExport}><FileDownloadIcon />CSV export</Button></>} />
      {u.auditMsg && <div className={cn('pop mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', u.auditMsg[0] === 'ok' ? 'bg-s3-soft text-s3-ink' : 'bg-s1-soft text-s1-ink')}><ShieldCheckIcon className="size-4" />{u.auditMsg[1]}</div>}
      <Panel>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="min-w-56 flex-1"><Input placeholder="Keresés az eseményekben…" value={u.auditQ} onChange={(e) => setUI({ auditQ: e.target.value })} /></div>
          <div className="w-52"><Sel value={u.auditP} onChange={(v) => setUI({ auditP: v })} options={[['', 'Minden beszerzés'], ...S.procs.map((p: any) => [p.id, p.id] as Opt)]} /></div>
          <Chip><LockIcon className="size-3" />Csak olvasható</Chip>
        </div>
        <AuditTimeline rows={rows} />
        {all.length > rows.length && <div className="border-t px-4 py-2 text-xs text-muted-foreground">A legutóbbi {rows.length} bejegyzés látható ({all.length} összesen). A teljes napló a CSV exportban és a SharePoint „Auditnapló” listában érhető el.</div>}
      </Panel>
    </>
  )
}

/* ================= Policy ================= */
const bandText = (code: string, b: any[]) => b.map((x, i) => {
  const lo = i ? b[i - 1][0] : 0, who = x[1] === null ? 'nincs jóváhagyás' : nm(resolveRef(x[1], code, i))
  return `${who} (${x[0] == null ? '≥ ' + nf.format(lo) : '< ' + nf.format(x[0])} Ft)`
}).join(' → ')

export function Policy() {
  const rows: [string, string][] = [['Tenderkiírás kiküldése (minden értéken)', 'CEO + CFO együtt'], ['Szerződés > 20 M Ft', 'Jogi + Pénzügy (5 munkanap)'], ['Cégszerű aláírás', 'CEO + CFO együtt'], ['Sole Source', 'Értékhatár szerinti jóváhagyók + indoklás'], ['Vészhelyzeti < 2 M Ft / ≥ 2 M Ft', 'Költséghely-felelős / CEO'], ['Előleg bankgarancia nélkül', 'CFO'], ['SSD végső jóváhagyás', 'Az igénylő nem vehet részt']]
  return (
    <>
      <PageHead title="Szabályzat" sub="Az alkalmazás ezeket a szabályokat kényszeríti ki – a besorolást az érték alapján számolja, nem a felhasználó választja." />
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Panel i={1}><PanelHead title="Típusok és értékhatárok (7. fejezet)" />
          <div className="flex flex-col gap-2 px-4 pb-4">
            {(['Egyedi', 'Egyszerű', 'Kiemelt'] as const).map((t) => <div key={t} className="flex items-center gap-3 rounded-lg border p-2.5"><Chip tone={typeTone(t)}>{t}</Chip><span className="w-36 shrink-0 text-sm font-medium tabular-nums">{t === 'Egyedi' ? '< 2 000 000 Ft' : t === 'Egyszerű' ? '2 – 20 000 000 Ft' : '> 20 000 000 Ft'}</span><span className="text-sm text-muted-foreground">{TYPEDESC[t]}</span></div>)}
            <div className="rounded-lg bg-s2-soft p-2.5 text-sm text-s2-ink"><b>Eltérés a szabályzatban:</b> az 1. melléklet (BSD) még 1 / 10 M Ft határokat említ. Az alkalmazás a 7. fejezet mátrixát használja; a BSD-sablont ehhez kell igazítani.</div>
          </div>
        </Panel>
        <Panel i={2}><PanelHead title="Kötelező jóváhagyások (8.2)" />
          <div className="px-4 pb-3">{rows.map(([a, b]) => <div key={a} className="flex justify-between gap-4 border-t py-2 text-sm first:border-t-0"><span>{a}</span><span className="text-right font-medium">{b}</span></div>)}</div>
        </Panel>
      </div>
      <Panel i={3} className="mb-4 overflow-hidden"><PanelHead title="Költséghelyek és jóváhagyási szintek (11. melléklet)" sub="A jóváhagyókat a Beállítások oldalon lehet személyhez rendelni." />
        <Table><TableHeader><TableRow><TableHead className="pl-4">Kód</TableHead><TableHead>Név</TableHead><TableHead>Jóváhagyási szintek</TableHead></TableRow></TableHeader>
          <TableBody>{Object.keys(CC).map((k) => <TableRow key={k}><TableCell className="pl-4 font-mono text-xs">{k}</TableCell><TableCell>{CC[k].n}</TableCell><TableCell className="whitespace-normal text-sm">{bandText(k, CC[k].b)}</TableCell></TableRow>)}</TableBody></Table>
      </Panel>
      <Panel i={4}><PanelHead title="Folyamatlépések és megőrzési idők" />
        <div className="grid gap-2 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
          {STAGES.map((s: string[], i: number) => <div key={s[0]} className="rounded-lg border p-2.5 text-sm"><span className="mr-2 font-mono text-xs text-muted-foreground">{s[0]}</span><span className="font-medium">{s[1]}</span><div className="mt-0.5 text-muted-foreground">{['Igénylő', 'Beszerzés + Igénylő + MI', 'Beszerzés + Igénylő', 'Beszerzés (vezeti) + Igénylő', 'Beszerzés + Jogi/Pénzügy + CEO/CFO'][i]}</div></div>)}
        </div>
        <div className="border-t px-4 py-3 text-sm text-muted-foreground">Megőrzés: szerződések és kapcsolódó dokumentáció a lejártot követő <b className="text-foreground">8 év</b> · PO és számla <b className="text-foreground">8 év</b> · tenderdokumentáció (nem nyertes ajánlatok is) <b className="text-foreground">5 év</b>.</div>
      </Panel>
    </>
  )
}

/* ================= Settings ================= */
const NONE = 'none'
function refOpts(): Opt[] {
  return [['', '– nincs kijelölve –'], [NONE, 'Nincs jóváhagyás'], ...ROLES.map(([r, l]: string[]) => ['role:' + r, `Szerepkör: ${l}`] as Opt), ...peopleOpts()]
}
export function Settings() {
  const admin = !!S.me?.admin
  const people = (S.people || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name, 'hu'))
  const pOpts = peopleOpts('– nincs kijelölve –')
  const change = (title: string, detail: string, fn: () => void) => { if (!admin) return; fn(); applyRoles(); log('', 'Beállítás', title, detail); commit() }
  const setRole = (r: string, l: string, email: string) => change('Szerepkör kijelölése', `${l}: ${email ? nm(email) : 'nincs kijelölve'}`, () => { S.roles = { ...S.roles }; if (email) S.roles[r] = email; else delete S.roles[r] })
  const setBand = (code: string, i: number, v: string) => change('Költséghely-jóváhagyó módosítva', `${code} ${i + 1}. sáv: ${v === NONE ? 'nincs jóváhagyás' : v ? nm(v) : 'nincs kijelölve'}`, () => {
    S.cc = JSON.parse(JSON.stringify(S.cc)); S.cc[code].b[i][1] = v === NONE ? null : v
  })
  const setPerson = (pe: any, patch: any, what: string) => change('Munkatárs módosítva', `${pe.name}: ${what}`, () => Object.assign(pe, patch))
  return (
    <>
      <PageHead title="Beállítások" sub={admin ? 'Szerepkörök, költséghely-jóváhagyók és munkatársak. Minden módosítás az auditnaplóba kerül.' : 'Csak adminisztrátor módosíthatja – a beállításokat itt megtekintheted.'}
        actions={admin && <Button onClick={() => openDlg({ type: 'person' })}><PlusMediumIcon />Munkatárs hozzáadása</Button>} />
      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Panel i={1} className="overflow-hidden"><PanelHead title="Szerepkörök" sub="A jóváhagyási lépések és teendők ezekhez a személyekhez kerülnek. Saját szerepkör költséghely-jóváhagyóként használható."
          right={admin && <Button size="sm" variant="outline" onClick={() => openDlg({ type: 'role' })}><PlusMediumIcon />Új szerepkör</Button>} />
          <div className="px-4 pb-3" data-tour="roles">
            {ROLES.map(([r, l]: string[]) => { const custom = !isBuiltinRole(r); return (
              <div key={r} className="flex items-center justify-between gap-3 border-t py-2 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">{l}{custom && <span className="rounded border px-1 text-[10px] font-normal text-muted-foreground">saját</span>}
                    {custom && admin && <button aria-label="Szerepkör szerkesztése" title="Szerkesztés / törlés" onClick={() => openDlg({ type: 'role', key: r })} className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"><EditIcon className="size-3.5" /></button>}</span>
                </div>
                <div className="w-56 shrink-0">{admin ? <Sel size="sm" value={S.roles[r] || ''} onChange={(v) => setRole(r, l, v)} options={pOpts} /> : <Person name={S.roles[r] || 'role:' + r} />}</div>
              </div>) })}
          </div>
        </Panel>
        <Panel i={2} className="overflow-hidden"><PanelHead title="Munkatársak" sub="Aki bejelentkezik a Fonte Viva fiókjával, automatikusan felkerül. Inaktív munkatárs nem léphet be." />
          {people.length === 0 ? <Empty>Még nincs munkatárs.</Empty> : (
            <Table><TableHeader><TableRow><TableHead className="pl-4">Név</TableHead><TableHead>Szerepkör</TableHead><TableHead>Admin</TableHead><TableHead className="pr-4">Aktív</TableHead></TableRow></TableHeader>
              <TableBody>{people.map((pe: any) => { const self = pe.email === S.user; const roles = ROLES.filter(([r]: string[]) => S.roles[r] === pe.email).map(([, l]: string[]) => l); return (
                <TableRow key={pe.email}>
                  <TableCell className="pl-4"><span className="block text-sm font-medium">{pe.name}{self && <span className="ml-1 text-xs font-normal text-muted-foreground">(te)</span>}</span><span className="text-xs text-muted-foreground">{pe.email}{pe.title ? ' · ' + pe.title : ''}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{roles.join(', ') || '–'}</TableCell>
                  <TableCell><Checkbox disabled={!admin || self} checked={!!pe.admin} onCheckedChange={(v: any) => setPerson(pe, { admin: !!v }, v ? 'adminisztrátor' : 'nem adminisztrátor')} /></TableCell>
                  <TableCell className="pr-4"><Checkbox disabled={!admin || self} checked={pe.active !== false} onCheckedChange={(v: any) => setPerson(pe, { active: !!v }, v ? 'aktív' : 'inaktív')} /></TableCell>
                </TableRow>) })}</TableBody></Table>)}
        </Panel>
      </div>
      <Panel i={3} className="overflow-hidden"><PanelHead title="Költséghely-jóváhagyók (11. melléklet)" sub="Sávonként: ki hagyja jóvá a költséghely terhére induló beszerzést. A szürke név a szabályzatban szereplő személy – rendeld hozzá a fiókját." />
        <Table><TableHeader><TableRow><TableHead className="pl-4">Költséghely</TableHead><TableHead>Értéksáv</TableHead><TableHead>Szabályzat szerint</TableHead><TableHead className="pr-4">Jóváhagyó</TableHead></TableRow></TableHeader>
          <TableBody>{Object.keys(CC).flatMap((code) => CC[code].b.map((b: any[], i: number) => { const lo = i ? CC[code].b[i - 1][0] : 0; const v = b[1] === null ? NONE : b[1] || ''; return (
            <TableRow key={code + i}>
              <TableCell className="pl-4">{i === 0 && <><span className="font-mono text-xs">{code}</span><div className="text-xs text-muted-foreground">{CC[code].n}</div></>}</TableCell>
              <TableCell className="text-sm tabular-nums">{b[0] == null ? '≥ ' + nf.format(lo) : '< ' + nf.format(b[0])} Ft</TableCell>
              <TableCell className="text-sm text-muted-foreground">{b[2] || '–'}</TableCell>
              <TableCell className="w-72 pr-4">{admin ? <Sel size="sm" value={v} onChange={(x) => setBand(code, i, x)} options={refOpts()} /> : <span className="text-sm">{b[1] === null ? 'Nincs jóváhagyás' : nm(resolveRef(b[1], code, i))}</span>}</TableCell>
            </TableRow>) }))}</TableBody></Table>
      </Panel>
    </>
  )
}
