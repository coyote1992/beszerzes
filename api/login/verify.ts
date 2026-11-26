// POST /api/login/verify { email, code, returnTo } — signs in an outside partner with the code from the e-mail.
// Same session cookie and length as a Microsoft sign-in; the session ends once the person leaves the Login list.
import { allowedPerson, isInternalAddress } from '../_lib/login-allowlist.js'
import { checkCode, normalizeEmail } from '../_lib/login-codes.js'
import { upsertOnLogin } from '../_lib/people.js'
import { json, newSessionCookie, safeReturn, sameOrigin, type SessionUser } from '../_lib/session.js'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'failed' }, 403)
  const body: any = await request.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  if (!email || isInternalAddress(email)) return json({ error: 'invalid' }, 400)
  try {
    const result = await checkCode(email, String(body?.code ?? ''))
    if (result !== 'ok') { console.info(`Login code ${result} for ${email}`); return json({ error: result }, 400) }
    // Taken off the list while the code was on its way.
    const person = await allowedPerson(email)
    if (!person) return json({ error: 'expired' }, 400)
    const me: SessionUser = { email, name: person.name, oid: '', method: 'code' }
    try { if (!(await upsertOnLogin(me)).active) return json({ error: 'blocked' }, 403) }
    catch (e) { console.error('people upsert failed', e) }
    console.info(`Signed in with an email code: ${email}`)
    return json({ ok: true, redirect: safeReturn(body?.returnTo) }, 200, { 'Set-Cookie': newSessionCookie(me) })
  } catch (e) {
    console.error('Email-code sign-in failed:', e)
    return json({ error: 'failed' }, 500)
  }
}
