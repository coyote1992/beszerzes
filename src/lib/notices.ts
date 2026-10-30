// Which e-mail notifications the current state calls for. A notice is identified by a key; after a change,
// keys that were not due before are sent (see sync.ts). Changes made by others are not re-sent: loading the
// data only resets the baseline.
import { S, ATITLE, ADESC, nm, ft, typeOf, fDay, dl, nextItem } from '@/engine/engine.js'

export type Notice = {
  key: string
  kind: 'approval' | 'task'
  to: string
  test?: boolean
  pid?: string
  procSubject?: string
  title: string
  details: [string, string][]
  open: { p?: string; tab?: string; view?: string }
}

const isPerson = (k?: string) => !!k && k.includes('@') && !k.startsWith('role:') && !k.startsWith('cc:')

export function dueNotices(): Map<string, Notice> {
  const out = new Map<string, Notice>()
  // Approvals: the procurement's next step is an approval that is waiting on a person.
  for (const p of S.procs) {
    if (p.closed) continue
    const i = nextItem(p)
    const a = i?.appr
    if (!a || !a.requested || a.status !== 'pending') continue
    const waiting = a.per.filter((x: any) => x.state === 'pending' || x.state === 'stale')
    if (!waiting.length) continue
    const rec = p.appr[a.key] || {}
    const details: [string, string][] = [
      ['Mit kell tenned', ADESC[a.key] || 'Jóváhagyás'],
      ['Beszerzés', `${p.id} – ${p.subject}`],
      ['Érték', `${ft(p.value)} (${typeOf(p.value)})`],
      ...(a.doc ? [['Jóváhagyandó dokumentum', `${dl(a.bound)} v${a.ver}`] as [string, string]] : []),
      ['Kérte', nm(rec.req?.by) || '–'],
      ['Jóváhagyók', a.per.map((x: any) => nm(x.name)).join(' + ')],
    ]
    const base = { kind: 'approval' as const, pid: p.id, procSubject: p.subject, title: ATITLE[a.key] || a.key, details, open: { p: p.id, tab: 'ov' } }
    if (p.test) {
      if (isPerson(p.createdBy)) out.set(`appr|${p.id}|${a.key}|${rec.id || ''}|${a.ver}|test`, { ...base, key: `appr|${p.id}|${a.key}|${rec.id || ''}|${a.ver}|test`, to: p.createdBy, test: true })
      continue
    }
    for (const x of waiting) {
      if (!isPerson(x.name)) continue
      const key = `appr|${p.id}|${a.key}|${rec.id || ''}|${a.ver}|${x.name}`
      out.set(key, { ...base, key, to: x.name })
    }
  }
  // Tasks: open tasks, keyed by owner, so a reassigned task notifies the new owner.
  for (const t of S.tasks) {
    if (t.done || !isPerson(t.owner)) continue
    const p = t.pid ? S.procs.find((x: any) => x.id === t.pid) : null
    const test = !!p?.test
    const to = test ? p.createdBy : t.owner
    if (!isPerson(to)) continue
    const key = `task|${t.id}|${t.owner}`
    out.set(key, {
      key, kind: 'task', to, test, pid: p?.id, procSubject: p?.subject, title: t.title,
      details: [
        ...(t.desc ? [['Leírás', t.desc] as [string, string]] : []),
        ['Határidő', fDay(t.due)],
        ['Kiosztotta', nm(t.by) || '–'],
        ...(p ? [['Beszerzés', `${p.id} – ${p.subject}`] as [string, string]] : []),
        ...(test ? [['Felelős', nm(t.owner)] as [string, string]] : []),
      ],
      open: p ? { p: p.id, tab: 'tasks' } : { view: 'tasks' },
    })
  }
  return out
}
