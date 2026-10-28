import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { openDlg, setUI, ui, useUI, type View } from '@/lib/store'
import { Button } from '@/components/ui/button'

type Step = { sel?: string; view?: View; title: string; body: ReactNode }

const STEPS: Step[] = [
  { title: 'Üdv a Beszerzési központban!', body: <>Az alkalmazás a Fonte Viva Beszerzési Szabályzatát (PROC1–PROC5) vezeti végig: ki mit csinál, mi hiányzik a továbblépéshez, ki hagyja jóvá. Minden adat és fájl a SharePoint „Beszerzés” webhelyére kerül. A bemutató kb. 2 perc.</> },
  { sel: 'nav', view: 'dash', title: 'Navigáció', body: <>Bal oldalt éred el az oldalakat. A számok jelzik, hány nyitott tétel vár rád (jóváhagyás, feladat).</> },
  { sel: 'kpis', view: 'dash', title: 'Irányítópult', body: <>Egy pillantással: aktív beszerzések, függő jóváhagyások, közeli határidők. Alatta a folyamat-térkép, a teendőid és az élő szabályzati figyelmeztetések.</> },
  { sel: 'new', view: 'dash', title: 'Új beszerzés indítása', body: <>Itt indul minden (PROC1). Az érték alapján az alkalmazás automatikusan besorol (Egyedi &lt; 2 M, Egyszerű 2–20 M, Kiemelt &gt; 20 M Ft), és kiszámolja a költséghely-jóváhagyót. Gyakorláshoz jelöld be a <b>TESZT</b> opciót – az ilyen beszerzés később nyomtalanul törölhető.</> },
  { sel: 'nav-procs', view: 'procs', title: 'Beszerzések', body: <>Az összes beszerzés szűrhető listája. Egy sorra kattintva megnyílik a beszerzés lapja: <b>Áttekintés</b> (mi hiányzik a továbblépéshez, felelősökkel), <b>Ajánlatok</b>, <b>Dokumentumok</b>, <b>Feladatok</b>, <b>Jóváhagyások</b>, <b>Levelezés</b> és <b>Napló</b>.</> },
  { sel: 'nav-procs', view: 'procs', title: 'Dokumentumok a SharePointban', body: <>Minden beszerzés saját mappát kap a Dokumentumok tárban (Beszerzések / &lt;azonosító + tárgy&gt;), benne a szabályzat szerinti 01–11 almappával. A feltöltött fájl a megfelelő almappába kerül; új verzió nem írja felül a régit, és érvényteleníti a rá épülő jóváhagyást.</> },
  { sel: 'nav-appr', view: 'appr', title: 'Jóváhagyásaim', body: <>Itt látod, mi vár a te döntésedre (pl. tenderkiírás: CEO + CFO). A döntés a dokumentum aktuális verziójához és időbélyegéhez kötődik.</> },
  { sel: 'nav-tasks', view: 'tasks', title: 'Feladatok', body: <>Feladatot bárkinek kioszthatsz határidővel, beszerzéshez kötve vagy önállóan. A felelősnél megjelenik a saját listájában.</> },
  { sel: 'nav-audit', view: 'audit', title: 'Auditnapló', body: <>Minden művelet – ki, mikor, mit – visszavonhatatlanul bekerül. A bejegyzéseket a szerver SHA-256 hash-lánccal köti össze; a „Lánc ellenőrzése” gomb kimutatja, ha valaki utólag módosított. CSV-be exportálható.</> },
  { sel: 'nav-policy', view: 'policy', title: 'Szabályzat', body: <>Az alkalmazás által kikényszerített szabályok összefoglalója: értékhatárok, kötelező jóváhagyások, költséghely-sávok, megőrzési idők.</> },
  { sel: 'nav-tree', view: 'tree', title: 'Döntési fa', body: <>A teljes folyamat egy oldalon: mindhárom eljárás (tender, Sole Source, vészhelyzeti) szakaszai, a feltételes lépések (pl. „ha Kiemelt”, „ha IFS-kritikus”), ki dönt és mi kerül a naplóba. Az „Egy konkrét eset” nézet egy meglévő beszerzés vagy a beállított paraméterek szerinti utat mutatja, a valódi jóváhagyók nevével.</> },
  { sel: 'nav-settings', view: 'settings', title: 'Beállítások', body: <>Adminisztrátorként itt jelölöd ki, ki a CEO, CFO, SCM vezető stb., saját szerepköröket is létrehozhatsz, és beállítod, ki hagyja jóvá az egyes költséghely-sávokat. A kollégák az első bejelentkezéskor automatikusan felkerülnek; előre is felveheted őket.</> },
  { sel: 'search', title: 'Gyorskeresés', body: <>Ctrl K (Mac: ⌘K): beszerzés keresése azonosító, tárgy vagy beszállító szerint, és gyors műveletek.</> },
  { sel: 'sync', title: 'Automatikus mentés', body: <>Nincs mentés gomb: minden módosítás néhány másodpercen belül a SharePointba kerül. Itt látod az állapotot („Mentve”, „Mentés…”, vagy hiba esetén újrapróbálás).</> },
  { sel: 'user', title: 'A fiókod', body: <>Itt látod, ki vagy bejelentkezve és milyen szerepköröd van. A bejelentkezés 10 óráig érvényes; itt jelentkezhetsz ki, és innen bármikor újraindíthatod ezt a bemutatót.</> },
  { title: 'Kész is vagy!', body: <>A legjobb módja a megismerésnek, ha végigviszel egy gyakorló beszerzést: létrehozod, kijelölöd a felelősöket, feltöltesz pár dokumentumot és jóváhagyást kérsz.</> },
]

