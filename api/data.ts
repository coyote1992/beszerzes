import { rowToAudit } from './_lib/audit.js'
import { access, rowToPerson } from './_lib/people.js'
import { appData, lists, loadRows } from './_lib/schema.js'
import { json, sessionFromRequest, unauthorized } from './_lib/session.js'

const parse = (r: any) => { const d = appData(r); return d ? { ...d, _sp: r.id } : null }

export async function GET(request: Request) {
  const me = sessionFromRequest(request)
  if (!me) return unauthorized()
  try {
    const ids = await lists()
    const [procs, bidders, apprs, tasks, docs, people, settings, audit, auditTest] = await Promise.all(
      ['proc', 'bidder', 'appr', 'task', 'doc', 'person', 'setting', 'audit', 'auditTest'].map((k) => loadRows(ids[k])))
    const acc = await access(me)
    if (acc.blocked) return json({ error: 'blocked' }, 403)
    const set: Record<string, unknown> = {}
    for (const r of settings) { const id = r.fields?.AppId; if (id && id !== 'auditHead') { const v = appData(r); if (v) set[id] = { value: v, _sp: r.id } } }
    return json({
      me: { ...me, admin: acc.admin },
      procs: procs.map(parse).filter(Boolean),
      bidders: bidders.map(parse).filter(Boolean),
      apprs: apprs.map(parse).filter(Boolean),
      tasks: tasks.map(parse).filter(Boolean),
      docs: docs.map(parse).filter(Boolean),
      people: people.map(rowToPerson).filter(Boolean),
      settings: set,
      audit: [...audit.map((r) => rowToAudit(r)), ...auditTest.map((r) => rowToAudit(r, true))].sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : (a.n ?? 0) - (b.n ?? 0))),
    })
  } catch (e) {
    console.error(e)
    return json({ error: 'server', message: (e as Error).message }, 500)
  }
}
