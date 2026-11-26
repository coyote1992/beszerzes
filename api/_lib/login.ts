// E-mail-code sign-in for outside partners, behind /api/login/[step] (one Vercel function).
import { allowedPerson, isInternalAddress } from './login-allowlist.js'
import { CODE_TTL_SECONDS, checkCode, issueCode, mayRequestCode, normalizeEmail } from './login-codes.js'
import { sendLoginCode } from './mail.js'
import { upsertOnLogin } from './people.js'
import { json, newSessionCookie, safeReturn, sameOrigin, type SessionUser } from './session.js'

/** POST /api/login/code { email } — e-mails a sign-in code to a person on the "Login" list. Reachable while signed out.
 *  The answer is the same whether or not the address is listed, so it cannot be used to find out who has access. */
export async function requestCode(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Érvénytelen kérés.' }, 403)
  const body: any = await request.json().catch(() => ({}))
  const email = normalizeEmail(body?.email)
  if (!email) return json({ error: 'Adj meg egy érvényes e-mail-címet.' }, 400)
  if (isInternalAddress(email)) return json({ error: 'Fonte Viva-fiókkal a „Bejelentkezés Microsoft-fiókkal” gombbal lépj be.' }, 400)
  try {
    // On Vercel the first x-forwarded-for entry is set by the platform.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!(await mayRequestCode(email, ip))) return json({ error: 'Túl sok kódot kértél. Várj negyedórát, és próbáld újra.' }, 429)
    if (await allowedPerson(email)) {
      await sendLoginCode(email, await issueCode(email), Math.round(CODE_TTL_SECONDS / 60))
      console.info(`Login code sent to ${email}`)
    } else {
      console.info(`Login code refused: ${email} is not on the Login list`)
    }
    return json({ ok: true })
  } catch (e) {
    console.error('Login code request failed:', e)
    return json({ error: 'Most nem sikerült kódot küldeni. Próbáld újra pár perc múlva.' }, 500)
  }
}

/** POST /api/login/verify { email, code, returnTo } — signs in an outside partner with the code from the e-mail.
 *  Same session cookie and length as a Microsoft sign-in; the session ends once the person leaves the Login list. */
export async function verifyCode(request: Request) {
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