const find = (sel?: string): HTMLElement | null => {
  if (!sel) return null
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${sel}"]`))) { const r = el.getBoundingClientRect(); if (r.width && r.height) return el }
  return null
}

export function Tour() {
  const u = useUI(), i = u.tour
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = i >= 0 ? STEPS[Math.min(i, STEPS.length - 1)] : null
  const close = () => setUI({ tour: -1 })
  const go = (n: number) => setUI({ tour: n < 0 ? 0 : n >= STEPS.length ? -1 : n })

  useLayoutEffect(() => {
    if (!step) return
    if (step.view && ui.view !== step.view) setUI({ view: step.view, open: null, dialog: null, palette: false })
    let raf = 0
    const measure = () => { const el = find(step.sel); setRect(el ? el.getBoundingClientRect() : null) }
    const t = setTimeout(() => { find(step.sel)?.scrollIntoView({ block: 'nearest' }); measure() }, 80)
    measure()
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('resize', on); window.addEventListener('scroll', on, true)
    return () => { clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!step) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' || e.key === 'Enter') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1) }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  if (!step) return null
  const last = i === STEPS.length - 1
  const pad = 6, W = 320, vw = window.innerWidth, vh = window.innerHeight
  let pos: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  if (rect && vw >= 640) {
    if (rect.right + pad + 12 + W < vw) pos = { left: rect.right + pad + 12, top: Math.min(Math.max(12, rect.top), vh - 260) }
    else if (rect.bottom + 220 < vh) pos = { left: Math.min(Math.max(12, rect.right - W), vw - W - 12), top: rect.bottom + pad + 10 }
    else pos = { left: Math.min(Math.max(12, rect.left), vw - W - 12), top: Math.max(12, rect.top - pad - 230) }
  } else if (rect) pos = { left: 12, right: 12, bottom: 76 }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {rect ? <div className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200 ease-out" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }} />
        : <div className="absolute inset-0 bg-black/50" />}
      <div className="pop absolute w-[20rem] max-w-[calc(100vw-1.5rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg" style={pos}>
        <div className="mb-1 text-xs text-muted-foreground">{i + 1} / {STEPS.length}</div>
        <h3 className="text-sm font-semibold">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={close}>{last ? 'Bezárás' : 'Kihagyás'}</Button>
          <div className="flex gap-1.5">
            {i > 0 && <Button size="sm" variant="outline" onClick={() => go(i - 1)}>Vissza</Button>}
            {last ? <Button size="sm" onClick={() => { close(); setUI({ view: 'procs' }); openDlg({ type: 'new', key: 'test' }) }}>Gyakorló beszerzés indítása</Button>
              : <Button size="sm" onClick={() => go(i + 1)}>{i === 0 ? 'Kezdjük' : 'Tovább'}</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}
