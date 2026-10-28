import { verifyChain } from '../_lib/audit.js'
import { requireUser } from '../_lib/people.js'
import { json } from '../_lib/session.js'

export async function GET(request: Request) {
  const u = await requireUser(request)
  if (u instanceof Response) return u
  try { return json(await verifyChain()) } catch (e) { return json({ error: 'server', message: (e as Error).message }, 500) }
}
