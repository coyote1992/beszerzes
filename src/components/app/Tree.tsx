import { useState, type ReactNode } from 'react'
import { ArrowRightIcon, CheckIcon, ClockIcon, DiamondIcon, FileTextIcon, ShieldCheckIcon, SparklesIcon } from 'blode-icons-react'
import { S, CC, ROLE_LABEL, STAGES, ccApprover, nf, nm, typeOf } from '@/engine/engine.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHead, Panel, PanelHead } from './Page'
import { Sel, type Opt } from './Sel'

/* ---------- variables ---------- */
type Proc = 'Tender' | 'SS' | 'VH'
type V = { proc: Proc; value: number; cat: string; maint: boolean; ifs: boolean; it: boolean; prepay: boolean; newSup: boolean; ctype: string; cc: string }
const tierOf = (v: V) => typeOf(v.value) as 'Egyedi' | 'Egyszerű' | 'Kiemelt'
type Cond = { l: string; t: (v: V) => boolean; out?: boolean }
const C: Record<string, Cond> = {
  K: { l: 'Kiemelt', t: (v) => tierOf(v) === 'Kiemelt' },
  E: { l: 'Egyedi', t: (v) => tierOf(v) === 'Egyedi' },
  NE: { l: 'Egyszerű / Kiemelt', t: (v) => tierOf(v) !== 'Egyedi' },
  NK: { l: 'Egyedi / Egyszerű', t: (v) => tierOf(v) !== 'Kiemelt' },
  IFS: { l: 'IFS-kritikus', t: (v) => v.ifs },
  IFSD: { l: 'IFS-kritikus direkt', t: (v) => v.ifs && v.cat === 'Direkt' },
  IT: { l: 'IT, ≥ 2 M Ft', t: (v) => v.it && tierOf(v) !== 'Egyedi' },
  NEW: { l: 'új beszállító', t: (v) => v.newSup },
  TCO: { l: 'CAPEX, nem fenntartó', t: (v) => v.cat === 'CAPEX' && !v.maint },
  PRE: { l: 'előleg', t: (v) => v.prepay },
  LOW: { l: '< 2 M Ft', t: (v) => v.value < 2e6 },
  HIGH: { l: '≥ 2 M Ft', t: (v) => v.value >= 2e6 },
  // outcomes: not known up front, always shown with their condition
  CUT: { l: 'ha a tárgyalás csökkentette az árat', t: () => true, out: true },
  RECL: { l: 'ha 1 érvényes ajánlat miatt SS-re sorolták át', t: () => true, out: true },
  RECLT: { l: 'SS-átsorolás után, CAPEX (nem fenntartó)', t: (v) => v.cat === 'CAPEX' && !v.maint, out: true },
  NEWW: { l: 'ha a nyertes új beszállító', t: () => true, out: true },
}

/* ---------- the tree (mirrors the rules in src/engine/engine.js) ---------- */
type Who = string // REQ, OWN, CC, CCS (cc or SCM), AUTO or a role key
type WhoVar = { when?: Cond; who: Who[] }
type Item =
  | { k: 'step' | 'doc' | 'flag' | 'auto'; t: string; who: Who[]; when?: Cond; ev?: string; note?: string }
  | { k: 'gate'; t: string; who: WhoVar[]; when?: Cond; ev?: string; note?: string }
  | { k: 'decision'; t: string; who: Who[]; when?: Cond; br: [string, string][]; ev?: string }
  | { k: 'docs'; t: string; docs: [string, Who, Cond?][]; ev?: string }
type Stage = { n: number; items: Item[] }
type Path = { id: Proc; title: string; sub: string; skip: number[]; stages: Stage[] }

