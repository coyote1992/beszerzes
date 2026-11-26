// Who may sign in with an e-mail code: one row per person in the SharePoint list "Login" on the Beszerzés site,
// with the address in Title and an optional "Név" column. Fonte Viva's own people always sign in with Microsoft,
// so their domain is never accepted here, even when someone adds such an address to the list.
import { pages, site } from './graph.js'
import { norm } from './schema.js'

export const INTERNAL_DOMAIN = 'fonteviva.hu'
const LIST = () => process.env.SP_LOGIN_LIST || 'Login'
const CACHE_MS = 5 * 60 * 1000
/** After a failed read, re-checks of running sessions wait this long before asking SharePoint again. */
const RETRY_MS = 60 * 1000

export type AllowedPerson = { email: string; name: string }

let cache: { at: number; people: Map<string, AllowedPerson> } | undefined
let failedAt = 0

export const isInternalAddress = (email: string) => email.endsWith(`@${INTERNAL_DOMAIN}`)

/** The value of a column by its display name, whatever SharePoint encoded it to ("Név" → "N_x00e9_v"). */
function column(fields: Record<string, unknown>, ...names: string[]): string {
  const want = new Set(names.map(norm))
  for (const [key, value] of Object.entries(fields)) {
    const decoded = key.replace(/_x([0-9a-f]{4})_/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    if (want.has(norm(decoded)) && typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

async function readList(): Promise<Map<string, AllowedPerson>> {
  const all = await pages(`${site()}/lists?$select=id,displayName`)
  const list = all.find((l: any) => norm(l.displayName) === norm(LIST()))
  if (!list) throw new Error(`SharePoint list "${LIST()}" not found`)
  const people = new Map<string, AllowedPerson>()
  for (const item of await pages(`${site()}/lists/${list.id}/items?expand=fields&$top=999`)) {
    const fields = (item.fields ?? {}) as Record<string, unknown>
    const email = (column(fields, 'Title') || column(fields, 'Email', 'E-mail')).toLowerCase()
    if (!email.includes('@') || isInternalAddress(email)) continue
    people.set(email, { email, name: column(fields, 'Név', 'Name') || email })
  }
  return people
}

/** The listed person for `email`, or null. Throws when the list cannot be read, so an outage never lets anyone in. */
export async function allowedPerson(email: string): Promise<AllowedPerson | null> {
  if (isInternalAddress(email)) return null
  if (!cache || Date.now() - cache.at > CACHE_MS) {
    try { cache = { at: Date.now(), people: await readList() }; failedAt = 0 }
    catch (e) { failedAt = Date.now(); throw e }
  }
  return cache.people.get(email) ?? null
}

/** For a running e-mail-code session: false once the person is off the list. If the list cannot be read just then,
 *  the session carries on and the list is asked again later. */
export async function stillListed(email: string): Promise<boolean> {
  if (failedAt && Date.now() - failedAt < RETRY_MS && (!cache || Date.now() - cache.at > CACHE_MS)) return true
  try { return !!(await allowedPerson(email)) }
  catch (e) { console.error('Login list re-check failed:', (e as Error).message); return true }
}
