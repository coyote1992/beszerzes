// Permanently deletes a TEST procurement (TESZT-…) with all its records, test audit entries and its folder.
import { batch } from '../_lib/graph.js'
import { requireUser } from '../_lib/people.js'
import { appData, checkPath, deleteFolder, itemsPath, lists, loadRows, TEST_FOLDER } from '../_lib/schema.js'
import { json } from '../_lib/session.js'

const pidOf = (r: any) => { if (r.fields?.Beszerzes) return r.fields.Beszerzes; const d = appData(r); return d?.pid ?? d?.proc }

export async function POST(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  const { me, acc } = u
  const { pid } = await request.json().catch(() => ({} as any))
  if (typeof pid !== 'string' || !pid.startsWith('TESZT')) return json({ error: 'not_test' }, 400)
  const ids = await lists()
  const procRow = (await loadRows(ids.proc)).find((r: any) => r.fields?.AppId === pid)
  if (!procRow) return json({ error: 'not_found' }, 404)
  const data: any = appData(procRow) || {}
  if (!acc.admin && data.createdBy !== me.email) return json({ error: 'forbidden', message: 'Csak a létrehozó vagy adminisztrátor törölheti.' }, 403)

  const reqs: { id: string; method: string; url: string }[] = [{ id: 'proc', method: 'DELETE', url: `${itemsPath(ids.proc)}/${procRow.id}` }]
  for (const k of ['bidder', 'appr', 'task', 'doc', 'auditTest']) {
    for (const r of await loadRows(ids[k])) if (pidOf(r) === pid) reqs.push({ id: `${k}-${r.id}`, method: 'DELETE', url: `${itemsPath(ids[k])}/${r.id}` })
  }
  const res = await batch(reqs)
  const failed = [...res.values()].filter((r) => r.status >= 300 && r.status !== 404).length
  const path = checkPath(data.folder || '')
  if (path && path.startsWith(TEST_FOLDER + '/')) await deleteFolder(path).catch(() => undefined)
  return json({ ok: failed === 0, deleted: reqs.length - failed, failed })
}
