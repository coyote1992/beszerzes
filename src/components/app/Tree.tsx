import { useState } from 'react'
import { S, STAGES, nm } from '@/engine/engine.js'
import { cn } from '@/lib/utils'
import { PageHead, Panel } from './Page'

/* Swimlane view of the procurement process. Keep in line with checklist() in src/engine/engine.js. */
type Proc = 'T' | 'S' | 'V'
type Tier = 'E' | 'M' | 'K'
type Lane = 'REQ' | 'OWN' | 'CC' | 'SCM' | 'TOP' | 'MI'
type Chip = { t: string; ap?: boolean; br?: boolean; when?: string }
type Stage = Partial<Record<Lane, Chip[]>> | null

const LANES: [Lane, string][] = [['REQ', 'Igénylő'], ['OWN', 'Felelős beszerző'], ['CC', 'Költséghely-jóváhagyó'], ['SCM', 'SCM vezető'], ['TOP', 'CEO + CFO'], ['MI', 'MI / IFS']]
const laneSub = (l: Lane) => {
  const who = (r: string) => (S.roles?.[r] ? nm(S.roles[r]) : 'nincs kijelölve')
  if (l === 'REQ') return 'az igénylő szervezet'
  if (l === 'OWN') return 'beszerzésenként kijelölve'
  if (l === 'CC') return '11. melléklet szerint'
  if (l === 'SCM') return who('SCM')
  if (l === 'TOP') return `${who('CEO')} · ${who('CFO')}`
  return who('MI')
}

const ap = (t: string, when?: string): Chip => ({ t, ap: true, when })
const st = (t: string, when?: string): Chip => ({ t, when })
const br = (t: string): Chip => ({ t, br: true })

function stages(proc: Proc, tier: Tier): Stage[] {
  const K = tier === 'K', E = tier === 'E'
  if (proc === 'V') return [
    { REQ: [st('Írásos indoklás')], CC: E ? [ap('Jóváhagyás, akár szóban')] : [], TOP: E ? [] : [ap('CEO jóváhagyása, akár szóban')], OWN: [st('Azonnali megrendelés')] },
    null, null, null,
    { OWN: [st('5 munkanapon belül: vészhelyzeti jegyzőkönyv, SS-indoklás, ajánlat(ok), visszamenőleges PO')] },
  ]
  const p1: Stage = { REQ: [st('Specifikáció, mennyiség, ütemezés')], CC: [ap('Igény jóváhagyása')], SCM: K ? [ap('Igény jóváhagyása')] : [] }
  const ifs2 = [st('IFS kockázatértékelés, minőségi követelmények', 'IFS-kritikus'), st('MSDS és DoC', 'IFS-kritikus direkt')]
  const p2: Stage = proc === 'T'
    ? {
        OWN: [st(`Stratégia, min. 3 ajánlattevő${E ? ' (max. 2 webáruházi)' : ''}`), st(`Tendercsomag: RFQ, mennyiség és ütemterv${E ? '' : ', árazás, mátrix-sablon'}${K ? ', BSD, titoktartási nyilatkozat, szerződéstervezet' : ''}`),
          st('Beszállítói adatlap', 'új beszállító'), ...(E ? [] : [st('Kiberbiztonsági záradék', 'IT / adatkezelés')])],
        MI: ifs2, TOP: [ap('Tenderkiírás')],
      }
    : { OWN: [st('Stratégia, egyetlen beszállító, SS-indoklás űrlap'), st('Beszállítói adatlap', 'új beszállító')], MI: ifs2.slice(0, 1), CC: K ? [] : [ap('SS-indoklás')], TOP: K ? [ap('SS-indoklás')] : [] }
  const p3: Stage = proc === 'T'
    ? { OWN: [st('Kiküldés az arajanlat@ címről, ajánlatok rögzítése, bontás'), st('Kereskedelmi értékelés, kiértékelési mátrix'), st('TCO / DCF', 'CAPEX'), ...(K ? [st('Titoktartási nyilatkozatok (ÉB)')] : [])], REQ: [st('Műszaki értékelés')], SCM: [br('0–1 érvényes ajánlat: SS-átsorolás vagy újratender')] }
    : null
  const p4: Stage = { OWN: [st('Tárgyalás, SSD'), ...(proc === 'S' ? [st('TCO / DCF', 'CAPEX')] : [])], MI: [st('Előminősítés', 'új beszállító'), st('IFS-tanúsítványok', 'IFS-kritikus')], CC: K ? [] : [ap('SSD – az igénylő nem szavazhat')], TOP: K ? [ap('SSD – az igénylő nem szavazhat')] : [] }
  const p5: Stage = { OWN: [st('Szerződéstípus, végleges tervezet, aláírt példány'), ...(K ? [st('Jogi és pénzügyi vélemény')] : []), st('Bankgarancia', 'előleg')], TOP: [ap('Aláírás'), ap('Eltérés a bankgaranciától – csak CFO', 'előleg')] }
  return [p1, p2, p3, p4, p5]
}

