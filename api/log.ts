// Receives client-side error reports so they show up in the Vercel runtime logs.
import { requireUser } from './_lib/people.js'
import { json } from './_lib/session.js'

export async function POST(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  const b: any = await request.json().catch(() => ({}))
  const s = (v: unknown, n: number) => String(v ?? '').slice(0, n)
  console.error('client error', JSON.stringify({ user: u.me.email, where: s(b.where, 60), message: s(b.message, 500), url: s(b.url, 200), stack: s(b.stack, 3000) }))
  return json({ ok: true })
}
