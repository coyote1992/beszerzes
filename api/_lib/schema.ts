// SharePoint list schema, provisioning and row <-> entity mapping.
import { drive, encPath, gj, graph, GraphError, pages, site } from './graph.js'

type Kind = 'text' | 'note' | 'number' | 'date' | 'datetime' | 'bool'
type Col = { name: string; displayName: string; kind: Kind; hidden?: boolean; indexed?: boolean }
type ListDef = { title: string; cols: Col[] }

const appCols: Col[] = [
  { name: 'AppId', displayName: 'Alkalmazás-azonosító', kind: 'text', hidden: true, indexed: true },
  { name: 'AppData', displayName: 'Alkalmazásadat', kind: 'note', hidden: true },
]
const c = (name: string, displayName: string, kind: Kind = 'text', extra: Partial<Col> = {}): Col => ({ name, displayName, kind, ...extra })
const auditCols: Col[] = [
  c('Sorszam', 'Sorszám', 'number', { indexed: true }), c('Idopont', 'Időpont', 'datetime'), c('Felhasznalo', 'Felhasználó'), c('Email', 'E-mail'),
  c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('EsemenyTipus', 'Típus'), c('Reszletek', 'Részletek', 'note'), c('ElozoHash', 'Előző hash'), c('Hash', 'Hash'),
]

export const LISTS: Record<string, ListDef> = {
  proc: { title: 'Beszerzések', cols: [...appCols, c('Targy', 'Tárgy'), c('Szervezet', 'Igénylő szervezet'), c('Koltseghely', 'Költséghely'), c('Ertek', 'Becsült nettó érték (Ft)', 'number'),
    c('Kategoria', 'Kategória'), c('Eljaras', 'Eljárás'), c('Tipus', 'Típus'), c('IFS', 'IFS-kritikus', 'bool'), c('Szakasz', 'Szakasz'), c('Statusz', 'Státusz'), c('Igenylo', 'Igénylő'),
    c('Felelos', 'Felelős beszerző'), c('KovetkezoLepes', 'Következő lépés'), c('KovetkezoHatarido', 'Következő határidő', 'date'), c('KivantTeljesites', 'Kívánt teljesítés', 'date'),
    c('AjanlatHatarido', 'Ajánlattételi határidő', 'date'), c('Szerzodestipus', 'Szerződéstípus'), c('Nyertes', 'Nyertes beszállító'), c('VegsoAr', 'Végső ár (Ft)', 'number'),
    c('Megtakaritas', 'Megtakarítás (Ft)', 'number'), c('Lezarva', 'Lezárva', 'datetime'), c('Mappa', 'Dokumentummappa'), c('Teszt', 'Teszt', 'bool'), c('Letrehozva', 'Létrehozva', 'date')] },
  bidder: { title: 'Ajánlattevők', cols: [...appCols, c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('Email', 'E-mail'), c('AjanlattevoTipus', 'Típus'), c('UjBeszallito', 'Új beszállító', 'bool'),
    c('Allapot', 'Állapot'), c('Beerkezett', 'Beérkezett', 'datetime'), c('Formai', 'Formailag megfelelő'), c('Ar', 'Nettó ár (Ft)', 'number'), c('FizetesiHatarido', 'Fizetési határidő (nap)', 'number'),
    c('Szallitas', 'Szállítási idő (hét)', 'number'), c('Jotallas', 'Jótállás (hó)', 'number'), c('MuszakiPont', 'Műszaki pontszám', 'number')] },
  appr: { title: 'Jóváhagyások', cols: [...appCols, c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('JovahagyasTipus', 'Jóváhagyás típusa'), c('Kerte', 'Kérte'), c('Kerve', 'Kérve', 'datetime'),
    c('Allapot', 'Állapot'), c('Jovahagyok', 'Jóváhagyók', 'note'), c('Dontesek', 'Döntések', 'note'), c('Dokumentum', 'Jóváhagyott dokumentum')] },
  task: { title: 'Feladatok', cols: [...appCols, c('Leiras', 'Leírás', 'note'), c('Felelos', 'Felelős'), c('Kiosztotta', 'Kiosztotta'), c('Hatarido', 'Határidő', 'date'),
    c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('Kesz', 'Elvégezve', 'datetime')] },
  doc: { title: 'Dokumentum-nyilvántartás', cols: [...appCols, c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('DokTipus', 'Dokumentumtípus'), c('Verzio', 'Verzió', 'number'),
    c('Ajanlattevo', 'Ajánlattevő'), c('Feltoltotte', 'Feltöltötte'), c('Idopont', 'Időpont', 'datetime'), c('Megjegyzes', 'Megjegyzés'), c('Fajl', 'Fájl hivatkozás')] },
  person: { title: 'Munkatársak', cols: [...appCols, c('Email', 'E-mail', 'text', { indexed: true }), c('Beosztas', 'Beosztás'), c('Szerepkorok', 'Szerepkörök'), c('Admin', 'Adminisztrátor', 'bool'), c('Aktiv', 'Aktív', 'bool')] },
  setting: { title: 'Beállítások', cols: [...appCols] },
  audit: { title: 'Auditnapló', cols: auditCols },
  auditTest: { title: 'Auditnapló – teszt', cols: auditCols },
}
export type ListKey = keyof typeof LISTS