function Seg<T extends string>({ value, set, opts }: { value: T; set: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-md bg-muted p-0.5 text-xs font-medium">
      {opts.map(([k, l]) => <button key={k} onClick={() => set(k)} className={cn('rounded px-2.5 py-1', value === k ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{l}</button>)}
    </div>
  )
}
function ChipView({ c }: { c: Chip }) {
  return (
    <span className={cn('mb-1 block rounded-md border px-2 py-1 text-xs leading-snug',
      c.ap ? 'border-foreground bg-foreground text-background' : c.br ? 'border-dashed' : c.when ? 'border-transparent bg-s2-soft text-s2-ink' : 'bg-card')}>
      {c.ap && '✓ '}{!c.ap && c.when && '+ '}{c.t}
      {c.when && <span className={cn('block text-[10px]', c.ap ? 'opacity-70' : 'opacity-80')}>ha {c.when}</span>}
    </span>
  )
}

export function DecisionTree() {
  const [proc, setProc] = useState<Proc>('T')
  const [tier, setTier] = useState<Tier>('E')
  const ss = stages(proc, tier)
  return (
    <>
      <PageHead title="Döntési fa" sub="Ki mit csinál az egyes szakaszokban. Válaszd ki az eljárást és az értéket." />
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Seg value={proc} set={setProc} opts={[['T', 'Tender'], ['S', 'Sole Source'], ['V', 'Vészhelyzeti']]} />
          <Seg value={tier} set={setTier} opts={[['E', '< 2 M · Egyedi'], ['M', '2–20 M · Egyszerű'], ['K', '> 20 M · Kiemelt']]} />
          <span className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-foreground" />jóváhagyás</span>
            <span className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm bg-s2-soft ring-1 ring-s2/50" />csak bizonyos esetben</span>
            <span className="flex items-center gap-1"><span className="inline-block size-3 rounded-sm border border-dashed border-foreground/60" />elágazás</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="w-40 p-2 pl-3" />
                {STAGES.map((s: string[]) => <th key={s[0]} className="p-2 align-bottom text-xs font-normal text-muted-foreground"><span className="block text-[13px] font-semibold text-foreground">{s[0]}</span>{s[1]}</th>)}
              </tr>
            </thead>
            <tbody>
              {LANES.map(([l, name], li) => (
                <tr key={l} className="border-b last:border-b-0">
                  <th className="w-40 p-2 pl-3 align-top"><span className="block text-[13px] font-semibold">{name}</span><span className="block text-[11px] font-normal text-muted-foreground">{laneSub(l)}</span></th>
                  {ss.map((s, i) => !s
                    ? <td key={i} className="bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--muted)_6px_12px)] p-2 text-center align-top text-[11px] text-muted-foreground">{li === 0 && <span className="rounded bg-card px-1.5 py-0.5">kimarad</span>}</td>
                    : <td key={i} className="p-2 align-top">{(s[l] || []).map((c, j) => <ChipView key={j} c={c} />)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {proc === 'V' ? 'Vészhelyzetben a PROC2–4 kimarad: azonnali megrendelés, a dokumentációt 5 munkanapon belül pótolni kell. 2 M Ft alatt a költséghely-jóváhagyó, felette a CEO dönt.'
            : proc === 'S' ? 'Sole Source-nál a PROC3 (tender) kimarad. A szerződést mindig a CEO és a CFO együtt írja alá.'
            : 'Bármelyik jóváhagyás elutasítható – javítás és új dokumentumverzió után újraindul. A sikertelen eljárásról az SCM vezető dönt.'}
        </p>
      </Panel>
    </>
  )
}
