import { upsertOnLogin } from '../_lib/people.js'
import { OAUTH_COOKIE, appOrigin, cookie, cookies, htmlPage, newSessionCookie, unsign } from '../_lib/session.js'

const fail = (msg: string) => htmlPage('Bejelentkezés sikertelen', `<h1>Bejelentkezés sikertelen</h1><p>${msg}</p><a class="b" href="/api/auth/login">Újrapróbálás</a>`, 400, { 'Set-Cookie': cookie(OAUTH_COOKIE, '', 0) })
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export async function GET(request: Request) {
  const url = new URL(request.url)
  const err = url.searchParams.get('error')
  if (err) return fail(esc(`${err}: ${(url.searchParams.get('error_description') || '').split('\r\n')[0]}`))
  const st = unsign<{ s: string; n: string; r: string }>(cookies(request)[OAUTH_COOKIE])
  if (!st || st.s !== url.searchParams.get('state')) return fail('A bejelentkezési kérés lejárt vagy érvénytelen. Kérjük, kezdje újra.')
  const code = url.searchParams.get('code')
  if (!code) return fail('Hiányzó engedélyezési kód.')

  const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env
  const res = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: MS_CLIENT_ID || '', client_secret: MS_CLIENT_SECRET || '', grant_type: 'authorization_code', code, redirect_uri: `${appOrigin()}/api/auth/callback`, scope: 'openid profile email' }),
  })
  const tok: any = await res.json().catch(() => ({}))
  if (!res.ok || !tok.id_token) return fail(esc(`Token hiba: ${String(tok.error_description || tok.error || res.status).split('\r\n')[0]}`))

  // The ID token comes straight from the token endpoint over TLS with client authentication.
  let c: any
  try { c = JSON.parse(Buffer.from(String(tok.id_token).split('.')[1], 'base64url').toString('utf8')) } catch { return fail('Érvénytelen azonosító token.') }
  if (c.aud !== MS_CLIENT_ID || c.tid !== MS_TENANT_ID || c.nonce !== st.n || (c.exp && c.exp * 1000 < Date.now())) return fail('A token ellenőrzése nem sikerült.')
  if (c.idp && !String(c.idp).includes(String(MS_TENANT_ID))) return fail('Vendégfiókkal nem lehet belépni. Kérjük, a Fonte Viva-s fiókját válassza.')
  const email = String(c.email || c.preferred_username || '').toLowerCase()
  if (!email) return fail('A fiókhoz nem tartozik e-mail cím.')
  const me = { email, name: String(c.name || email), oid: String(c.oid || '') }

  try { const p = await upsertOnLogin(me); if (!p.active) return fail('A fiókod hozzáférése le van tiltva. Fordulj az alkalmazás adminisztrátorához.') }
  catch (e) { console.error('people upsert failed', e) }
  const headers = new Headers({ Location: `${appOrigin()}${st.r || '/'}`, 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', newSessionCookie(me))
  headers.append('Set-Cookie', cookie(OAUTH_COOKIE, '', 0))
  return new Response(null, { status: 302, headers })
}