const APPROVED = 'jóváhagyva / elutasítva'
const proc1: Stage = { n: 1, items: [
  { k: 'doc', t: 'Műszaki / minőségi specifikáció, mennyiség, ütemezés', who: ['REQ'], ev: 'Dokumentum feltöltve' },
  { k: 'auto', t: 'Kötelező igénytartalom ellenőrzése (tárgy, érték, határidő, IFS-besorolás)', who: ['AUTO'] },
  { k: 'gate', t: 'Igény jóváhagyása', who: [{ when: C.NK, who: ['CC'] }, { when: C.K, who: ['CC', 'SCM'] }], note: 'csak ha a költséghely-sáv előír jóváhagyót', ev: APPROVED },
] }
const proc4 = (ss: boolean): Stage => ({ n: 4, items: [
  { k: 'step', t: 'Tárgyalási kör, nyertes kiválasztása (ár, fizetés, Incoterms, kötbér, jótállás, IFS-auditjog)', who: ['OWN'], ev: 'Tárgyalási kör lezárva' },
  { k: 'doc', t: 'Módosított, írásos ajánlat', who: ['OWN'], when: C.CUT },
  { k: 'flag', t: 'Új beszállító előminősítése (MI ≤ 5 munkanap, Pénzügy, MDM)', who: ['MI'], when: C.NEWW, ev: 'Előminősítés lezárva' },
  { k: 'doc', t: 'IFS-megfelelőségi tanúsítványok', who: ['MI'], when: C.IFS },
  ...(ss ? [{ k: 'doc', t: 'TCO / DCF kalkuláció', who: ['OWN'], when: C.TCO } as Item] : [
    { k: 'doc', t: 'SS indoklás űrlap (5. melléklet)', who: ['OWN'], when: C.RECL } as Item,
    { k: 'gate', t: 'Sole Source indoklás jóváhagyása', who: [{ when: C.NK, who: ['CCS'] }, { when: C.K, who: ['CEO', 'CFO'] }], when: C.RECL, ev: APPROVED } as Item,
    { k: 'doc', t: 'TCO / DCF kalkuláció', who: ['OWN'], when: C.RECLT } as Item,
  ]),
  { k: 'doc', t: 'Supplier Selection Document (SSD) – generálható', who: ['OWN'], ev: 'SSD feltöltve', note: '2 érvényes ajánlatnál a tény bekerül' },
  { k: 'gate', t: 'SSD jóváhagyása – az igénylő nem szavazhat', who: [{ when: C.NK, who: ['CCS'] }, { when: C.K, who: ['CEO', 'CFO'] }], ev: APPROVED },
] })
const proc5: Stage = { n: 5, items: [
  { k: 'step', t: 'Szerződéstípus: PO · ICO · FCO (max. 3 év) · előrevásárlás · csatlakozási', who: ['OWN'], ev: 'Szerződéstípus kiválasztva' },
  { k: 'doc', t: 'Szerződés / PO-dokumentum végleges tervezete', who: ['OWN'] },
  { k: 'doc', t: 'Jogi vélemény a tervezetről (5 munkanapon belül)', who: ['OWN'], when: C.K },
  { k: 'doc', t: 'Pénzügyi vélemény a tervezetről (5 munkanapon belül)', who: ['OWN'], when: C.K },
  { k: 'decision', t: 'Előleg biztosítéka?', who: ['OWN', 'CFO'], when: C.PRE, br: [['Bankgarancia csatolva', 'felelős beszerző'], ['Eltérés a bankgaranciától', 'csak CFO írásos engedélyével']] },
  { k: 'gate', t: 'Cégszerű aláírás', who: [{ who: ['CEO', 'CFO'] }], note: 'kiemeltnél csak a jogi és pénzügyi vélemény után', ev: APPROVED },
  { k: 'doc', t: 'Aláírt példány (Netlock vagy papír + szkennelt)', who: ['OWN'] },
  { k: 'step', t: 'Lezárás – a dokumentumtár zárolva, megőrzés indul', who: ['OWN'], ev: 'Beszerzés lezárva' },
] }
const PATHS: Path[] = [
  { id: 'Tender', title: 'Tender', sub: 'Alapeset: min. 3 írásos ajánlat (egyedinél max. 2 webáruházi)', skip: [], stages: [
    proc1,
    { n: 2, items: [
      { k: 'flag', t: 'Beszerzési stratégia: keretszerződés, készlet, alternatívák', who: ['OWN'] },
      { k: 'flag', t: 'IFS kockázatértékelés', who: ['MI'], when: C.IFS },
      { k: 'step', t: 'Ajánlattevői lista: min. 3 meghívott', who: ['OWN'], ev: 'Ajánlattevő felvéve', note: 'egyedinél max. 2 webáruházi, felette egy sem' },
      { k: 'docs', t: 'Tendercsomag', docs: [['RFQ / ajánlatkérő levél', 'OWN'], ['Mennyiség és ütemterv', 'OWN'], ['Árazási struktúra', 'OWN', C.NE], ['Kiértékelési mátrix sablon', 'OWN', C.NE], ['BSD (tenderindító dokumentum)', 'OWN', C.K], ['Szerződéstervezet', 'OWN', C.K], ['Titoktartási nyilatkozat', 'OWN', C.K], ['Kiberbiztonsági záradék', 'OWN', C.IT], ['IFS / minőségi követelmények', 'MI', C.IFS], ['MSDS és DoC', 'MI', C.IFSD], ['Beszállítói adatlap', 'OWN', C.NEW]] },
      { k: 'gate', t: 'Tenderkiírás jóváhagyása – minden értéken', who: [{ who: ['CEO', 'CFO'] }], note: 'az RFQ-hoz (kiemeltnél a BSD-hez) kötve', ev: APPROVED },
    ] },
    { n: 3, items: [
      { k: 'step', t: 'Ajánlatkérés kiküldése az arajanlat@fonteviva.hu címről, azonos határidővel', who: ['OWN'], ev: 'Ajánlatkérés kiküldve' },
      { k: 'step', t: 'Ajánlatok és lemondó nyilatkozatok rögzítése (késve: formailag érvénytelen)', who: ['OWN'], ev: 'Ajánlat beérkezett' },
      { k: 'step', t: 'Bontás a határidő után + bontási jegyzőkönyv – az árak eddig zároltak', who: ['OWN'], ev: 'Ajánlatbontás' },
      { k: 'decision', t: 'Hány érvényes ajánlat?', who: ['SCM'], br: [['0', 'sikertelen eljárás vagy újratender'], ['1', 'SS-átsorolás (→ PROC4) vagy újratender (→ PROC2, új CEO + CFO jóváhagyás)'], ['2', 'folytatható, a tény az SSD-be kerül'], ['3+', 'normál folytatás']], ev: 'SS-átsorolás / Újratendereztetés' },
      { k: 'step', t: 'Műszaki értékelés (60 pont alatt kizárható)', who: ['REQ'], ev: 'Ajánlat értékelve' },
      { k: 'step', t: 'Kereskedelmi értékelés lezárása (ár, fizetés, szállítás, jótállás)', who: ['OWN'], ev: 'Kereskedelmi értékelés lezárva' },
      { k: 'doc', t: 'TCO / DCF kalkuláció', who: ['OWN'], when: C.TCO },
      { k: 'doc', t: 'Kiértékelési mátrix (műszaki 40% · kereskedelmi 60%) – generálható', who: ['OWN'] },
      { k: 'flag', t: 'Titoktartási és összeférhetetlenségi nyilatkozatok (ÉB-tagok)', who: ['OWN'], when: C.K },
    ] },
    proc4(false), proc5,
  ] },
  { id: 'SS', title: 'Sole Source', sub: 'Verseny nélkül, írásos indoklással: monopólium, gyártói karbantartás, időkritikus üzemzavar, stratégiai partner, hosszabbítás', skip: [3], stages: [
    proc1,
    { n: 2, items: [
      { k: 'flag', t: 'Beszerzési stratégia: keretszerződés, készlet, alternatívák', who: ['OWN'] },
      { k: 'flag', t: 'IFS kockázatértékelés', who: ['MI'], when: C.IFS },
      { k: 'step', t: 'Az egyetlen javasolt beszállító megnevezése', who: ['OWN'], ev: 'Ajánlattevő felvéve' },
      { k: 'doc', t: 'SS indoklás űrlap (5. melléklet)', who: ['OWN'] },
      { k: 'doc', t: 'Beszállítói adatlap', who: ['OWN'], when: C.NEW },
      { k: 'doc', t: 'IFS / minőségi követelmények', who: ['MI'], when: C.IFS },
      { k: 'gate', t: 'Sole Source indoklás jóváhagyása', who: [{ when: C.NK, who: ['CCS'] }, { when: C.K, who: ['CEO', 'CFO'] }], note: 'IFS-kritikus alapanyagnál 1 évnél hosszabb SS csak alternatíva-keresési tervvel', ev: APPROVED },
    ] },
    proc4(true), proc5,
  ] },
  { id: 'VH', title: 'Vészhelyzeti', sub: 'Üzemzavar, élelmiszerbiztonsági kockázat, hatósági előírás, vis maior – azonnali megrendelés, utólagos dokumentálás', skip: [2, 3, 4], stages: [
    { n: 1, items: [
      { k: 'doc', t: 'Írásos indoklás (üzemzavar, minőségi kockázat, hatósági előírás)', who: ['REQ'], ev: 'Vészhelyzeti beszerzés indítva' },
      { k: 'gate', t: 'Vészhelyzeti beszerzés jóváhagyása – akár szóban, utólagos írásos megerősítéssel', who: [{ when: C.LOW, who: ['CCS'] }, { when: C.HIGH, who: ['CEO'] }], ev: APPROVED },
      { k: 'step', t: 'Azonnali megrendelés', who: ['OWN'] },
    ] },
    { n: 5, items: [
      { k: 'doc', t: 'Vészhelyzeti jegyzőkönyv (6. melléklet) – 5 munkanapon belül', who: ['OWN'] },
      { k: 'doc', t: 'SS indoklás űrlap – 5 munkanapon belül', who: ['OWN'] },
      { k: 'step', t: 'Beérkezett ajánlat(ok) rögzítése – 5 munkanapon belül', who: ['OWN'] },
      { k: 'doc', t: 'Visszamenőleges PO, dokumentált indoklással – 5 munkanapon belül', who: ['OWN'] },
      { k: 'decision', t: 'Megvan minden 5 munkanapon belül?', who: ['AUTO'], br: [['igen', 'lezárható'], ['nem', 'státusz: „Dokumentáció hiányos”']] },
    ] },
  ] },
]

