// One-time sign-in codes for people outside Fonte Viva. A code is 6 digits, lasts CODE_TTL_SECONDS, works once,
// and is locked after MAX_ATTEMPTS wrong guesses. Only a keyed hash of each code is stored, under a key derived
// from the address, so the store holds neither codes nor e-mail addresses. The key is the session cookie key.
import { randomInt, timingSafeEqual } from 'node:crypto'
import { countInWindow, redis } from './redis.js'
import { keyedHash } from './session.js'

export const CODE_TTL_SECONDS = 10 * 60
const MAX_ATTEMPTS = 5
/** Code e-mails per address, and code requests per network address. */
const SENDS_PER_ADDRESS = { limit: 5, windowSeconds: 15 * 60 }
const REQUESTS_PER_IP = { limit: 20, windowSeconds: 60 * 60 }

/** Lower-case and trimmed; null unless it looks like an e-mail address. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function keys(email: string) {
  const id = keyedHash(`login-address:${email}`).slice(0, 32)
  return { code: `login:code:${id}`, tries: `login:tries:${id}`, sends: `login:sends:${id}` }
}

const codeHash = (email: string, code: string) => keyedHash(`login-code:${email}:${code}`)

/** False once an address asked for too many codes, or a network address for too many in all. Counted for every
 *  request, listed address or not, so the answer gives away nothing about who is on the list. */
export async function mayRequestCode(email: string, ip: string): Promise<boolean> {
  const perIp = await countInWindow(`login:ip:${keyedHash(`login-ip:${ip}`).slice(0, 32)}`, REQUESTS_PER_IP.windowSeconds)
  const perAddress = await countInWindow(keys(email).sends, SENDS_PER_ADDRESS.windowSeconds)
  return perIp <= REQUESTS_PER_IP.limit && perAddress <= SENDS_PER_ADDRESS.limit
}

/** A fresh code for `email`; it replaces any earlier one and its attempts. */
export async function issueCode(email: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const k = keys(email)
  await redis('SET', k.code, codeHash(email, code), 'EX', CODE_TTL_SECONDS)
  await redis('DEL', k.tries)
  return code
}

export type CodeCheck = 'ok' | 'invalid' | 'expired' | 'locked'

/** Checks a typed code. A match deletes the code, so it cannot be used twice; so does the last allowed wrong guess. */
export async function checkCode(email: string, code: string): Promise<CodeCheck> {
  const k = keys(email)
  const stored = await redis<string | null>('GET', k.code)
  if (!stored) return 'expired'
  const attempt = await countInWindow(k.tries, CODE_TTL_SECONDS)
  if (attempt > MAX_ATTEMPTS) { await redis('DEL', k.code, k.tries); return 'locked' }
  const digits = String(code || '').replace(/\D/g, '')
  const given = Buffer.from(codeHash(email, digits)), expected = Buffer.from(stored)
  if (digits.length === 6 && given.length === expected.length && timingSafeEqual(given, expected)) { await redis('DEL', k.code, k.tries); return 'ok' }
  if (attempt === MAX_ATTEMPTS) { await redis('DEL', k.code, k.tries); return 'locked' }
  return 'invalid'
}
