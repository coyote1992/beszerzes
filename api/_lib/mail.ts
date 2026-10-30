// Notification e-mails sent from the shared noreply@ mailbox through Microsoft Graph.
// The app may send only from that mailbox (Exchange RBAC for Applications) and only to people on the Munkatársak list.
// The server builds the message from structured fields, so a client cannot send arbitrary content or recipients.
import { batch } from './graph.js'
import { appOrigin } from './session.js'
import type { Person } from './people.js'

export const SENDER = () => process.env.MAIL_SENDER || 'noreply@fonteviva.hu'

export type Notice = {
  kind: 'approval' | 'task'
  to: string
  test?: boolean
  pid?: string
  procSubject?: string
  title: string
  details?: [string, string][]
  open?: { p?: string; tab?: string; view?: string }
}
export type Mail = { to: string; subject: string; html: string }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n)

function link(open: Notice['open'] = {}) {
  const q = new URLSearchParams()
  if (open.p) q.set('p', clip(open.p, 60))
  if (open.tab && /^[a-z]{2,8}$/.test(open.tab)) q.set('tab', open.tab)
  if (open.view && /^[a-z]{2,10}$/.test(open.view)) q.set('view', open.view)
  const s = q.toString()
  return `${appOrigin()}/${s ? '?' + s : ''}`
}

function layout(firstName: string, lead: string, rows: [string, string][], url: string, test: boolean) {
  const table = rows.length ? `<table style="border-collapse:collapse;margin:12px 0;font-size:14px">${rows.map(([k, v]) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#737373;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:3px 0;vertical-align:top">${esc(v)}</td></tr>`).join('')}</table>` : ''
  return `<!doctype html><html lang="hu"><body style="margin:0;padding:24px;background:#fafafa">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:10px;padding:24px;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.5;color:#171717">
${test ? '<p style="margin:0 0 12px;padding:6px 10px;background:#fef3c7;color:#92400e;border-radius:6px;font-size:13px">Teszt beszerzés – ezt az értesítést a teszt létrehozója kapja.</p>' : ''}
<p style="margin:0 0 8px">Szia ${esc(firstName)}!</p>
<p style="margin:0">${lead}</p>
${table}
<p style="margin:16px 0"><a href="${esc(url)}" style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:9px 16px;border-radius:7px;font-weight:600">Megnyitás a Beszerzési központban</a></p>
<p style="margin:16px 0 0;color:#a3a3a3;font-size:12px">Ezt az e-mailt a Fonte Viva Beszerzési központ küldte automatikusan. Kérjük, ne válaszolj rá.</p>
</div></body></html>`
}

/** Builds the e-mail for one notice; returns null if the recipient is not an active colleague. */
export function render(n: Notice, people: Person[]): Mail | null {
  const to = String(n.to || '').toLowerCase()
  const person = people.find((p) => p.email === to && p.active)
  if (!person) return null
  const firstName = person.name.trim().split(/\s+/).pop() || person.name
  const title = clip(n.title, 200), proc = clip(n.procSubject, 200), pid = clip(n.pid, 60)
  const rows = (n.details || []).slice(0, 10).map(([k, v]) => [clip(k, 40), clip(v, 400)] as [string, string])
  const test = !!n.test
  if (n.kind === 'approval') {
    const lead = test
      ? `A(z) <b>${esc(pid)}</b> „${esc(proc)}” teszt beszerzésben jóváhagyásra vár: <b>${esc(title)}</b>. Teszt módban a döntést te rögzítheted.`
      : `A(z) <b>${esc(pid)}</b> „${esc(proc)}” beszerzésben a következő lépés a te jóváhagyásod: <b>${esc(title)}</b>.`
    return { to, subject: `${test ? '[TESZT] ' : ''}Jóváhagyásra vár: ${title} – ${pid}`, html: layout(firstName, lead, rows, link(n.open), test) }
  }
  const lead = test
    ? `A(z) <b>${esc(pid)}</b> „${esc(proc)}” teszt beszerzésben új feladat jött létre: <b>${esc(title)}</b>.`
    : `Új feladatot kaptál: <b>${esc(title)}</b>.`
  return { to, subject: `${test ? '[TESZT] ' : ''}Új feladat: ${title}${pid ? ' – ' + pid : ''}`, html: layout(firstName, lead, rows, link(n.open), test) }
}

/** Sends the mails (JSON batch, 20 per request). Never throws; failures are returned and logged. */
export async function sendMails(mails: Mail[]): Promise<{ sent: number; failed: { to: string; error: string }[] }> {
  if (!mails.length) return { sent: 0, failed: [] }
  const from = SENDER()
  const reqs = mails.map((m, i) => ({
    id: String(i), method: 'POST', url: `/users/${encodeURIComponent(from)}/sendMail`,
    body: { message: { subject: m.subject, body: { contentType: 'HTML', content: m.html }, toRecipients: [{ emailAddress: { address: m.to } }] }, saveToSentItems: false },
  }))
  const failed: { to: string; error: string }[] = []
  try {
    const res = await batch(reqs)
    mails.forEach((m, i) => { const r = res.get(String(i)); if (!r || r.status >= 300) failed.push({ to: m.to, error: r?.body?.error?.message || `HTTP ${r?.status}` }) })
  } catch (e) {
    mails.forEach((m) => failed.push({ to: m.to, error: (e as Error).message }))
  }
  if (failed.length) console.error('mail send failed', JSON.stringify(failed.slice(0, 5)))
  return { sent: mails.length - failed.length, failed }
}