/* ---------- people ---------- */
const SHORT: Record<string, string> = { REQ: 'Igénylő', OWN: 'Felelős beszerző', CC: 'Költséghely-jóváhagyó', CCS: 'Költséghely-jóváhagyó', AUTO: 'Automatikus', CEO: 'CEO', CFO: 'CFO', SCM: 'SCM vezető', MI: 'MI / IFS', MDM: 'MDM' }
type Ctx = { v: V; mode: 'all' | 'case'; p?: any; ev: boolean }
function resolveWho(w: Who, x: Ctx): { label: string; title: string } {
  const base = SHORT[w] || ROLE_LABEL[w] || w
  if (w === 'AUTO') return { label: base, title: 'Az alkalmazás ellenőrzi' }
  if (w === 'REQ' || w === 'OWN') {
    const who = x.p ? (w === 'REQ' ? x.p.requester : x.p.owner) : ''
    return { label: who && x.mode === 'case' ? nm(who) : base, title: w === 'REQ' ? 'Az igénylő szervezet felelőse' : 'A beszerzés felelős beszerzője (alapértelmezésben az SCM vezető)' }
  }
  if (w === 'CC' || w === 'CCS') {
    const tip = w === 'CCS' ? '11. melléklet szerinti sáv; ha nincs, az SCM vezető' : '11. melléklet szerinti sáv'
    if (x.mode !== 'case') return { label: base, title: tip }
    const a = ccApprover(x.v.cc, x.v.value)
    if (!a) return { label: w === 'CCS' ? nm(S.roles.SCM || 'role:SCM') : 'nincs jóváhagyás', title: tip }
    return { label: nm(a), title: tip }
  }
  const person = S.roles[w]
  return { label: base, title: `${ROLE_LABEL[w] || base} – ${person ? nm(person) : 'nincs kijelölve'}` }
}
function WhoChips({ who, x }: { who: Who[]; x: Ctx }) {
  return <span className="inline-flex flex-wrap gap-1">{who.map((w) => { const r = resolveWho(w, x); return <span key={w} title={r.title} className={cn('rounded-md border px-1.5 py-px text-[11px] leading-4', w === 'AUTO' ? 'border-dashed text-muted-foreground' : 'bg-card')}>{r.label}</span> })}</span>
}
const Tag = ({ c }: { c: Cond }) => <span className={cn('rounded px-1 py-px text-[10px] leading-4', c.out ? 'border border-dashed italic text-muted-foreground' : 'bg-s2-soft text-s2-ink')}>{c.out ? c.l : 'ha ' + c.l}</span>
const Ev = ({ t }: { t: string }) => <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><ClockIcon className="size-3" />napló: {t}</span>

