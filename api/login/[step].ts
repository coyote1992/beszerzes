// One function for /api/login/code and /api/login/verify (Hobby plan: max. 12 functions).
import { requestCode, verifyCode } from '../_lib/login.js'
import { json } from '../_lib/session.js'

export async function POST(request: Request) {
  // Vercel passes the matched segment as ?step=…; the path's last segment is the fallback.
  const u = new URL(request.url)
  const step = u.searchParams.get('step') || u.pathname.split('/').filter(Boolean).pop()
  if (step === 'code') return requestCode(request)
  if (step === 'verify') return verifyCode(request)
  return json({ error: 'not_found' }, 404)
}
