// SharePoint list schema, provisioning and row <-> entity mapping.
// Lists can be created by the app (needs the "manage" site role) or by hand in SharePoint (enough with "write").
// Columns are matched by internal name or display name, ignoring accents, case and punctuation, and values are
// written according to the column's real type. Only AppId/AppData are required; readable columns are optional.
import { drive, encPath, gj, graph, GraphError, pages, site } from './graph.js'

type Kind = 'text' | 'note' | 'number' | 'date' | 'datetime' | 'bool'
type Col = { name: string; displayName: string; kind: Kind; hidden?: boolean; indexed?: boolean; required?: boolean }
type ListDef = { title: string; cols: Col[] }

const c = (name: string, displayName: string, kind: Kind = 'text', extra: Partial<Col> = {}): Col => ({ name, displayName, kind, ...extra })
const AppId = c('AppId', 'AppId', 'text', { hidden: true, indexed: true, required: true })
const AppData = c('AppData', 'AppData', 'note', { hidden: true, required: true })
const auditCols: Col[] = [
  AppData, c('Sorszam', 'Sorszám', 'number', { indexed: true }), c('Idopont', 'Időpont', 'datetime'), c('Felhasznalo', 'Felhasználó'), c('Email', 'E-mail'),
  c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('EsemenyTipus', 'Esemény típusa'), c('Reszletek', 'Részletek', 'note'), c('ElozoHash', 'Előző hash'), c('Hash', 'Hash'),
]

export const LISTS: Record<string, ListDef> = {
  proc: { title: 'Beszerzések', cols: [AppId, AppData, c('Targy', 'Tárgy'), c('Szervezet', 'Igénylő szervezet'), c('Koltseghely', 'Költséghely'), c('Ertek', 'Becsült nettó érték', 'number'),
    c('Kategoria', 'Kategória'), c('Eljaras', 'Eljárás'), c('Tipus', 'Beszerzési típus'), c('IFS', 'IFS-kritikus', 'bool'), c('Szakasz', 'Szakasz'), c('Statusz', 'Státusz'), c('Igenylo', 'Igénylő'),
    c('Felelos', 'Felelős beszerző'), c('KovetkezoLepes', 'Következő lépés'), c('KovetkezoHatarido', 'Következő határidő', 'date'), c('KivantTeljesites', 'Kívánt teljesítés', 'date'),
    c('AjanlatHatarido', 'Ajánlattételi határidő', 'date'), c('Szerzodestipus', 'Szerződéstípus'), c('Nyertes', 'Nyertes beszállító'), c('VegsoAr', 'Végső ár', 'number'),
    c('Megtakaritas', 'Megtakarítás', 'number'), c('Lezarva', 'Lezárva', 'datetime'), c('Mappa', 'Dokumentummappa', 'note'), c('Teszt', 'Teszt', 'bool'), c('Letrehozva', 'Létrehozás dátuma', 'date')] },
  bidder: { title: 'Ajánlattevők', cols: [AppId, AppData, c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('Email', 'E-mail'), c('AjanlattevoTipus', 'Ajánlattevő típusa'), c('UjBeszallito', 'Új beszállító', 'bool'),
    c('Allapot', 'Állapot'), c('Beerkezett', 'Beérkezett', 'datetime'), c('Formai', 'Formailag megfelelő'), c('Ar', 'Nettó ár', 'number'), c('FizetesiHatarido', 'Fizetési határidő', 'number'),
    c('Szallitas', 'Szállítási idő', 'number'), c('Jotallas', 'Jótállás', 'number'), c('MuszakiPont', 'Műszaki pontszám', 'number')] },
  appr: { title: 'Jóváhagyások', cols: [AppId, AppData, c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('JovahagyasTipus', 'Jóváhagyás típusa'), c('Kerte', 'Kérte'), c('Kerve', 'Kérve', 'datetime'),
    c('Allapot', 'Állapot'), c('Dontesek', 'Döntések', 'note')] },
  task: { title: 'Feladatok', cols: [AppId, AppData, c('Leiras', 'Leírás', 'note'), c('Felelos', 'Felelős'), c('Kiosztotta', 'Kiosztotta'), c('Hatarido', 'Határidő', 'date'),
    c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('Kesz', 'Elvégezve', 'datetime')] },
  doc: { title: 'Dokumentum-nyilvántartás', cols: [AppId, AppData, c('Beszerzes', 'Beszerzés', 'text', { indexed: true }), c('DokTipus', 'Dokumentumtípus'), c('Verzio', 'Dokumentumverzió', 'number'),
    c('Ajanlattevo', 'Ajánlattevő'), c('Feltoltotte', 'Feltöltötte'), c('Idopont', 'Időpont', 'datetime'), c('Megjegyzes', 'Megjegyzés'), c('Fajl', 'Fájl hivatkozás', 'note')] },
  person: { title: 'Munkatársak', cols: [AppId, AppData, c('Email', 'E-mail', 'text', { indexed: true }), c('Beosztas', 'Beosztás'), c('Szerepkorok', 'Szerepkörök'), c('Admin', 'Adminisztrátor', 'bool'), c('Aktiv', 'Aktív', 'bool')] },
  setting: { title: 'Beállítások', cols: [AppId, AppData] },
  audit: { title: 'Auditnapló', cols: auditCols },
  auditTest: { title: 'Auditnapló – teszt', cols: auditCols },
}
export type ListKey = keyof typeof LISTS

