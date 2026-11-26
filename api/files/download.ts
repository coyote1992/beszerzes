// Opens a document through the app: for partners signed in with an e-mail code, who cannot open SharePoint links.
// Redirects to Graph's short-lived, pre-authenticated download URL of the file.
import { drive, encPath, graph } from '../_lib/graph.js'
import { requireUser } from '../_lib/people.js'
import { checkPath } from '../_lib/schema.js'
import { htmlPage } from '../_lib/session.js'

export async function GET(request: Request) {
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
