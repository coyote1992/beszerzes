import { useState, type ReactNode } from 'react'
import { LockIcon } from 'blode-icons-react'
import {
  S, USERS, ORGS, CC, DOCS, TYPEDESC, ccApprover, typeOf, P, docLatest, ranking, validBids, ft, fDay, addD, addWD, dl, apprState, ATITLE,
} from '@/engine/engine.js'
import * as C from '@/engine/commands.js'
import { notify } from '@/engine/notify.js'
import { closeDlg, run, setUI, useUI } from '@/lib/store'
import { Chip, typeTone } from '@/lib/ui-helpers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sel, type Opt } from './Sel'

type V = Record<string, any>
type Field = { name: string; label?: string; kind?: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'check' | 'file' | 'radio' | 'readonly'; opts?: Opt[]; hint?: ReactNode; full?: boolean; show?: (v: V) => boolean; ph?: string; rows?: number; title?: string }
type Props = {
  kicker?: string; title: string; desc?: string; fields?: Field[]; initial?: V; ok?: string; danger?: boolean; wide?: boolean; noOk?: boolean; keepOpen?: boolean
  before?: ReactNode; after?: (v: V) => ReactNode; body?: (v: V, set: (n: string, val: any) => void) => ReactNode
  onSubmit?: (v: V) => string | void | false | undefined | object; onChange?: (name: string, val: any, v: V) => V | void
}