export const ROOT_FOLDER = 'Beszerzések'
export const TEST_FOLDER = 'Teszt beszerzések'

/** "Auditnapló – teszt" == "auditnaplo-teszt" == "Auditnaplo teszt" */
const norm = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const KIND_HU: Record<Kind, string> = { text: 'Egysoros szöveg', note: 'Többsoros szöveg', number: 'Szám', date: 'Dátum', datetime: 'Dátum', bool: 'Igen/Nem' }

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
type Actual = { name: string; kind: Kind | 'other' }
const kindOf = (a: any): Kind | 'other' =>
  a.text ? (a.text.allowMultipleLines ? 'note' : 'text') : a.number || a.currency ? 'number' : a.dateTime ? (a.dateTime.format === 'dateOnly' ? 'date' : 'datetime') : a.boolean ? 'bool' : 'other'
function match(actual: any[], col: Col) {
  const want = new Set([norm(col.name), norm(col.displayName)])
  return actual.find((a) => a.name === col.name) || actual.find((a) => !a.readOnly && (want.has(norm(a.displayName)) || want.has(norm(a.name))))
}

type ListInfo = { id: string; cols: Record<string, Actual>; byInternal: Record<string, string> }
let cache: { at: number; p: Promise<Record<string, ListInfo>> } | null = null
let infoNow: Record<string, ListInfo> = {}
const keyOfId = new Map<string, string>()
const REFRESH_MS = 10 * 60_000

async function ensureFolder(parentPath: string, name: string) {
  const d = await drive()
  const parent = parentPath ? `/drives/${d}/root:/${encPath(parentPath)}:/children` : `/drives/${d}/root/children`
  const r = await graph(parent, { method: 'POST', body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }) })
  if (!r.ok && r.status !== 409) throw new Error(`Folder create failed (${name}): ${r.body?.error?.message || r.status}`)
}

const denied = (e: unknown) => e instanceof GraphError && (e.status === 403 || e.status === 401)

