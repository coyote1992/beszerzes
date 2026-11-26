// POST /api/login/code { email } — e-mails a sign-in code to a person on the "Login" list. Reachable while signed out.
// The answer is the same whether or not the address is listed, so it cannot be used to find out who has access.
import { allowedPerson, isInternalAddress } from '../_lib/login-allowlist.js'
import { CODE_TTL_SECONDS, issueCode, mayRequestCode, normalizeEmail } from '../_lib/login-codes.js'
import { sendLoginCode } from '../_lib/mail.js'
import { json, sameOrigin } from '../_lib/session.js'

export async function POST(request: Request) {
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
