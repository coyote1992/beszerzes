// File endpoints behind /api/files/[action] (one Vercel function: the Hobby plan allows 12 per deployment).
import { drive, encPath, graph } from './graph.js'
import { requireUser } from './people.js'
import { checkPath, safeName } from './schema.js'
import { htmlPage, json } from './session.js'

export const MAX = 3.5 * 1024 * 1024

/** Small file upload (≤ 3.5 MB) proxied through the function. */
export async function upload(request: Request) {
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

/** Large files: creates a Graph upload session; the browser uploads chunks directly to SharePoint. */
export async function uploadSession(request: Request) {
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

/** Opens a document through the app: for partners signed in with an e-mail code, who cannot open SharePoint links.
 *  Redirects to Graph's short-lived, pre-authenticated download URL of the file. */
export async function download(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  const url = new URL(request.url)
  const path = checkPath(url.searchParams.get('path') || '')
  const name = url.searchParams.get('name') || ''
  const missing = () => htmlPage('A fájl nem található', '<h1>A fájl nem található</h1><p>Lehet, hogy a SharePointban áthelyezték vagy átnevezték. Szólj a beszerzés felelősének.</p>', 404)
  if (!path || !name || /[\\/\u0000-\u001f]/.test(name) || name === '..') return missing()
  const r = await graph(`/drives/${await drive()}/root:/${encPath(path)}/${encodeURIComponent(name)}`)
  const dl = r.ok ? r.body?.['@microsoft.graph.downloadUrl'] : null
  if (!dl) { if (r.status !== 404) console.error('download failed', r.status, r.body?.error?.message); return missing() }
  return new Response(null, { status: 302, headers: { Location: dl, 'Cache-Control': 'no-store' } })
}