async function provision(): Promise<Record<string, ListInfo>> {
  const existing = await pages(`${site()}/lists?$select=id,displayName`)
  let canManage = true
  const missingLists: string[] = [], problems: string[] = []
  const out: Record<string, ListInfo> = {}
  await Promise.all(Object.entries(LISTS).map(async ([key, def]) => {
    let id: string | undefined = existing.find((l: any) => norm(l.displayName) === norm(def.title))?.id
    if (!id && canManage) {
      try { id = (await gj(`${site()}/lists`, { method: 'POST', body: JSON.stringify({ displayName: def.title, list: { template: 'genericList' }, columns: def.cols.map(colBody) }) })).id }
      catch (e) { if (!denied(e)) throw e; canManage = false }
    }
    if (!id) { missingLists.push(def.title); return }
    const actual = await pages(`${site()}/lists/${id}/columns`)
    const cols: Record<string, Actual> = {}, byInternal: Record<string, string> = {}
    for (const col of def.cols) {
      let a = match(actual, col)
      if (!a && canManage) {
        try { a = await gj(`${site()}/lists/${id}/columns`, { method: 'POST', body: JSON.stringify(colBody(col)) }) }
        catch (e) { if (!denied(e)) throw e; canManage = false }
      }
      if (a) { cols[col.name] = { name: a.name, kind: kindOf(a) }; byInternal[a.name] = col.name }
      if (col.required && !a) problems.push(`„${def.title}” listában hiányzik a(z) „${col.name}” oszlop (${KIND_HU[col.kind]})`)
      else if (col.required && cols[col.name].kind !== col.kind) problems.push(`„${def.title}” listában a(z) „${col.name}” oszlop típusa legyen ${KIND_HU[col.kind]}`)
    }
    out[key] = { id, cols, byInternal }
  }))
  if (missingLists.length || problems.length) {
    const lines = [...missingLists.map((t) => `Hiányzó lista: „${t}”`), ...problems]
    throw new GraphError(409, 'setup_incomplete', `A SharePoint-beállítás még hiányos a „Beszerzés” webhelyen:\n• ${lines.join('\n• ')}\nHozd létre őket (lásd README), majd töltsd újra az oldalt.`)
  }
  await ensureFolder('', ROOT_FOLDER)
  await ensureFolder('', TEST_FOLDER)
  keyOfId.clear()
  for (const [k, v] of Object.entries(out)) keyOfId.set(v.id, k)
  infoNow = out
  return out
}

/** List ids by key; provisions/maps once per instance and re-reads columns every 10 minutes (to pick up columns added by hand). */
export async function lists(): Promise<Record<string, string>> {
  if (!cache || Date.now() - cache.at > REFRESH_MS) {
    const p = provision()
    cache = { at: Date.now(), p }
    p.catch(() => { if (cache?.p === p) cache = null })
  }
  const info = await cache.p
  return Object.fromEntries(Object.entries(info).map(([k, v]) => [k, v.id]))
}

function coerce(kind: Kind, v: unknown, logical: string) {
  if (v === null || v === undefined || v === '') return null
  if (kind === 'number') { const n = Number(v); return Number.isFinite(n) ? n : null }
  if (kind === 'bool') return !!v
  if (kind === 'date') return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? `${String(v).slice(0, 10)}T12:00:00Z` : null
  if (kind === 'datetime') { const d = new Date(String(v)); return isNaN(+d) ? null : d.toISOString() }
  if (kind === 'note') return logical === 'AppData' ? String(v) : String(v).slice(0, 60000)
  return String(v).slice(0, 255)
}

/** Converts logical values ({ Title, AppId, AppData, Targy, ... }) to SharePoint fields of the list, skipping columns that don't exist. */
export function toFields(key: ListKey, data: Record<string, unknown> = {}) {
  const info = infoNow[key]
  const out: Record<string, unknown> = {}
  if (typeof data.Title === 'string') out.Title = data.Title.slice(0, 255)
  if (!info) return out
  for (const [logical, v] of Object.entries(data)) {
    const a = info.cols[logical]
    if (logical === 'Title' || !a || a.kind === 'other') continue
    out[a.name] = coerce(a.kind, v, logical)
  }
  return out
}
/** Just the essentials, used to retry a write that a hand-made column rejected. */
export const minimalFields = (key: ListKey, data: Record<string, unknown>) => toFields(key, { Title: data.Title, AppId: data.AppId, AppData: data.AppData })

/** Parses the AppData JSON of a row (tolerates rich-text columns that wrap it in HTML). */
export function appData<T = any>(r: any): T | null {
  let s = r?.fields?.AppData
  if (typeof s !== 'string' || !s) return null
  if (s.trimStart().startsWith('<')) s = s.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  try { return JSON.parse(s) } catch { return null }
}

export const itemsPath = (listId: string) => `${site()}/lists/${listId}/items`

export async function loadRows(listId: string): Promise<any[]> {
  const rows = await pages(`${itemsPath(listId)}?expand=fields&$top=999`)
  const info = infoNow[keyOfId.get(listId) || '']
  if (info) for (const r of rows) {
    const f = r.fields || {}
    for (const [internal, logical] of Object.entries(info.byInternal)) if (internal !== logical && internal in f) f[logical] = f[internal]
  }
  return rows
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