export const ROOT_FOLDER = 'Beszerzések'
export const TEST_FOLDER = 'Teszt beszerzések'

function colBody(col: Col) {
  const b: any = { name: col.name, displayName: col.displayName }
  if (col.hidden) b.hidden = true
  if (col.indexed) b.indexed = true
  if (col.kind === 'text') b.text = {}
  if (col.kind === 'note') b.text = { allowMultipleLines: true, textType: 'plain', linesForEditing: 6 }
  if (col.kind === 'number') b.number = {}
  if (col.kind === 'date') b.dateTime = { format: 'dateOnly' }
  if (col.kind === 'datetime') b.dateTime = { format: 'dateTime' }
  if (col.kind === 'bool') b.boolean = {}
  return b
}

let listIds: Record<string, string> | null = null
let provisioning: Promise<Record<string, string>> | null = null

async function ensureFolder(parentPath: string, name: string) {
  const d = await drive()
  const parent = parentPath ? `/drives/${d}/root:/${encPath(parentPath)}:/children` : `/drives/${d}/root/children`
  const r = await graph(parent, { method: 'POST', body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }) })
  if (!r.ok && r.status !== 409) throw new Error(`Folder create failed (${name}): ${r.body?.error?.message || r.status}`)
}

const NEEDS_MANAGE = 'Az alkalmazás nem tud listát létrehozni a SharePoint „Beszerzés” webhelyen (Access denied). ' +
  'Az alkalmazás webhely-engedélyét (Sites.Selected) „write” helyett „manage” szintre kell emelni – a lépések a README „Beállítás” részében. Utána töltsd újra az oldalt.'
/** Creating lists and columns needs the "manage" site role; "write" only covers items and files. */
const explain = (e: unknown) => (e instanceof GraphError && e.status === 403 ? new GraphError(403, 'needs_manage', NEEDS_MANAGE) : e)

async function provision(): Promise<Record<string, string>> {
  const existing = await pages(`${site()}/lists?$select=id,displayName`)
  const byName = new Map(existing.map((l: any) => [l.displayName, l.id as string]))
  const ids: Record<string, string> = {}
  await Promise.all(Object.entries(LISTS).map(async ([key, def]) => {
    let id = byName.get(def.title)
    if (!id) {
      const created = await gj(`${site()}/lists`, { method: 'POST', body: JSON.stringify({ displayName: def.title, list: { template: 'genericList' }, columns: def.cols.map(colBody) }) }).catch((e) => { throw explain(e) })
      id = created.id as string
    } else {
      const cols = await pages(`${site()}/lists/${id}/columns?$select=name`)
      const have = new Set(cols.map((x: any) => x.name))
      for (const col of def.cols) if (!have.has(col.name)) await gj(`${site()}/lists/${id}/columns`, { method: 'POST', body: JSON.stringify(colBody(col)) }).catch((e) => { throw explain(e) })
    }
    ids[key] = id
  }))
  await ensureFolder('', ROOT_FOLDER)
  await ensureFolder('', TEST_FOLDER)
  return ids
}