function FieldView({ f, v, set }: { f: Field; v: V; set: (n: string, x: any) => void }) {
  if (f.show && !f.show(v)) return null
  const val = v[f.name]
  let ctl: ReactNode
  switch (f.kind) {
    case 'textarea': ctl = <Textarea rows={f.rows || 3} value={val ?? ''} placeholder={f.ph} onChange={(e) => set(f.name, e.target.value)} />; break
    case 'select': ctl = <Sel value={val ?? ''} options={f.opts || []} onChange={(x) => set(f.name, x)} />; break
    case 'date': ctl = <Input type="date" value={val ?? ''} onChange={(e) => set(f.name, e.target.value)} />; break
    case 'file': ctl = <input type="file" className="block w-full rounded-2xl bg-muted/60 p-2.5 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground" onChange={(e) => set(f.name, e.target.files?.[0] || null)} />; break
    case 'readonly': ctl = <Input readOnly value={val ?? ''} className="opacity-70" />; break
    case 'check': return (
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted/60 p-3.5 text-sm"><Checkbox className="mt-0.5" checked={!!val} onCheckedChange={(x: any) => set(f.name, !!x)} /><span><b className="block">{f.title}</b><span className="text-muted-foreground">{f.hint}</span></span></label>)
    case 'radio': return (
      <div className="flex flex-col gap-2">{(f.opts || []).map(([k, l]) => { const [t, d] = l.split('|'); return (
        <button type="button" key={k} onClick={() => set(f.name, k)} className={cn('rounded-2xl p-3.5 text-left ring-1 transition-shadow', val === k ? 'bg-accent ring-2 ring-primary' : 'bg-muted/60 ring-transparent hover:ring-border')}><b className="block">{t}</b><span className="text-sm text-muted-foreground">{d}</span></button>) })}</div>)
    default: ctl = <Input inputMode={f.kind === 'number' ? 'decimal' : undefined} value={val ?? ''} placeholder={f.ph} onChange={(e) => set(f.name, e.target.value)} />
  }
  return <label className="flex flex-col gap-1.5 text-sm font-semibold">{f.label}{ctl}{f.hint && <span className="text-xs font-normal text-muted-foreground">{f.hint}</span>}</label>
}

function FormDialog(p: Props) {
  const [v, setV] = useState<V>(p.initial || {})
  const set = (n: string, x: any) => setV((prev) => { const nv = { ...prev, [n]: x }; const ex = p.onChange?.(n, x, nv); return ex ? { ...nv, ...ex } : nv })
  const submit = () => {
    if (!p.onSubmit) return closeDlg()
    const r = p.onSubmit(v)
    if (typeof r === 'string') return r === 'x' ? undefined : notify(r, 'bad')
    if (r === false) return
    if (p.keepOpen) return setV(p.initial || {})
    closeDlg()
  }
  return (
    <Dialog open onOpenChange={(o: boolean) => { if (!o) closeDlg() }}>
      <DialogContent className={cn('max-h-[92vh] gap-0 overflow-y-auto rounded-[28px] p-0', p.wide ? 'sm:max-w-4xl' : 'sm:max-w-xl')}>
        <DialogHeader className="px-7 pb-4 pt-7">
          {p.kicker && <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{p.kicker}</div>}
          <DialogTitle className="font-display text-3xl font-extrabold">{p.title}</DialogTitle>
          <DialogDescription className={p.desc ? '' : 'sr-only'}>{p.desc || p.title}</DialogDescription>
        </DialogHeader>
         <form className="flex flex-col gap-4 px-7 pb-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
          {p.before}
          {p.fields && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{p.fields.map((f) => <div key={f.name} className={cn((f.kind === 'textarea' || f.kind === 'check' || f.kind === 'radio' || f.full || p.fields!.length < 3) && 'sm:col-span-2')}><FieldView f={f} v={v} set={set} /></div>)}</div>}
          {p.body?.(v, set)}
          {p.after?.(v)}
          <button type="submit" className="hidden" />
        </form>
        <DialogFooter className="sticky bottom-0 flex-row justify-end gap-2 bg-card px-7 py-4">
          <Button variant="outline" onClick={closeDlg}>{p.noOk ? 'Bezárás' : 'Mégse'}</Button>
          {!p.noOk && <Button variant={p.danger ? 'destructive' : 'default'} onClick={submit}>{p.ok || 'Mentés'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
const Note = ({ tone = 'inf', children }: { tone?: 'inf' | 'warn' | 'ok' | 'bad'; children: ReactNode }) => <div className={cn('rounded-2xl p-3.5 text-sm', { inf: 'bg-s4-soft text-s4-ink', warn: 'bg-s2-soft text-s2-ink', ok: 'bg-s3-soft text-s3-ink', bad: 'bg-s1-soft text-s1-ink' }[tone])}>{children}</div>
const num = C.num

/* ---------------- individual dialogs ---------------- */
function NewProc() {
  const [cls, setCls] = useState<V>({ value: '', cc: '1255BS2300', proc: 'Tender' })
  const ccOpts: Opt[] = Object.keys(CC).map((k) => [k, `${k} · ${CC[k].n}`])
  return (
    <FormDialog kicker="PROC1 · Új igény" title="Új beszerzés indítása" ok="Beszerzés létrehozása"
      initial={{ subject: '', org: 'Somogyvár – karbantartás', cc: '1255BS2300', value: '', cat: 'OPEX', proc: 'Tender', desired: addD(S.today, 60), requester: S.user, reason: '', ifs: false, maint: false, prepay: false, it: false }}
      fields={[
        { name: 'subject', full: true, label: 'Beszerzés tárgya', ph: 'Például: új címkenyomtató beszerzése' },
        { name: 'org', label: 'Igénylő szervezet', kind: 'select', opts: ORGS.map((o: string[]) => [o[0], o[0]] as Opt) },
        { name: 'cc', label: 'Költséghely', kind: 'select', opts: ccOpts },
        { name: 'value', label: 'Becsült nettó érték (Ft)', kind: 'number', ph: '0' },
        { name: 'cat', label: 'Beszerzési kategória', kind: 'select', opts: ['Direkt', 'Indirekt', 'CAPEX', 'OPEX'].map((x) => [x, x] as Opt) },
        { name: 'proc', label: 'Eljárás', kind: 'select', opts: [['Tender', 'Tender'], ['SS', 'Sole Source'], ['Vészhelyzeti', 'Vészhelyzeti']] },
        { name: 'desired', label: 'Kívánt teljesítés', kind: 'date' },
        { name: 'requester', label: 'Igénylő személy', kind: 'select', opts: USERS.map((u: any) => [u.n, u.n] as Opt) },
        { name: 'reason', label: 'Vészhelyzeti indoklás (kötelező)', kind: 'textarea', rows: 2, ph: 'Üzemzavar, minőségi kockázat, hatósági előírás…', show: (v) => v.proc === 'Vészhelyzeti' },
        { name: 'ifs', kind: 'check', title: 'IFS-kritikus beszerzés', hint: 'Minőségirányítási előminősítés és dokumentumkontroll szükséges.' },
        { name: 'maint', kind: 'check', title: 'Fenntartó beruházás', hint: 'A TCO/DCF kalkuláció alól mentes.', show: (v) => v.cat === 'CAPEX' },
        { name: 'prepay', kind: 'check', title: 'Előlegfizetéssel járó szerződés', hint: 'Bankgarancia vagy CFO eltérés-engedély szükséges.' },
        { name: 'it', kind: 'check', title: 'IT / adatkezelést érintő', hint: 'Kiberbiztonsági záradék szükséges.' },
      ]}
      onChange={(n, x, v) => { setCls(v); if (n === 'org') { const o = ORGS.find((y: string[]) => y[0] === x); return o ? { cc: o[1] } : undefined } }}
      after={(v) => { const val = num(v.value) || 0, t = typeOf(val), ap = ccApprover(v.cc, val); return (
        <div className="flex items-start gap-3 rounded-2xl bg-s5-soft p-4 text-sm text-s5-ink"><Chip tone={typeTone(t)}>{t}</Chip><div><b>Az érték megadása után automatikus besorolás</b><br /><span className="opacity-90">{TYPEDESC[t]}. Tenderkiírás: CEO + CFO. Költséghely-jóváhagyó: {ap || 'nem szükséges'}.{v.proc === 'Vészhelyzeti' && ` Vészhelyzeti: ${val >= 2e6 ? 'CEO' : 'költséghely-felelős'} jóváhagyás, dokumentáció 5 munkanapon belül.`}</span></div></div>) }}
      onSubmit={(v) => { const r: any = run(() => C.createProc(v)); if (typeof r === 'string') return r; setUI({ open: r.id, tab: 'ov', view: 'procs' }); void cls }} />
  )
}
function Upload({ pid, k, folder }: { pid: string; k?: string; folder?: number }) {
  const p = P(pid)
  const keys = folder ? Object.keys(DOCS).filter((x) => DOCS[x][1] === folder && x !== 'bid' && x !== 'invit') : []
  return <FormDialog kicker={'Dokumentumtár · ' + pid} title={k ? dl(k) : 'Dokumentum feltöltése'} ok="Feltöltés" initial={{ key: k || keys[0], file: null, note: '' }}
    fields={[...(folder ? [{ name: 'key', label: 'Dokumentumtípus', kind: 'select' as const, opts: keys.map((x) => [x, dl(x)] as Opt) }] : []), { name: 'file', label: 'Fájl', kind: 'file', hint: 'Demó: csak a fájlnév és méret kerül rögzítésre. Fájl nélkül mintadokumentum jön létre.' }, { name: 'note', full: true, label: 'Megjegyzés / verzióleírás' }]}
    onSubmit={(v) => { void p; return run(() => C.uploadDoc(pid, { key: v.key, file: v.file, note: v.note })) as any }} />
}
function Flag({ pid, k }: { pid: string; k: string }) {
  return <FormDialog kicker={'Igazolás · ' + pid} title="Igazolás rögzítése" ok="Igazolom" initial={{ note: '' }} fields={[{ name: 'note', label: 'Megjegyzés (opcionális)', hint: 'Az igazolás felhasználóhoz és időbélyeghez kötve az auditnaplóba kerül.' }]} onSubmit={(v) => run(() => C.setFlag(pid, k, v.note)) as any} />
}
function Decide({ pid, k, dec }: { pid: string; k: string; dec: string }) {
  const p = P(pid), a = apprState(p, k), ap = dec === 'approve'
  return <FormDialog kicker={ATITLE[k]} title={ap ? 'Jóváhagyás megerősítése' : 'Elutasítás'} ok={ap ? 'Jóváhagyom' : 'Elutasítom'} danger={!ap} initial={{ c: '' }}
    before={<Note>A döntés a <b>{a.doc ? dl(a.bound) + ' v' + a.ver : 'beszerzés'}</b> dokumentumverzióhoz és a jelenlegi időbélyeghez kötődik ({S.user}). Új verzió feltöltése érvényteleníti.</Note>}
    fields={[{ name: 'c', kind: 'textarea', label: ap ? 'Megjegyzés (opcionális)' : 'Indoklás (kötelező)' }]}
    onSubmit={(v) => run(() => C.decideApproval(pid, k, ap ? 'approve' : 'reject', v.c)) as any} desc={`${p.subject} · ${ft(p.value)}`} />
}
function Task({ pid }: { pid?: string }) {
  return <FormDialog kicker="Feladatkezelés" title="Új feladat" ok="Feladat létrehozása" initial={{ title: '', desc: '', owner: S.user, due: addWD(S.today, 3), pid: pid || '' }}
    fields={[{ name: 'title', full: true, label: 'Feladat megnevezése' }, { name: 'desc', label: 'Leírás – mi a feladat?', kind: 'textarea' }, { name: 'owner', label: 'Felelős', kind: 'select', opts: USERS.map((u: any) => [u.n, `${u.n} – ${u.role}`] as Opt) }, { name: 'due', label: 'Határidő', kind: 'date' }, { name: 'pid', full: true, label: 'Kapcsolódó beszerzés', kind: 'select', opts: [['', '– nincs –'], ...S.procs.map((x: any) => [x.id, `${x.id} · ${x.subject}`] as Opt)] }]}
    onSubmit={(v) => run(() => C.addTask(v)) as any} />
}
function Bidders({ pid }: { pid: string }) {
  const p = P(pid)
  return <FormDialog kicker="PROC2 · Ajánlattevői lista" title={p.proc === 'SS' ? 'Javasolt beszállító' : `Ajánlattevők (${p.bidders.length}/3)`} ok="Felvétel" keepOpen initial={{ name: '', email: '', type: 'Céges', isNew: false }}
    before={<div className="overflow-hidden rounded-2xl bg-muted/60">{p.bidders.length ? p.bidders.map((b: any) => <div key={b.id} className="flex items-center gap-2 border-t border-border px-4 py-2.5 first:border-t-0"><div className="flex-1"><b>{b.name}</b> {b.isNew && <Chip tone="warn">új</Chip>} {b.type === 'Webshop' && <Chip>webáruház</Chip>}<div className="text-xs text-muted-foreground">{b.email}</div></div><Button size="sm" variant="ghost" onClick={() => { run(() => C.removeBidder(pid, b.id)) }}>Eltávolítás</Button></div>) : <div className="p-4 text-sm text-muted-foreground">Még nincs ajánlattevő.</div>}</div>}
    fields={[{ name: 'name', label: 'Cégnév' }, { name: 'email', label: 'E-mail' }, { name: 'type', label: 'Típus', kind: 'select', opts: [['Céges', 'Céges'], ['Webshop', 'Webshop']], hint: 'Webáruházi árajánlat csak egyedi kategóriában (max. 2 a 3-ból).' }, { name: 'isNew', kind: 'check', title: 'Új beszállító', hint: 'Beszállítói adatlap és előminősítés szükséges.' }]}
    onSubmit={(v) => run(() => C.addBidder(pid, v)) as any} />
}
function BidRecv({ pid, bid }: { pid: string; bid: string }) {
  const p = P(pid), b = p.bidders.find((x: any) => x.id === bid), vh = p.proc === 'Vészhelyzeti', late = p.bidDeadline && S.today > p.bidDeadline
  return <FormDialog kicker="PROC3 · Ajánlat beérkezése" title={b.name} ok="Rögzítés" initial={{ file: null, sender: b.email, price: p.value, note: '' }}
    before={late ? <Note tone="bad">A határidő ({fDay(p.bidDeadline)}) lejárt – az ajánlat késve érkezettként, formailag érvénytelenként rögzül.</Note> : undefined}
    fields={[{ name: 'file', label: 'Ajánlat fájlja', kind: 'file', hint: 'Az ajánlat tartalma a bontásig zárolt, csak a beérkezés ténye látszik.' }, { name: 'sender', label: 'Feladó' }, { name: 'price', label: 'Ajánlati ár (nettó Ft)', kind: 'number', show: () => vh }, { name: 'note', label: 'Megjegyzés' }]}
    onSubmit={(v) => run(() => C.recvBid(pid, bid, v)) as any} />
}
function BidDecl({ pid, bid }: { pid: string; bid: string }) {
  const b = P(pid).bidders.find((x: any) => x.id === bid)
  return <FormDialog kicker="PROC3 · Lemondó nyilatkozat" title={b.name} ok="Rögzítés" initial={{ file: null, note: '' }} fields={[{ name: 'file', label: 'Nyilatkozat fájlja', kind: 'file' }, { name: 'note', label: 'Indoklás', ph: 'pl. kapacitáshiány' }]} onSubmit={(v) => run(() => C.declineBid(pid, bid, v)) as any} />
}
function Send({ pid }: { pid: string }) {
  const p = P(pid)
  const pkg = ['rfq', 'qty', 'pricing', 'matrixTpl', 'bsd', 'contractDraft', 'nda', 'ifsReq', 'msds', 'supplierForm', 'cyber'].map((k) => docLatest(p, k)).filter(Boolean)
  return <FormDialog kicker="PROC3 · Tender kiküldése" title="Ajánlatkérés kiküldése" ok="Kiküldés az arajanlat@ címről"
    initial={{ from: 'arajanlat@fonteviva.hu', subj: `Ajánlatkérés – ${p.subject} (${p.id})`, body: `Tisztelt Partnerünk!\n\nMellékelten megküldjük ajánlatkérésünket a(z) „${p.subject}" tárgyában. Kérjük, ajánlatát az alábbi határidőig küldje meg erre a címre.\n\nÜdvözlettel,\nFonte Viva Kft. – Beszerzés`, dl: addWD(S.today, 10), ok: false }}
    before={<div><div className="mb-1.5 text-sm font-semibold">Címzettek (azonos információ, azonos határidő)</div><div className="flex flex-wrap gap-1.5">{p.bidders.map((b: any) => <Chip key={b.id} tone="inf">{b.name}</Chip>)}</div></div>}
    fields={[{ name: 'from', label: 'Feladó', kind: 'readonly' }, { name: 'subj', full: true, label: 'Tárgy' }, { name: 'body', label: 'Levél szövege', kind: 'textarea', rows: 5 }, { name: 'dl', label: 'Ajánlattételi határidő', kind: 'date' }, { name: 'ok', kind: 'check', title: 'Megerősítem', hint: 'A CEO + CFO által jóváhagyott tendercsomag kerül kiküldésre.' }]}
    after={() => <div><div className="mb-1.5 text-sm font-semibold">Csatolt dokumentumok (jóváhagyott verziók)</div><div className="flex flex-wrap gap-1.5">{pkg.map((d: any) => <Chip key={d.id}>{d.name} v{d.ver}</Chip>)}</div></div>}
    onSubmit={(v) => run(() => C.sendTender(pid, v)) as any} />
}
function OpenBids({ pid }: { pid: string }) {
  const p = P(pid), rec = p.bidders.filter((b: any) => b.status === 'beérkezett')
  const initial: V = {}
  rec.forEach((b: any) => { initial['f_' + b.id] = !b.late; initial['p_' + b.id] = b.price || ''; initial['d_' + b.id] = b.pay || ''; initial['l_' + b.id] = b.lead || ''; initial['w_' + b.id] = b.warr || '' })
  return <FormDialog wide kicker="PROC3 · Ajánlatbontás" title="Ajánlatbontás és bontási jegyzőkönyv" ok="Bontás lezárása, jegyzőkönyv" initial={initial}
    before={<Note tone="warn"><LockIcon className="mr-1.5 inline size-4" />A bontás a határidő után, az adminisztrátor jelenlétében történik. A rögzített árak a kiértékelés lezárásáig bizalmasak.</Note>}
    body={(v, set) => rec.length ? (
      <div className="overflow-x-auto rounded-2xl bg-muted/50"><table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">{['Ajánlattevő', 'Formai', 'Ár (nettó Ft)', 'Fizetés (nap)', 'Szállítás (hét)', 'Jótállás (hó)'].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr></thead>
        <tbody>{rec.map((b: any) => <tr key={b.id} className="border-t border-border"><td className="px-3 py-2"><b>{b.name}</b><div className="text-xs text-muted-foreground">{b.recv}{b.late && ' · KÉSVE'}</div></td>
          <td className="px-3"><Checkbox disabled={b.late} checked={!!v['f_' + b.id]} onCheckedChange={(x: any) => set('f_' + b.id, !!x)} /></td>
          {(['p', 'd', 'l', 'w'] as const).map((k) => <td key={k} className="px-2"><Input className="min-w-20" value={v[k + '_' + b.id]} onChange={(e) => set(k + '_' + b.id, e.target.value)} /></td>)}</tr>)}</tbody></table></div>) : <div className="text-sm text-muted-foreground">Nem érkezett ajánlat.</div>}
    onSubmit={(v) => run(() => C.openBids(pid, v)) as any} />
}
function EvalBid({ pid, bid }: { pid: string; bid: string }) {
  const b = P(pid).bidders.find((x: any) => x.id === bid)
  return <FormDialog kicker="PROC3 · Értékelés" title={b.name} ok="Értékelés mentése" initial={{ formal: !!b.formal, tech: b.tech ?? '', price: b.price ?? '', pay: b.pay ?? '', lead: b.lead ?? '', warr: b.warr ?? '', note: b.note || '' }}
    fields={[{ name: 'formal', kind: 'check', title: 'Formailag megfelelő', hint: '' }, { name: 'tech', label: 'Műszaki pontszám (0–100)', kind: 'number', hint: '60 pont alatt műszakilag nem megfelelő – kizárható.' }, { name: 'price', label: 'Ár (nettó Ft)', kind: 'number' }, { name: 'pay', label: 'Fizetési határidő (nap)', kind: 'number' }, { name: 'lead', label: 'Szállítási idő (hét)', kind: 'number' }, { name: 'warr', label: 'Jótállás (hónap)', kind: 'number' }, { name: 'note', label: 'Értékelési indoklás' }]}
    onSubmit={(v) => run(() => C.evalBid(pid, bid, v)) as any} />
}
function Tco({ pid }: { pid: string }) {
  const p = P(pid), d = p.tcoData || { c0: p.value, k: Math.round(p.value * 0.05), n: 10, r: 0.09, res: Math.round(p.value * 0.1) }
  return <FormDialog kicker="CAPEX · 7. melléklet" title="TCO / DCF számoló" ok="Mentés a dokumentumtárba" initial={{ c0: d.c0, k: d.k, n: d.n, r: (d.r * 100).toFixed(1), res: d.res }}
    fields={[{ name: 'c0', label: 'Kezdő költség C₀ (Ft)', kind: 'number' }, { name: 'k', label: 'Éves üzemeltetési + karbantartási költség K (Ft)', kind: 'number' }, { name: 'n', label: 'Élettartam n (év)', kind: 'number' }, { name: 'r', label: 'WACC r (%)', kind: 'number' }, { name: 'res', label: 'Maradványérték (Ft)', kind: 'number' }]}
    after={(v) => <Note tone="ok"><b>Diszkontált TCO</b> = C₀ + Σ Kᵢ/(1+r)ⁱ − maradványérték/(1+r)ⁿ<div className="font-display mt-1 text-2xl font-extrabold">{ft(C.tcoCalc({ c0: num(v.c0), k: num(v.k), n: Math.max(1, Math.round(num(v.n))), r: num(v.r) / 100, res: num(v.res) }))}</div></Note>}
    onSubmit={(v) => run(() => C.saveTco(pid, v)) as any} />
}
function Nego({ pid }: { pid: string }) {
  const p = P(pid), rk = ranking(p), cand = rk.length ? rk.map((r: any) => r.b) : validBids(p).length ? validBids(p) : p.bidders.filter((b: any) => b.status === 'beérkezett' || p.proc === 'SS')
  if (!cand.length) return <FormDialog title="Nincs kiválasztható beszállító" noOk />
  const first = cand[0]
  return <FormDialog kicker="PROC4 · Tárgyalás" title="Tárgyalási kör lezárása" ok="Rögzítés" initial={{ winner: first.id, initial: first.price || p.value, final: first.price || p.value, rebate: '0', note: '' }}
    fields={[{ name: 'winner', label: 'Nyertes beszállító', kind: 'select', opts: cand.map((b: any, i: number) => [b.id, `${i + 1}. ${b.name}${b.isNew ? ' (új)' : ''}`] as Opt), hint: 'Az ártárgyalás eredményét az ajánlattevő módosított, írásos ajánlatban megerősíti.' }, { name: 'initial', label: 'Kezdő ár (Ft)', kind: 'number' }, { name: 'final', label: 'Végső ár (Ft)', kind: 'number' }, { name: 'rebate', label: 'Rabatt / skontó (Ft, opcionális)', kind: 'number' }, { name: 'note', label: 'Tárgyalási jegyzet' }]}
    onChange={(n, x) => { if (n === 'winner') { const b = cand.find((y: any) => y.id === x); return { initial: b.price || '', final: b.price || '' } } }}
    onSubmit={(v) => run(() => C.saveNego(pid, v, cand)) as any} />
}
function Prequal({ pid }: { pid: string }) {
  const p = P(pid), sel: number[] = p.f.prequalItems || []
  const initial: V = {}; C.PREQ.forEach((_: string, i: number) => (initial['c' + i] = sel.includes(i)))
  return <FormDialog kicker="PROC4 · 10.1" title={'Előminősítés – ' + (p.nego ? p.nego.winnerName : '')} ok="Mentés" initial={initial}
    body={(v, set) => <div className="flex flex-col gap-1.5">{C.PREQ.map((x: string, i: number) => <label key={i} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-muted/60 px-3.5 py-2.5 text-sm"><Checkbox checked={!!v['c' + i]} onCheckedChange={(y: any) => set('c' + i, !!y)} />{x}</label>)}</div>}
    onSubmit={(v) => run(() => C.savePrequal(pid, C.PREQ.map((_: string, i: number) => i).filter((i: number) => v['c' + i]))) as any} />
}
function Ctype({ pid }: { pid: string }) {
  return <FormDialog kicker="PROC5" title="Szerződéstípus" initial={{ t: 'PO' }} fields={[{ name: 't', label: 'Típus', kind: 'select', opts: ['PO', 'ICO – egyedi szerződés', 'FCO – keretszerződés (max. 3 év)', 'Előrevásárlás – alapanyag-előrevásárlási szerződés', 'Csatlakozási szerződés'].map((x) => [x, x] as Opt) }]} onSubmit={(v) => run(() => C.setCtype(pid, v.t)) as any} />
}
function Input_({ pid, k }: { pid: string; k: string }) {
  const L: Record<string, [string, string, string]> = { po: ['PO kibocsátása', 'PO-szám (BC)', '4500019'], bc: ['Szerződés rögzítése BC-ben', 'BC szerződésszám', 'FCO-2026-'] }
  return <FormDialog kicker="PROC6" title={L[k][0]} initial={{ n: L[k][2] + Math.floor(Math.random() * 900 + 100) }} fields={[{ name: 'n', label: L[k][1] }]} onSubmit={(v) => run(() => C.setInput(pid, k, v.n)) as any} />
}
function Resolve({ pid }: { pid: string }) {
  return <FormDialog kicker="PROC3 · 9.3.6" title={`Érvényes ajánlatok száma: ${validBids(P(pid)).length}`} ok="Döntés rögzítése" initial={{ r: 'ss', n: '' }}
    fields={[{ name: 'r', kind: 'radio', opts: [['ss', 'Folytatás Sole Source-ként (SS-átsorolás)|SS indoklás és jóváhagyás szükséges a kiválasztás előtt.'], ['re', 'Újratendereztetés módosított feltételekkel|Új CEO + CFO jóváhagyás szükséges; a korábbi ajánlatok megőrződnek.']] }, { name: 'n', label: 'Indoklás (ÉB / SCM vezető döntése)' }]}
    onSubmit={(v) => run(() => C.resolveSingle(pid, v.r, v.n)) as any} />
}
function Fail({ pid }: { pid: string }) {
  return <FormDialog kicker="SCM vezető döntése" title="Eljárás sikertelenné nyilvánítása" ok="Sikertelen" danger initial={{ r: '' }} fields={[{ name: 'r', kind: 'textarea', label: 'Indoklás (kötelező)', ph: 'Az ajánlatok jelentősen meghaladják a költségkeretet / egyik sem felel meg műszakilag…', hint: 'Új tender indítható módosított specifikációval vagy szélesebb ajánlattevői körrel.' }]} onSubmit={(v) => run(() => C.failProc(pid, v.r)) as any} />
}
function Close({ pid }: { pid: string }) {
  return <FormDialog kicker="PROC6" title="Beszerzés lezárása" ok="Lezárás" before={<Note tone="ok"><LockIcon className="mr-1.5 inline size-4" />Lezáráskor a tendercsomag zárolt állapotba kerül, és rákerül a szabályzat szerinti megőrzési idő (szerződés lejárta + 8 év; PO/számla 8 év; tenderdokumentáció 5 év). Éles környezetben ehhez Microsoft Purview record label alkalmazható.</Note>} onSubmit={() => run(() => C.closeProc(pid)) as any} />
}
function ViewDoc({ pid, id }: { pid: string; id: string }) {
  const d = P(pid).docs.find((x: any) => x.id === id)
  return <FormDialog wide kicker="Dokumentum" title={`${d.name} · v${d.ver}`} noOk body={() => <div className="prose-doc rounded-2xl bg-muted/50 p-5 text-sm" dangerouslySetInnerHTML={{ __html: d.content }} />} />
}
function About() {
  return <FormDialog kicker="A demóról" title="Fonte Viva Beszerzési Központ" noOk body={() => (
    <div className="space-y-3 text-sm leading-relaxed">
      <p>Ez a prototípus a <b>Beszerzési szabályzat 01. verzió</b> szerint működik: az értékhatárok, jóváhagyók, kötelező dokumentumok és határidők szabályai be vannak építve.</p>
      <ul className="list-disc space-y-1.5 pl-5"><li>Az állapotot nem lehet közvetlenül átírni – csak gombokkal (kiküldés, bontás, jóváhagyás, továbblépés), így minden változás mögött auditesemény van.</li><li>A jóváhagyás a dokumentum adott verziójához kötött; új verzió érvényteleníti.</li><li>Az auditnapló hash-lánccal kapcsolt, csak hozzáfűzhető.</li><li>Váltson felhasználót a jobb felső menüben a négy szem elv kipróbálásához; a „+1 munkanap" gombbal előreléptetheti a demó idejét.</li></ul>
      <p><b>Éles megvalósítás:</b> Power Apps + SharePoint-listák/dokumentumtár + Power Automate; azonosítás Entra ID-val; tartós megőrzéshez Microsoft Purview. A demó adatai csak ebben a böngészőben tárolódnak.</p>
    </div>)} />
}

export function Dialogs() {
  const u = useUI(), d = u.dialog
  if (!d) return null
  const k = String(d._id)
  const pid = d.pid || '', key = d.key || '', bid = d.bid || ''
  switch (d.type) {
    case 'new': return <NewProc key={k} />
    case 'upload': return <Upload key={k} pid={pid} k={key || undefined} folder={d.folder} />
    case 'flag': return <Flag key={k} pid={pid} k={key} />
    case 'decide': return <Decide key={k} pid={pid} k={key} dec={d.dec || 'approve'} />
    case 'task': return <Task key={k} pid={pid} />
    case 'bidders': return <Bidders key={k} pid={pid} />
    case 'bidrecv': return <BidRecv key={k} pid={pid} bid={bid} />
    case 'biddecl': return <BidDecl key={k} pid={pid} bid={bid} />
    case 'send': return <Send key={k} pid={pid} />
    case 'openbids': return <OpenBids key={k} pid={pid} />
    case 'bideval': return <EvalBid key={k} pid={pid} bid={bid} />
    case 'tco': return <Tco key={k} pid={pid} />
    case 'nego': return <Nego key={k} pid={pid} />
    case 'prequal': return <Prequal key={k} pid={pid} />
    case 'ctype': return <Ctype key={k} pid={pid} />
    case 'input': return <Input_ key={k} pid={pid} k={key} />
    case 'resolve': return <Resolve key={k} pid={pid} />
    case 'fail': return <Fail key={k} pid={pid} />
    case 'close': return <Close key={k} pid={pid} />
    case 'viewdoc': return <ViewDoc key={k} pid={pid} id={key} />
    case 'about': return <About key={k} />
  }
  return null
}
