// One function for /api/files/upload, /api/files/session and /api/files/download (Hobby plan: max. 12 functions).
import { download, upload, uploadSession } from '../_lib/files.js'
import { json } from '../_lib/session.js'

// Vercel passes the matched segment as ?action=…; the path's last segment is the fallback.
const action = (r: Request) => { const u = new URL(r.url); return u.searchParams.get('action') || u.pathname.split('/').filter(Boolean).pop() }

export async function POST(request: Request) {
  const a = action(request)
  if (a === 'upload') return upload(request)
  if (a === 'session') return uploadSession(request)
  return json({ error: 'not_found' }, 404)
}

export async function GET(request: Request) {
  return action(request) === 'download' ? download(request) : json({ error: 'not_found' }, 404)
}
