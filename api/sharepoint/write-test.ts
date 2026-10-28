// Write test: creates one item in the "Projektek" list and reads it back.
// Only writes when called with ?run=1. Never returns the secret or the access token.

const GRAPH = 'https://graph.microsoft.com/v1.0'

async function token() {
  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env
  const res = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: MS_CLIENT_ID!, client_secret: MS_CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.access_token) throw new Error(`token: ${j.error || res.status} ${String(j.error_description || '').split('\r\n')[0]}`)
  return j.access_token as string
}

async function graph(tok: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GRAPH}${path}`, { ...init, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

const err = (r: { status: number; body: any }) => ({ status: r.status, error: r.body?.error?.code, message: r.body?.error?.message })

export async function GET(request: Request) {
  const run = new URL(request.url).searchParams.get('run') === '1'
  const out: Record<string, unknown> = { wrote: false }
  const reply = (status = 200) => Response.json(out, { status, headers: { 'Cache-Control': 'no-store' } })
  try {
    const tok = await token()
    const site = encodeURIComponent(process.env.SP_SITE_ID!)

    const lists = await graph(tok, `/sites/${site}/lists?$select=id,displayName`)
    if (!lists.ok) { out.lists = err(lists); return reply() }
    const list = lists.body.value.find((l: any) => l.displayName === 'Projektek')
    if (!list) { out.error = 'Projektek list not found'; out.available = lists.body.value.map((l: any) => l.displayName); return reply() }
    out.list = { id: list.id, displayName: list.displayName }

    const cols = await graph(tok, `/sites/${site}/lists/${list.id}/columns?$select=name,displayName,readOnly,hidden,dateTime,text`)
    if (!cols.ok) { out.columns = err(cols); return reply() }
    const editable = cols.body.value.filter((c: any) => !c.readOnly && !c.hidden)
    const dateCol = editable.find((c: any) => c.dateTime)
    out.columns = editable.map((c: any) => `${c.displayName} [${c.name}]${c.dateTime ? ' (date)' : c.text ? ' (text)' : ''}`)
    out.dateColumn = dateCol ? dateCol.name : null

    if (!run) { out.note = 'Dry run. Add ?run=1 to create a test item.'; return reply() }

    const now = new Date()
    const fields: Record<string, string> = { Title: `Claude írási teszt – ${now.toISOString().replace('T', ' ').slice(0, 19)} UTC` }
    if (dateCol) fields[dateCol.name] = `${now.toISOString().slice(0, 10)}T00:00:00Z`

    const created = await graph(tok, `/sites/${site}/lists/${list.id}/items`, { method: 'POST', body: JSON.stringify({ fields }) })
    if (!created.ok) { out.create = err(created); return reply() }
    out.wrote = true

    const back = await graph(tok, `/sites/${site}/lists/${list.id}/items/${created.body.id}?$expand=fields`)
    out.readBack = back.ok
      ? { id: back.body.id, webUrl: back.body.webUrl, title: back.body.fields?.Title, date: dateCol ? back.body.fields?.[dateCol.name] : undefined, created: back.body.createdDateTime }
      : err(back)
    return reply()
  } catch (e) {
    out.error = (e as Error).message
    return reply()
  }
}
