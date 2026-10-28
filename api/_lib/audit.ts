// Append-only audit log with a server-side SHA-256 hash chain.
// The chain head lives in the "Beállítások" list (AppId = auditHead) and is claimed with ETag concurrency.
import { createHash } from 'node:crypto'
import { batch, gj, graph } from './graph.js'
import { appData, itemsPath, lists, loadRows, minimalFields, toFields, type ListKey } from './schema.js'
import type { SessionUser } from './session.js'

export type AuditIn = { proc?: string; type: string; title: string; detail?: string }
export type AuditOut = { n: number | null; ts: string; iso: string; user: string; userName: string; proc: string; type: string; title: string; detail: string; prev: string; hash: string; test?: boolean }

export const isoNow = () => new Date().toISOString().slice(0, 19) + 'Z'
const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
export const localTs = (iso: string) => fmt.format(new Date(iso)).replace(',', '')

export const auditHash = (e: { prev: string; n: number | null; iso: string; user: string; proc: string; type: string; title: string; detail: string }) =>
  createHash('sha256').update([e.prev, e.n, e.iso, e.user, e.proc, e.type, e.title, e.detail].join('|')).digest('hex')

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const isTest = (proc?: string) => !!proc && proc.startsWith('TESZT')

function logical(e: AuditOut) {
  return { Title: e.title.slice(0, 255), Sorszam: e.n, Idopont: e.iso, Felhasznalo: e.userName, Email: e.user, Beszerzes: e.proc, EsemenyTipus: e.type, Reszletek: e.detail, ElozoHash: e.prev, Hash: e.hash, AppData: JSON.stringify(e) }
}

async function readHead(settingsId: string) {
  const rows = await loadRows(settingsId)
  let row = rows.find((r: any) => r.fields?.AppId === 'auditHead')
  if (!row) {
    await gj(itemsPath(settingsId), { method: 'POST', body: JSON.stringify({ fields: toFields('setting', { Title: 'auditHead', AppId: 'auditHead', AppData: JSON.stringify({ n: 0, hash: 'GENESIS' }) }) }) })
    row = (await loadRows(settingsId)).find((r: any) => r.fields?.AppId === 'auditHead')
  }
  return { id: row.id as string, etag: row['@odata.etag'] as string, head: (appData(row) || { n: 0, hash: 'GENESIS' }) as { n: number; hash: string } }
}

export async function appendAudit(me: SessionUser, events: AuditIn[]): Promise<AuditOut[]> {
  if (!events.length) return []
  const ids = await lists()
  const base = (e: AuditIn): AuditOut => ({ n: null, ts: '', iso: isoNow(), user: me.email, userName: me.name, proc: e.proc || '', type: String(e.type || '').slice(0, 60), title: String(e.title || '').slice(0, 255), detail: String(e.detail || ''), prev: '', hash: '' })

  const all = events.map((e) => (isTest(e.proc) ? { ...base(e), test: true } : base(e)))
  const tests = all.filter((e) => e.test)
  for (const t of tests) { t.ts = localTs(t.iso); t.hash = auditHash(t) }

  const main = all.filter((e) => !e.test)
  if (main.length) {
    for (let attempt = 0; ; attempt++) {
      const { id, etag, head } = await readHead(ids.setting)
      let prev = head.hash, n = head.n
      for (const e of main) { e.n = ++n; e.prev = prev; e.ts = localTs(e.iso); e.hash = auditHash(e); prev = e.hash }
      const claim = await graph(`${itemsPath(ids.setting)}/${id}/fields`, { method: 'PATCH', headers: { 'If-Match': etag }, body: JSON.stringify(toFields('setting', { AppData: JSON.stringify({ n, hash: prev }) })) })
      if (claim.ok) break
      if (claim.status !== 412 || attempt >= 6) throw new Error(`Audit head update failed: ${claim.body?.error?.message || claim.status}`)
      await sleep(150 + Math.random() * 300)
    }
  }

  const items: [string, ListKey, AuditOut][] = [...main.map((e, i) => [`m${i}`, 'audit', e] as [string, ListKey, AuditOut]), ...tests.map((e, i) => [`t${i}`, 'auditTest', e] as [string, ListKey, AuditOut])]
  const post = (id: string, k: ListKey, f: Record<string, unknown>) => ({ id, method: 'POST', url: itemsPath(ids[k]), body: { fields: f } })
  const res = await batch(items.map(([id, k, e]) => post(id, k, toFields(k, logical(e)))))
  const retry = items.filter(([id]) => res.get(id)?.status === 400)
  if (retry.length) for (const [id, r] of await batch(retry.map(([id, k, e]) => post(id, k, minimalFields(k, logical(e)))))) res.set(id, r)
  for (const [k, r] of res) if (r.status >= 300) console.error('audit write failed', k, r.status, r.body?.error?.message)
  return all
}

export function rowToAudit(r: any, test = false): AuditOut & { _sp: string } {
  const d = appData<AuditOut>(r)
  if (d) return { ...d, ts: d.iso ? localTs(d.iso) : d.ts, test, _sp: r.id }
  const f = r.fields || {}
  const iso = f.Idopont || r.createdDateTime
  return { _sp: r.id, n: f.Sorszam ?? null, iso, ts: iso ? localTs(iso) : '', user: f.Email || '', userName: f.Felhasznalo || '', proc: f.Beszerzes || '', type: f.EsemenyTipus || '', title: f.Title || '', detail: f.Reszletek || '', prev: f.ElozoHash || '', hash: f.Hash || '', test }
}

export async function verifyChain() {
  const ids = await lists()
  const rows = (await loadRows(ids.audit)).map((r) => rowToAudit(r)).sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
  let prev = 'GENESIS'
  for (const e of rows) {
    if (e.prev !== prev || auditHash(e) !== e.hash) return { ok: false, n: rows.length, at: e.n }
    prev = e.hash
  }
  const { head } = await readHead(ids.setting)
  if (head.n !== rows.length) return { ok: false, n: rows.length, at: rows.length + 1, missing: head.n - rows.length }
  return { ok: true, n: rows.length }
}
