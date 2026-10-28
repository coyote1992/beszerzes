// Uploads a file into the procurement's SharePoint folder.
// ≤ 3.4 MB: through /api/files/upload. Larger: Graph upload session, chunks sent straight to SharePoint.
export type Uploaded = { name: string; webUrl: string; size: number }

const SMALL = 3.4 * 1024 * 1024
const CHUNK = 5 * 1024 * 1024 // multiple of 320 KiB

async function fail(res: Response, what: string): Promise<never> {
  const b = await res.json().catch(() => ({}))
  if (res.status === 401) throw new Error('A munkamenet lejárt – jelentkezz be újra.')
  throw new Error(`${what}: ${b.message || b.error || res.status}`)
}

export async function uploadFile(path: string, file: File, onProgress?: (pct: number) => void): Promise<Uploaded> {
  if (!path) throw new Error('A beszerzés mappája még nem jött létre – próbáld újra pár másodperc múlva.')
  if (file.size <= SMALL) {
    const res = await fetch(`/api/files/upload?path=${encodeURIComponent(path)}&name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file, credentials: 'same-origin' })
    if (!res.ok) await fail(res, 'Feltöltési hiba')
    onProgress?.(100)
    return res.json()
  }
  const s = await fetch('/api/files/session', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, name: file.name }) })
  if (!s.ok) await fail(s, 'Feltöltés indítása sikertelen')
  const { uploadUrl } = await s.json()
  let last: any = null
  for (let start = 0; start < file.size; start += CHUNK) {
    const end = Math.min(start + CHUNK, file.size)
    const r = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` }, body: file.slice(start, end) })
    if (!r.ok) throw new Error(`Feltöltési hiba (${r.status})`)
    last = await r.json().catch(() => null)
    onProgress?.(Math.round((end / file.size) * 100))
  }
  return { name: last?.name || file.name, webUrl: last?.webUrl || '', size: last?.size || file.size }
}
