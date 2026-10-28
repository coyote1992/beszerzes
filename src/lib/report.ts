// Sends unexpected client errors to the server log (Vercel runtime logs), once per distinct message.
const sent = new Set<string>()
export function report(e: unknown, where: string) {
  const err = e instanceof Error ? e : new Error(String(e))
  const key = where + '|' + err.message
  console.error(`[${where}]`, err)
  if (sent.has(key) || sent.size > 20) return
  sent.add(key)
  void fetch('/api/log', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ where, message: err.message.slice(0, 500), stack: String(err.stack || '').slice(0, 3000), url: location.pathname + location.search }),
  }).catch(() => undefined)
}