export async function lists(): Promise<Record<string, string>> {
  if (listIds) return listIds
  if (!provisioning) provisioning = provision().then((r) => (listIds = r)).catch((e) => { provisioning = null; throw e })
  return provisioning
}

export const itemsPath = (listId: string) => `${site()}/lists/${listId}/items`

export async function loadRows(listId: string): Promise<any[]> {
  return pages(`${itemsPath(listId)}?expand=fields&$top=999`)
}

/** Converts a client "view" object into SharePoint fields, keeping only known visible columns. */
export function viewToFields(key: ListKey, view: Record<string, unknown> = {}) {
  const def = LISTS[key]
  const out: Record<string, unknown> = {}
  if (typeof view.Title === 'string') out.Title = view.Title.slice(0, 255)
  for (const col of def.cols) {
    if (col.hidden || !(col.name in view)) continue
    const v = view[col.name]
    if (v === null || v === undefined || v === '') { out[col.name] = null; continue }
    if (col.kind === 'number') { const n = Number(v); out[col.name] = Number.isFinite(n) ? n : null }
    else if (col.kind === 'bool') out[col.name] = !!v
    else if (col.kind === 'date') out[col.name] = /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? `${String(v).slice(0, 10)}T12:00:00Z` : null
    else if (col.kind === 'datetime') { const d = new Date(String(v)); out[col.name] = isNaN(+d) ? null : d.toISOString() }
    else if (col.kind === 'note') out[col.name] = String(v).slice(0, 60000)
    else out[col.name] = String(v).slice(0, 255)
  }
  return out
}

/** Safe folder/file name for SharePoint. */
export const safeName = (s: string, max = 120) =>
  String(s).replace(/[\\/:*?"<>|#%\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, max) || 'dokumentum'

export const SUBFOLDERS = ['Igény és specifikáció', 'BSD és tenderkiírás', 'Meghívások', 'Beérkezett ajánlatok', 'Bontási jegyzőkönyv', 'Műszaki értékelés', 'Kereskedelmi értékelés és TCO', 'Tárgyalási dokumentumok', 'SSD és jóváhagyások', 'Szerződés és módosítások', 'PO, teljesítésigazolás és lezárás']
export const subfolder = (n: number) => `${String(n).padStart(2, '0')} – ${SUBFOLDERS[n - 1]}`

/** Validates a relative drive path the client asks us to write to. */
export function checkPath(p: string): string | null {
  const clean = String(p || '').split('/').map((s) => s.trim()).filter(Boolean)
  if (!clean.length || clean.some((s) => s === '..' || s === '.')) return null
  if (clean[0] !== ROOT_FOLDER && clean[0] !== TEST_FOLDER) return null
  return clean.join('/')
}

/** Creates <root>/<proc folder>/01..11 subfolders. Returns the folder webUrl. */
export async function createProcFolders(path: string): Promise<string | null> {
  const parts = path.split('/')
  await ensureFolder(parts[0], parts.slice(1).join('/'))
  await Promise.all(SUBFOLDERS.map((_, i) => ensureFolder(path, subfolder(i + 1))))
  const d = await drive()
  const item = await graph(`/drives/${d}/root:/${encPath(path)}?$select=webUrl`)
  return item.ok ? item.body.webUrl : null
}

export async function deleteFolder(path: string) {
  const d = await drive()
  await graph(`/drives/${d}/root:/${encPath(path)}`, { method: 'DELETE' })
}
