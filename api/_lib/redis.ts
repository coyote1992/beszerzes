// The smallest possible client for the Upstash Redis store connected in Vercel → Storage
// (KV_REST_API_URL / KV_REST_API_TOKEN). Upstash speaks Redis over HTTPS: one command per POST, as a JSON array.
// Used only for e-mail sign-in codes and their rate limits (login-codes.ts).
export async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN is missing')
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command.map(String)),
  })
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: string }
  if (!res.ok || body.error) throw new Error(`Redis ${command[0]} failed: ${body.error ?? res.status}`)
  return body.result as T
}

/** Counts one more event under `key`; returns the count in the window that started with the first event. */
export async function countInWindow(key: string, windowSeconds: number): Promise<number> {
  const count = await redis<number>('INCR', key)
  if (count === 1) await redis('EXPIRE', key, windowSeconds)
  return count
}
