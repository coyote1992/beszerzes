import { appendAudit, type AuditIn } from './_lib/audit.js'
import { batch, drive, encPath, graph } from './_lib/graph.js'
import { access } from './_lib/people.js'
import { checkPath, createProcFolders, itemsPath, lists, minimalFields, safeName, toFields, type ListKey } from './_lib/schema.js'
import { json, sessionFromRequest, unauthorized } from './_lib/session.js'

type Op = { t: ListKey; key: string; sp?: string; data?: any; view?: Record<string, unknown>; del?: boolean }
const ENTITY: ListKey[] = ['proc', 'bidder', 'appr', 'task', 'doc', 'person', 'setting']

export async function POST(request: Request) {
  const me = sessionFromRequest(request)
  if (!me) return unauthorized()
  let body: { ops?: Op[]; audit?: AuditIn[] }
  try { body = await request.json() } catch { return json({ error: 'bad_json' }, 400) }
  const ops = (body.ops || []).filter((o) => ENTITY.includes(o.t) && typeof o.key === 'string' && o.key)
  const errors: { k: string; message: string }[] = []
  const sp: Record<string, string> = {}
  const patch: Record<string, Record<string, unknown>> = {}
  try {
    const ids = await lists()
    const acc = await access(me)
    if (acc.blocked) return json({ error: 'blocked' }, 403)

    const allowed = ops.filter((o) => {
      const k = `${o.t}:${o.key}`
      if ((o.t === 'person' || o.t === 'setting') && !acc.admin) { errors.push({ k, message: 'Csak adminisztrátor módosíthatja.' }); return false }
      if (o.t === 'setting' && o.key === 'auditHead') { errors.push({ k, message: 'Védett beállítás.' }); return false }
      if (o.del && (o.t === 'proc' || o.t === 'appr' || o.t === 'doc' || o.t === 'person' || o.t === 'setting')) { errors.push({ k, message: 'Ez a rekordtípus nem törölhető.' }); return false }
      if (o.del && !o.sp) return false
      return true
    })

    // Side effects that must happen before the list write: folders for new procurements, HTML files for generated documents.
    const d = await drive()
    for (const o of allowed) {
      const k = `${o.t}:${o.key}`
      if (o.t === 'proc' && !o.sp && o.data?.folder) {
        const path = checkPath(o.data.folder)
        if (path) {
          try { const url = await createProcFolders(path); if (url) { o.data.folderUrl = url; o.view = { ...o.view, Mappa: url }; patch[k] = { ...patch[k], folderUrl: url } } }
          catch (e) { errors.push({ k, message: `Mappa létrehozása sikertelen: ${(e as Error).message}` }) }
        }
      }
      if (o.t === 'doc' && o.data?.content && !o.data.url && o.data.path) {
        const path = checkPath(o.data.path)
        if (path) {
          const name = safeName(String(o.data.name || 'dokumentum').replace(/\.[a-z0-9]+$/i, '')) + '.html'
          const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${name}</title><style>body{font:14px/1.5 system-ui,sans-serif;max-width:56rem;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:.35rem .5rem;text-align:left}</style></head><body>${o.data.content}</body></html>`
          const r = await graph(`/drives/${d}/root:/${encPath(path)}/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: 'PUT', headers: { 'Content-Type': 'text/html' }, body: new TextEncoder().encode(html) })
          if (r.ok) { o.data.url = r.body.webUrl; o.data.name = r.body.name; o.view = { ...o.view, Fajl: r.body.webUrl, Title: r.body.name }; patch[k] = { ...patch[k], url: r.body.webUrl, name: r.body.name } }
          else errors.push({ k, message: `Fájl mentése sikertelen: ${r.body?.error?.message || r.status}` })
        }
      }
    }

    const logical = (o: Op) => ({ ...(o.view || {}), AppId: o.key, AppData: JSON.stringify({ ...o.data, _sp: undefined }) })
    const req = (o: Op, i: number, fields: Record<string, unknown>) => {
      const listId = ids[o.t]
      if (o.del) return { id: String(i), method: 'DELETE', url: `${itemsPath(listId)}/${o.sp}` }
      if (o.sp) return { id: String(i), method: 'PATCH', url: `${itemsPath(listId)}/${o.sp}/fields`, body: fields }
      return { id: String(i), method: 'POST', url: itemsPath(listId), body: { fields } }
    }
    const res = await batch(allowed.map((o, i) => req(o, i, toFields(o.t, logical(o)))))
    // A hand-made column with an unexpected setting can reject a value: retry those rows with the essentials only.
    const retry = allowed.map((o, i) => [o, i] as const).filter(([o, i]) => !o.del && res.get(String(i))?.status === 400)
    if (retry.length) {
      const again = await batch(retry.map(([o, i]) => req(o, i, minimalFields(o.t, logical(o)))))
      for (const [k, v] of again) { if (v.status < 300) console.warn('row saved without readable columns', k, res.get(k)?.body?.error?.message); res.set(k, v) }
    }
    allowed.forEach((o, i) => {
      const r = res.get(String(i)), k = `${o.t}:${o.key}`
      if (!r || r.status >= 300) { if (!(o.del && r?.status === 404)) errors.push({ k, message: r?.body?.error?.message || `HTTP ${r?.status}` }); return }
      if (!o.sp && !o.del) sp[k] = r.body.id
    })

    const audit = await appendAudit(me, (body.audit || []).slice(0, 200))
    return json({ sp, patch, errors, audit })
  } catch (e) {
    console.error(e)
    return json({ error: 'server', message: (e as Error).message, sp, patch, errors }, 500)
  }
}