/* ---------- rendering ---------- */
const applies = (c: Cond | undefined, x: Ctx) => !c || x.mode === 'all' || c.t(x.v)
function ItemView({ it, x }: { it: Item; x: Ctx }) {
  if ('when' in it && !applies(it.when, x)) return null
  const tag = 'when' in it && it.when && (x.mode === 'all' || it.when.out) ? <Tag c={it.when} /> : null
  if (it.k === 'gate') {
    const vars = it.who.filter((w) => applies(w.when, x))
    return (
      <div className="rounded-md border-l-2 border-foreground bg-muted/60 px-2.5 py-1.5">
        <div className="flex items-start gap-1.5"><ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" /><span className="text-[13px] font-medium leading-snug">{it.t}</span></div>
        <div className="mt-1 flex flex-col gap-1 pl-5">
          {vars.map((w, i) => <span key={i} className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">dönt: <WhoChips who={w.who} x={x} />{w.when && x.mode === 'all' && <Tag c={w.when} />}</span>)}
          {(tag || it.note) && <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">{tag}{it.note}</span>}
          {x.ev && it.ev && <Ev t={it.ev} />}
        </div>
      </div>
    )
  }
  if (it.k === 'decision') return (
    <div className="rounded-md border border-dashed px-2.5 py-1.5">
      <div className="flex items-start gap-1.5"><DiamondIcon className="mt-0.5 size-3.5 shrink-0" /><span className="text-[13px] font-medium leading-snug">{it.t}</span></div>
      <div className="mt-1 flex flex-col gap-0.5 pl-5">
        <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">dönt: <WhoChips who={it.who} x={x} />{tag}</span>
        {it.br.map(([a, b]) => <span key={a} className="flex items-start gap-1 text-xs"><ArrowRightIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground" /><span><b className="font-medium">{a}</b> – {b}</span></span>)}
        {x.ev && it.ev && <Ev t={it.ev} />}
      </div>
    </div>
  )
  if (it.k === 'docs') {
    const ds = it.docs.filter((d) => applies(d[2], x))
    return (
      <div className="px-1 py-1">
        <div className="flex items-center gap-1.5 text-[13px] font-medium"><FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />{it.t} <span className="text-[11px] font-normal text-muted-foreground">({ds.length} dokumentum)</span></div>
        <ul className="mt-0.5 flex flex-col gap-0.5 pl-5">
          {ds.map(([t, w, c]) => <li key={t} className="flex flex-wrap items-center gap-1 text-xs"><span>{t}</span><WhoChips who={[w]} x={x} />{c && x.mode === 'all' && <Tag c={c} />}</li>)}
        </ul>
      </div>
    )
  }
  const Icon = it.k === 'doc' ? FileTextIcon : it.k === 'flag' ? CheckIcon : it.k === 'auto' ? SparklesIcon : ArrowRightIcon
  return (
    <div className="flex items-start gap-1.5 px-1 py-1">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <span className="text-[13px] leading-snug">{it.t}</span>
        <div className="mt-0.5 flex flex-wrap items-center gap-1"><WhoChips who={it.who} x={x} />{tag}{it.note && <span className="text-[11px] text-muted-foreground">{it.note}</span>}</div>
        {x.ev && it.ev && <Ev t={it.ev} />}
      </div>
    </div>
  )
}
function PathView({ path, x, current }: { path: Path; x: Ctx; current?: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="rounded-lg border bg-card p-3">
        <div className="text-sm font-semibold">{path.title}</div>
        <p className="text-xs text-muted-foreground">{path.sub}</p>
      </div>
      {STAGES.map((st: string[], i: number) => {
        const n = i + 1, stage = path.stages.find((s) => s.n === n)
        if (!stage) return <div key={n} className="rounded-md border border-dashed px-3 py-1 text-[11px] text-muted-foreground">{st[0]} · {st[1]} – kimarad</div>
        return (
          <div key={n} className={cn('rounded-lg border bg-card', current === n && 'ring-2 ring-primary')}>
            <div className="flex items-center justify-between border-b px-3 py-1.5"><span className="text-xs font-semibold"><span className="font-mono text-muted-foreground">{st[0]}</span> · {st[1]}</span>{current === n && <span className="rounded bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">itt tart</span>}</div>
            <div className="flex flex-col gap-1 p-2">{stage.items.map((it, j) => <ItemView key={j} it={it} x={x} />)}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- decision rights ---------- */
const RIGHTS: [string, string, string][] = [
  ['Igény jóváhagyása', 'Költséghely-jóváhagyó (11. melléklet); kiemeltnél + SCM vezető', 'Tender, SS · PROC1'],
  ['Vészhelyzeti beszerzés', 'Költséghely-jóváhagyó (< 2 M Ft) · CEO (≥ 2 M Ft)', 'Vészhelyzeti · azonnal, akár szóban'],
  ['Sole Source indoklás', 'Költséghely-jóváhagyó (Egyedi, Egyszerű) · CEO + CFO (Kiemelt)', 'SS · PROC2; SS-átsorolás után PROC4'],
  ['Tenderkiírás kiküldése', 'CEO + CFO együtt', 'Tender · PROC2, minden értéken'],
  ['Egyetlen érvényes ajánlat', 'SCM vezető / Értékelő Bizottság', 'Tender · bontás után: SS-átsorolás vagy újratender'],
  ['Műszaki kritériumok módosítása tender közben', 'CEO + CFO együtt', 'Tender · PROC3 (szabályzat 9.3.3)'],
  ['Beszállító-kiválasztás (SSD)', 'Költséghely-jóváhagyó (Egyedi, Egyszerű) · CEO + CFO (Kiemelt) – az igénylő nem szavazhat', 'Tender, SS · PROC4'],
  ['Sikertelen eljárás', 'SCM vezető, indoklással', 'Bármikor (keret túllépés, műszaki alkalmatlanság)'],
  ['Jogi és pénzügyi vélemény', 'Jogi és pénzügyi szakértő 5 munkanapon belül; a felelős beszerző csatolja – aláírás csak utána', 'Kiemelt · PROC5'],
  ['Előleg bankgarancia nélkül', 'Kizárólag CFO, írásban', 'Előleges szerződés · PROC5'],
  ['Cégszerű aláírás / szándéknyilatkozat (LoI)', 'CEO + CFO együtt', 'Tender, SS · PROC5'],
  ['Eltérés a 3 írásos ajánlattól', 'CEO írásban', 'Egyedi (szabályzat 9.2.3)'],
]

/* ---------- page ---------- */
const DEF: V = { proc: 'Tender', value: 1_500_000, cat: 'OPEX', maint: false, ifs: false, it: false, prepay: false, newSup: false, ctype: 'PO', cc: '1255BS2300' }
const fromProc = (p: any): V => ({ proc: p.proc === 'Vészhelyzeti' ? 'VH' : p.proc === 'SS' && !p.reclass ? 'SS' : 'Tender', value: p.value, cat: p.cat, maint: !!p.maint, ifs: !!p.ifs, it: !!p.it, prepay: !!p.prepay, newSup: p.bidders.some((b: any) => b.isNew), ctype: String(p.contractType || 'PO').split(' ')[0], cc: p.cc })

function Field({ l, children }: { l: string; children: ReactNode }) { return <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">{l}{children}</label> }
function Check({ l, on, set }: { l: string; on: boolean; set: (b: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={on} onCheckedChange={(b: any) => set(!!b)} />{l}</label>
}

export function DecisionTree() {
  const [mode, setMode] = useState<'all' | 'case'>('all')
  const [v, setV] = useState<V>(DEF)
  const [pid, setPid] = useState('')
  const [ev, setEv] = useState(true)
  const p = pid ? S.procs.find((x: any) => x.id === pid) : null
  const x: Ctx = { v, mode, p, ev }
  const set = (patch: Partial<V>) => { setV({ ...v, ...patch }); setPid('') }
  const pick = (id: string) => { setPid(id); const q = S.procs.find((y: any) => y.id === id); if (q) setV(fromProc(q)); setMode('case') }
  const t = tierOf(v)
  const paths = mode === 'all' ? PATHS : PATHS.filter((q) => q.id === v.proc)
  const ccName = (ref: any) => (ref ? nm(ref) : 'nincs jóváhagyás')
  return (
    <>
      <PageHead title="Döntési fa" sub="A beszerzés útja eljárásonként: szakaszok, teendők, ki dönt, mi kerül a naplóba – és mi múlik az értéken, kategórián, IFS-en, előlegen." />

      <Panel i={1} className="mb-4">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="flex rounded-md bg-muted p-0.5 text-xs font-medium">{([['all', 'Teljes fa – minden változat'], ['case', 'Egy konkrét eset']] as const).map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={cn('rounded px-2.5 py-1', mode === k ? 'bg-card shadow-sm' : 'text-muted-foreground')}>{l}</button>)}</div>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs"><Checkbox checked={ev} onCheckedChange={(b: any) => setEv(!!b)} />Naplóesemények</label>
        </div>
        {mode === 'all' ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ArrowRightIcon className="size-3.5" />teendő</span>
            <span className="flex items-center gap-1"><FileTextIcon className="size-3.5" />dokumentum</span>
            <span className="flex items-center gap-1"><CheckIcon className="size-3.5" />igazolás</span>
            <span className="flex items-center gap-1"><ShieldCheckIcon className="size-3.5" />jóváhagyási kapu</span>
            <span className="flex items-center gap-1"><DiamondIcon className="size-3.5" />elágazás</span>
            <span className="flex items-center gap-1"><Tag c={C.K} />csak ebben az esetben</span>
            <span className="flex items-center gap-1"><Tag c={C.CUT} /></span>
            <span>Az eset szerinti út: válts „Egy konkrét eset”-re.</span>
          </div>
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field l="Meglévő beszerzés alapján"><Sel size="sm" value={pid} onChange={pick} options={[['', '– kézi beállítás –'], ...S.procs.map((q: any) => [q.id, `${q.id} · ${q.subject}`] as Opt)]} /></Field>
            <Field l="Eljárás"><Sel size="sm" value={v.proc} onChange={(x2) => set({ proc: x2 as Proc })} options={[['Tender', 'Tender'], ['SS', 'Sole Source'], ['VH', 'Vészhelyzeti']]} /></Field>
            <Field l={`Becsült nettó érték (Ft) → ${t}`}><Input className="h-8" inputMode="numeric" value={nf.format(v.value)} onChange={(e) => set({ value: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field>
            <Field l="Költséghely"><Sel size="sm" value={v.cc} onChange={(x2) => set({ cc: x2 })} options={Object.keys(CC).map((k) => [k, `${k} · ${CC[k].n}`] as Opt)} /></Field>
            <Field l="Kategória"><Sel size="sm" value={v.cat} onChange={(x2) => set({ cat: x2 })} options={['Direkt', 'Indirekt', 'CAPEX', 'OPEX'].map((c) => [c, c] as Opt)} /></Field>
            <Field l="Szerződéstípus"><Sel size="sm" value={v.ctype} onChange={(x2) => set({ ctype: x2 })} options={[['PO', 'PO'], ['ICO', 'ICO – egyedi'], ['FCO', 'FCO – keret'], ['Előrevásárlás', 'Előrevásárlás'], ['Csatlakozási', 'Csatlakozási']]} /></Field>
            <div className="flex flex-col gap-1.5 sm:col-span-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-4">
              <Check l="IFS-kritikus" on={v.ifs} set={(b) => set({ ifs: b })} />
              <Check l="Új beszállító" on={v.newSup} set={(b) => set({ newSup: b })} />
              <Check l="IT / adatkezelés" on={v.it} set={(b) => set({ it: b })} />
              <Check l="Előleg" on={v.prepay} set={(b) => set({ prepay: b })} />
              {v.cat === 'CAPEX' && <Check l="Fenntartó beruházás" on={v.maint} set={(b) => set({ maint: b })} />}
            </div>
          </div>
        )}
        {mode === 'case' && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t px-3 py-2 text-xs">
            <span><span className="text-muted-foreground">Besorolás:</span> <b className="font-medium">{t}</b></span>
            {v.proc !== 'VH' && <span><span className="text-muted-foreground">Igény:</span> {ccName(ccApprover(v.cc, v.value))}{t === 'Kiemelt' ? ' + SCM vezető' : ''}</span>}
            {v.proc === 'VH' && <span><span className="text-muted-foreground">Vészhelyzeti jóváhagyó:</span> {v.value >= 2e6 ? 'CEO' : ccName(ccApprover(v.cc, v.value) || S.roles.SCM || 'role:SCM')}</span>}
            {v.proc === 'Tender' && <span><span className="text-muted-foreground">Tenderkiírás:</span> CEO + CFO</span>}
            {v.proc !== 'VH' && <span><span className="text-muted-foreground">{v.proc === 'SS' ? 'SS és SSD' : 'SSD'}:</span> {t === 'Kiemelt' ? 'CEO + CFO' : ccName(ccApprover(v.cc, v.value) || S.roles.SCM || 'role:SCM')}</span>}
            {v.proc !== 'VH' && <span><span className="text-muted-foreground">Aláírás:</span> CEO + CFO{t === 'Kiemelt' ? ' (jogi + pénzügyi vélemény után)' : ''}</span>}
          </div>
        )}
      </Panel>

      <div className="mb-4 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-md border px-2 py-1 font-medium">Igény felmerül</span><ArrowRightIcon className="size-3.5 text-muted-foreground" />
          <span className="rounded-md border px-2 py-1">Új beszerzés rögzítése <WhoChips who={['REQ', 'OWN']} x={x} /></span><ArrowRightIcon className="size-3.5 text-muted-foreground" />
          <span className="rounded-md border px-2 py-1">Automatikus besorolás az érték alapján: <b className="font-medium">Egyedi</b> &lt; 2 M · <b className="font-medium">Egyszerű</b> 2–20 M · <b className="font-medium">Kiemelt</b> &gt; 20 M Ft</span><ArrowRightIcon className="size-3.5 text-muted-foreground" />
          <span className="flex items-center gap-1 rounded-md border border-dashed px-2 py-1 font-medium"><DiamondIcon className="size-3.5" />Eljárás?</span>
        </div>
        {ev && <Ev t="Beszerzés létrehozva" />}
        <p className="mt-2 text-xs text-muted-foreground">Bármikor: feladat kiosztható (napló: Feladat létrehozva) · új dokumentumverzió érvényteleníti a rá épülő jóváhagyást, amely újraindul (napló: Korábbi jóváhagyások érvénytelenek) · elutasítás után javítás és új verzió · az SCM vezető sikertelenné nyilváníthatja az eljárást (napló: Eljárás sikertelen) · szakaszváltás csak minden feltétel teljesülése után (napló: Státuszváltás).</p>
      </div>

      <div className={cn('mb-4 grid items-start gap-3', mode === 'all' ? 'xl:grid-cols-3' : 'max-w-3xl')}>
        {paths.map((q) => <PathView key={q.id} path={q} x={x} current={mode === 'case' && p && fromProc(p).proc === q.id && !p.closed ? p.stage : undefined} />)}
      </div>

      <Panel i={3} className="overflow-hidden">
        <PanelHead title="Ki dönt miről" sub="Döntési jogok a szabályzat 8. fejezete és 11. melléklete szerint. A személyeket a Beállítások oldalon lehet kijelölni." />
        <Table>
          <TableHeader><TableRow><TableHead className="pl-4">Döntés</TableHead><TableHead>Ki dönt</TableHead><TableHead className="pr-4">Mikor</TableHead></TableRow></TableHeader>
          <TableBody>{RIGHTS.map(([a, b, c]) => <TableRow key={a}><TableCell className="pl-4 font-medium">{a}</TableCell><TableCell className="whitespace-normal">{b}</TableCell><TableCell className="whitespace-normal pr-4 text-muted-foreground">{c}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Panel>
      {mode === 'case' && <div className="mt-3"><Button size="sm" variant="ghost" onClick={() => { setV(DEF); setPid('') }}>Alaphelyzet</Button></div>}
    </>
  )
}
