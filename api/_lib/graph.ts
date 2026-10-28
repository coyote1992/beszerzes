// Microsoft Graph client (app-only, client-credentials). Server-side only.
const GRAPH = 'https://graph.microsoft.com/v1.0'

let cached: { token: string; exp: number } | null = null

export class GraphError extends Error {
  status: number
  code?: string
  constructor(status: number, code: string | undefined, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function appToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env
  if (!MS_TENANT_ID || !MS_CLIENT_ID || !MS_CLIENT_SECRET) throw new GraphError(500, 'config', 'Missing MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET')
  const res = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: MS_CLIENT_ID, client_secret: MS_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
  })
  const j: any = await res.json().catch(() => ({}))
  if (!res.ok || !j.access_token) throw new GraphError(502, j.error, `Token request failed: ${String(j.error_description || res.status).split('\r\n')[0]}`)
  cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 }
  return cached.token
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Raw Graph call with retry on throttling / transient errors. `path` is relative to v1.0 or an absolute URL. */
export async function graph(path: string, init: RequestInit & { raw?: boolean } = {}) {
  const url = path.startsWith('http') ? path : `${GRAPH}${path}`
  for (let attempt = 0; ; attempt++) {
    const token = await appToken()
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string>) }
    if (init.body && !(init.body instanceof ArrayBuffer) && !(init.body instanceof Uint8Array) && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, { ...init, headers })
    if ((res.status === 429 || res.status === 503 || res.status === 504) && attempt < 4) {
      const ra = Number(res.headers.get('Retry-After'))
      await sleep(ra > 0 ? Math.min(ra, 10) * 1000 : 500 * 2 ** attempt)
      continue
    }
    const text = await res.text()
    let body: any = null
    try { body = text ? JSON.parse(text) : null } catch { body = text }
    return { ok: res.ok, status: res.status, body, headers: res.headers }
  }
}

/** Graph call that throws GraphError on failure. */
export async function gj(path: string, init: RequestInit = {}) {
  const r = await graph(path, init)
  if (!r.ok) throw new GraphError(r.status, r.body?.error?.code, r.body?.error?.message || `Graph ${r.status} ${path}`)
  return r.body
}

/** Follows @odata.nextLink and returns all `value` entries. */
export async function pages(path: string): Promise<any[]> {
  const out: any[] = []
  let next: string | null = path
  while (next) {
    const body: any = await gj(next)
    out.push(...(body.value || []))
    next = body['@odata.nextLink'] || null
  }
  return out
}

export type BatchReq = { id: string; method: string; url: string; body?: unknown; headers?: Record<string, string> }
export type BatchRes = { id: string; status: number; body: any }

/** JSON batching, 20 requests per call, retries throttled sub-requests. */
export async function batch(reqs: BatchReq[]): Promise<Map<string, BatchRes>> {
  const out = new Map<string, BatchRes>()
  let pending = reqs
  for (let attempt = 0; pending.length && attempt < 5; attempt++) {
    const retry: BatchReq[] = []
    for (let i = 0; i < pending.length; i += 20) {
      const chunk = pending.slice(i, i + 20)
      const body = await gj('/$batch', {
        method: 'POST',
        body: JSON.stringify({ requests: chunk.map((r) => ({ id: r.id, method: r.method, url: r.url, body: r.body, headers: r.body ? { 'Content-Type': 'application/json', ...r.headers } : r.headers })) }),
      })
      for (const r of body.responses || []) {
        if (r.status === 429 || r.status === 503) retry.push(chunk.find((c) => c.id === r.id)!)
        else out.set(r.id, { id: r.id, status: r.status, body: r.body })
      }
    }
    pending = retry
    if (pending.length) await sleep(800 * (attempt + 1))
  }
  for (const r of pending) out.set(r.id, { id: r.id, status: 429, body: { error: { code: 'throttled', message: 'Throttled' } } })
  return out
}

export const site = () => {
  const id = process.env.SP_SITE_ID
  if (!id) throw new GraphError(500, 'config', 'Missing SP_SITE_ID')
  return `/sites/${id}`
}

let driveId: string | null = null
export async function drive(): Promise<string> {
  if (driveId) return driveId
  const d = await gj(`${site()}/drive?$select=id`)
  driveId = d.id as string
  return driveId
}

/** Encodes a drive path segment-by-segment. */
export const encPath = (p: string) => p.split('/').filter(Boolean).map(encodeURIComponent).join('/')
