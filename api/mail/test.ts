// Admin check of the notification e-mail setup: sends a test message to the caller's own address.
import { render, sendMails, SENDER } from '../_lib/mail.js'
import { requireUser } from '../_lib/people.js'
import { json } from '../_lib/session.js'

export async function POST(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  if (!u.acc.admin) return json({ error: 'forbidden', message: 'Csak adminisztrátor küldhet teszt e-mailt.' }, 403)
  const mail = render({ kind: 'task', to: u.me.email, title: 'Teszt értesítés – az e-mail-küldés működik', details: [['Feladó', SENDER()], ['Címzett', u.me.email]], open: { view: 'settings' } }, u.acc.people)
  if (!mail) return json({ ok: false, message: 'A fiókod nem aktív munkatárs a Munkatársak listában.' }, 400)
  const r = await sendMails([mail])
  if (r.sent) return json({ ok: true, from: SENDER(), to: u.me.email })
  const err = r.failed[0]?.error || 'ismeretlen hiba'
  const hint = /access|denied|forbidden|authoriz/i.test(err) ? ' Valószínűleg még hiányzik az Exchange-jogosultság (Mail.Send a noreply@ postafiókra).' : ''
  return json({ ok: false, message: `Nem sikerült elküldeni: ${err}.${hint}` }, 502)
}
