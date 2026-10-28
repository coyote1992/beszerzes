import { gj } from './graph.js'
import { appData, itemsPath, lists, loadRows, toFields } from './schema.js'
import { json, sessionFromRequest, unauthorized, type SessionUser } from './session.js'

export type Person = { email: string; name: string; title: string; admin: boolean; active: boolean; _sp?: string }

export function rowToPerson(r: any): Person | null {
  const f = r.fields || {}
  const d: any = appData(r) || {}
  const email = String(d.email || f.Email || '').toLowerCase()
  if (!email) return null
  return { email, name: d.name || f.Title || email, title: d.title ?? f.Beosztas ?? '', admin: !!(d.admin ?? f.Admin), active: (d.active ?? f.Aktiv) !== false, _sp: r.id }
}

export async function loadPeople(): Promise<Person[]> {
  const ids = await lists()
  return (await loadRows(ids.person)).map(rowToPerson).filter(Boolean) as Person[]
}

/** On sign-in: register the user if new; the very first user becomes administrator. */
export async function upsertOnLogin(me: SessionUser): Promise<Person> {
  const ids = await lists()
  const people = await loadPeople()
  const found = people.find((p) => p.email === me.email.toLowerCase())
  if (found) return found
  const admin = !people.some((p) => p.admin)
  const p: Person = { email: me.email.toLowerCase(), name: me.name, title: '', admin, active: true }
  const created = await gj(itemsPath(ids.person), { method: 'POST', body: JSON.stringify({ fields: toFields('person', { Title: p.name, AppId: p.email, Email: p.email, Admin: p.admin, Aktiv: true, AppData: JSON.stringify(p) }) }) })
  return { ...p, _sp: created.id }
}

/** Returns the person record or null; inactive people are refused by callers. */
export async function access(me: SessionUser) {
  const people = await loadPeople()
  const p = people.find((x) => x.email === me.email.toLowerCase()) || null
  return { people, person: p, admin: !!p?.admin, blocked: !!p && !p.active }
}

/** Session + active-account check for endpoints. Returns the user and access info, or a ready error Response. */
export async function requireUser(request: Request): Promise<{ me: SessionUser; acc: Awaited<ReturnType<typeof access>> } | Response> {
  const me = sessionFromRequest(request)
  if (!me) return unauthorized()
  const acc = await access(me)
  if (acc.blocked) return json({ error: 'blocked', message: 'A fiókod hozzáférése le van tiltva.' }, 403)
  return { me, acc }
}
