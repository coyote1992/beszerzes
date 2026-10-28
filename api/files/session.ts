// Large files: creates a Graph upload session; the browser uploads chunks directly to SharePoint.
import { drive, encPath, graph } from '../_lib/graph.js'
import { checkPath, safeName } from '../_lib/schema.js'
import { requireUser } from '../_lib/people.js'
import { json } from '../_lib/session.js'

export async function POST(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  const b: any = await request.json().catch(() => ({}))
  const path = checkPath(b.path || '')
  if (!path) return json({ error: 'bad_path' }, 400)
  const d = await drive()
  const r = await graph(`/drives/${d}/root:/${encPath(path)}/${encodeURIComponent(safeName(b.name || ''))}:/createUploadSession`, { method: 'POST', body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'rename' } }) })
  if (!r.ok) return json({ error: 'session_failed', message: r.body?.error?.message || r.status }, 502)
  return json({ uploadUrl: r.body.uploadUrl })
}
