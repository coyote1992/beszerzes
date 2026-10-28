// Diagnostic endpoint: verifies the Microsoft Entra app credentials and SharePoint site access.
// Uses the client-credentials flow; never returns the secret or the access token.

type Step = { step: string; ok: boolean; detail?: unknown }

const GRAPH = 'https://graph.microsoft.com/v1.0'

function decodeRoles(token: string): string[] {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return Array.isArray(payload.roles) ? payload.roles : []
  } catch {
    return []
  }
}

async function graph(token: string, path: string) {
  const res = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

export async function GET() {
  const steps: Step[] = []
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, SP_SITE_ID } = process.env
  const done = (status = 200) => Response.json({ ok: steps.every((s) => s.ok), steps }, { status, headers: { 'Cache-Control': 'no-store' } })

  const missing = Object.entries({ MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, SP_SITE_ID }).filter(([, v]) => !v).map(([k]) => k)
  steps.push({ step: 'env', ok: missing.length === 0, detail: missing.length ? { missing } : 'all four variables present' })
  if (missing.length) return done()

  // 1. token
  const tokenRes = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: MS_CLIENT_ID!, client_secret: MS_CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
  })
  const tok = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tok.access_token) {
    steps.push({ step: 'token', ok: false, detail: { status: tokenRes.status, error: tok.error, description: String(tok.error_description || '').split('\r\n')[0] } })
    return done()
  }
  const roles = decodeRoles(tok.access_token)
  steps.push({ step: 'token', ok: true, detail: { applicationPermissions: roles } })

  // 2. site
  const site = await graph(tok.access_token, `/sites/${encodeURIComponent(SP_SITE_ID!)}?$select=id,displayName,webUrl`)
  steps.push({ step: 'site', ok: site.ok, detail: site.ok ? site.body : { status: site.status, error: site.body?.error?.code, message: site.body?.error?.message } })
  if (!site.ok) return done()
  const siteId = site.body.id

  // 3. document libraries and lists
  const drives = await graph(tok.access_token, `/sites/${siteId}/drives?$select=name,webUrl`)
  steps.push({ step: 'documentLibraries', ok: drives.ok, detail: drives.ok ? drives.body.value?.map((d: any) => d.name) : { status: drives.status, error: drives.body?.error?.code } })
  const lists = await graph(tok.access_token, `/sites/${siteId}/lists?$select=displayName,list`)
  steps.push({ step: 'lists', ok: lists.ok, detail: lists.ok ? lists.body.value?.filter((l: any) => !l.list?.hidden).map((l: any) => `${l.displayName} (${l.list?.template})`) : { status: lists.status, error: lists.body?.error?.code } })

  return done()
}
