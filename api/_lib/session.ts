import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'bsz_session'
export const OAUTH_COOKIE = 'bsz_oauth'
export const SESSION_HOURS = 10

export type SessionUser = { email: string; name: string; oid: string }

function key(): Buffer {
  const explicit = process.env.SESSION_SECRET
  if (explicit) return createHash('sha256').update(explicit).digest()
  const base = process.env.MS_CLIENT_SECRET
  if (!base) throw new Error('No SESSION_SECRET or MS_CLIENT_SECRET configured')
  return createHash('sha256').update('bsz-session-v1|' + base).digest()
}

export function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = createHmac('sha256', key()).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function unsign<T = any>(token: string | undefined): T | null {
  if (!token) return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expect = createHmac('sha256', key()).update(body).digest()
  const got = Buffer.from(mac, 'base64url')
  if (got.length !== expect.length || !timingSafeEqual(got, expect)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof p.x !== 'number' || p.x < Date.now()) return null
    return p as T
  } catch {
    return null
  }
}

export const randomId = (n = 24) => randomBytes(n).toString('base64url')

export function cookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function cookie(name: string, value: string, maxAgeSec: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`
}

export function sessionFromRequest(req: Request): SessionUser | null {
  const p = unsign<{ e: string; n: string; o: string; x: number }>(cookies(req)[SESSION_COOKIE])
  return p ? { email: p.e, name: p.n, oid: p.o } : null
}

export function newSessionCookie(u: SessionUser): string {
  return cookie(SESSION_COOKIE, sign({ e: u.email, n: u.name, o: u.oid, x: Date.now() + SESSION_HOURS * 3600_000 }), SESSION_HOURS * 3600)
}

export const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } })

export const unauthorized = () => json({ error: 'unauthorized', login: '/api/auth/login' }, 401)

export const appOrigin = () => (process.env.APP_ORIGIN || 'https://beszerzes.vercel.app').replace(/\/$/, '')

export function htmlPage(title: string, bodyHtml: string, status = 200, headers: Record<string, string> = {}) {
  const page = `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fafafa;color:#171717;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.c{max-width:26rem;padding:2rem;border:1px solid #e5e5e5;border-radius:12px;background:#fff;text-align:center}
h1{font-size:1.25rem;margin:.75rem 0 .5rem}p{color:#525252;margin:0 0 1.25rem}
a.b{display:inline-block;background:#171717;color:#fff;text-decoration:none;padding:.55rem 1rem;border-radius:8px;font-weight:600}
.l{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#171717;color:#fff;font-weight:800}</style></head>
<body><div class="c"><span class="l">F</span>${bodyHtml}</div></body></html>`
  return new Response(page, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers } })
}
