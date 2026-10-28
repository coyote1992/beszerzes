// Small file upload (≤ 3.5 MB) proxied through the function.
import { drive, encPath, graph } from '../_lib/graph.js'
import { checkPath, safeName } from '../_lib/schema.js'
import { requireUser } from '../_lib/people.js'
import { json } from '../_lib/session.js'

export const MAX = 3.5 * 1024 * 1024

export async function POST(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  const url = new URL(request.url)
  const path = checkPath(url.searchParams.get('path') || '')
  const name = safeName(url.searchParams.get('name') || '')
  if (!path) return json({ error: 'bad_path' }, 400)
  const buf = new Uint8Array(await request.arrayBuffer())
  if (buf.byteLength > MAX) return json({ error: 'too_large' }, 413)
  const d = await drive()
  const r = await graph(`/drives/${d}/root:/${encPath(path)}/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: buf })
  if (!r.ok) return json({ error: 'upload_failed', message: r.body?.error?.message || r.status }, 502)
  return json({ name: r.body.name, webUrl: r.body.webUrl, size: r.body.size })
}
