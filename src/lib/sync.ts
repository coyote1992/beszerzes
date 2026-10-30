// Loads the shared state from SharePoint (via /api/data) and writes changes back (via /api/sync).
// The policy engine mutates S in place; after every command we diff entities against the last saved snapshot.
import { S, setS, emptyState, todayLocal, DEFAULT_CC, ROLE_LABEL, ATITLE, STAGES, nm, typeOf, statusOf, nextDue, dl, log } from '@/engine/engine.js'
import { report } from '@/lib/report'
import { dueNotices, type Notice } from '@/lib/notices'

type Ent = { t: string; key: string; obj: any; data: any; view: Record<string, unknown> }
type SyncState = 'idle' | 'saving' | 'error'

const snap = new Map<string, string>()
const spOf = new Map<string, string>()
const failures = new Map<string, number>()
let state: SyncState = 'idle'
let lastError = ''
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())
export const syncStatus = () => ({ state, lastError, pending: pendingCount() })
export const onSyncStatus = (f: () => void) => (listeners.add(f), () => { listeners.delete(f) })

const stable = (v: unknown) => JSON.stringify(v, (k, x) => (k === '_sp' || k === '_new' ? undefined : x))
const iso = (ts?: string | null) => (ts ? new Date(ts.replace(' ', 'T')).toISOString() : null)

/* ---------- readable SharePoint columns ---------- */
function procView(p: any) {
  const st = statusOf(p), nd = nextDue(p)
  return {
    Title: p.id, Targy: p.subject, Szervezet: p.org, Koltseghely: p.cc, Ertek: p.value, Kategoria: p.cat, Eljaras: p.proc === 'SS' ? 'Sole Source' : p.proc, Tipus: typeOf(p.value),
    IFS: !!p.ifs, Szakasz: `PROC${p.stage} · ${STAGES[p.stage - 1][1]}`, Statusz: st.l, Igenylo: nm(p.requester), Felelos: nm(p.owner), KovetkezoLepes: nd.text, KovetkezoHatarido: nd.date,
    KivantTeljesites: p.desired, AjanlatHatarido: p.bidDeadline, Szerzodestipus: p.contractType, Nyertes: p.nego?.winnerName, VegsoAr: p.nego?.final, Megtakaritas: p.nego?.saving,
    Lezarva: p.closed ? iso(p.closed.ts) : null, Mappa: p.folderUrl, Teszt: !!p.test, Letrehozva: p.created,
  }
}
const bidderView = (p: any, b: any) => ({ Title: b.name, Beszerzes: p.id, Email: b.email, AjanlattevoTipus: b.type, UjBeszallito: !!b.isNew, Allapot: b.status, Beerkezett: iso(b.recv), Formai: b.formal == null ? '' : b.formal ? 'igen' : 'nem', Ar: b.price, FizetesiHatarido: b.pay, Szallitas: b.lead, Jotallas: b.warr, MuszakiPont: b.tech })
function apprView(p: any, k: string, a: any) {
  const decs = (a.decisions || []).map((d: any) => `${nm(d.by)}: ${d.dec === 'approve' ? 'jóváhagyta' : 'elutasította'} (${d.ts}, v${d.ver})${d.c ? ' – ' + d.c : ''}`).join('\n')
  const allOk = a.decisions?.length && !a.decisions.some((d: any) => d.dec !== 'approve')
  return { Title: `${p.id} · ${ATITLE[k] || k}`, Beszerzes: p.id, JovahagyasTipus: ATITLE[k] || k, Kerte: nm(a.req?.by), Kerve: iso(a.req?.ts), Allapot: a.decisions?.some((d: any) => d.dec === 'reject') ? 'Elutasítva' : allOk ? 'Döntés született' : 'Folyamatban', Dontesek: decs }
}
const docView = (p: any, d: any) => ({ Title: d.name, Beszerzes: p.id, DokTipus: dl(d.key), Verzio: d.ver, Ajanlattevo: d.bid ? p.bidders.find((b: any) => b.id === d.bid)?.name : '', Feltoltotte: nm(d.by), Idopont: iso(d.ts), Megjegyzes: d.note, Fajl: d.url })
const taskView = (t: any) => ({ Title: t.title, Leiras: t.desc, Felelos: nm(t.owner), Kiosztotta: nm(t.by), Hatarido: t.due, Beszerzes: t.pid, Kesz: iso(t.done) })
const personView = (pe: any) => ({ Title: pe.name, Email: pe.email, Beosztas: pe.title, Szerepkorok: pe.roleLabels || '', Admin: !!pe.admin, Aktiv: pe.active !== false })

/** The readable columns are a convenience: a record they can't be built for is still saved, with just its title. */
const safe = (f: () => Record<string, unknown>, title: string) => { try { return f() } catch (e) { report(e, 'view'); return { Title: title } } }
function entities(): Ent[] {
  const out: Ent[] = []
  for (const p of S.procs) {
    const { docs, bidders, appr, ...rest } = p
    out.push({ t: 'proc', key: p.id, obj: p, data: rest, view: safe(() => procView(p), p.id) })
    for (const b of bidders) out.push({ t: 'bidder', key: `${p.id}|${b.id}`, obj: b, data: { ...b, pid: p.id }, view: safe(() => bidderView(p, b), b.name || '') })
    for (const [k, a] of Object.entries<any>(appr)) out.push({ t: 'appr', key: `${p.id}|${k}|${a.id || a.req?.ts}`, obj: a, data: { ...a, pid: p.id, key: k }, view: safe(() => apprView(p, k, a), p.id) })
    for (const d of docs) out.push({ t: 'doc', key: d.id, obj: d, data: { ...d, pid: p.id }, view: safe(() => docView(p, d), d.name || '') })
  }
  for (const t of S.tasks) out.push({ t: 'task', key: t.id, obj: t, data: t, view: safe(() => taskView(t), t.title || '') })
  for (const pe of S.people) {
    const roleLabels = Object.entries<string>(S.roles || {}).filter(([, e]) => e === pe.email).map(([r]) => ROLE_LABEL[r] || r).join(', ')
    out.push({ t: 'person', key: pe.email, obj: pe, data: { email: pe.email, name: pe.name, title: pe.title || '', admin: !!pe.admin, active: pe.active !== false, testProxy: !!pe.testProxy, roles: roleLabels }, view: personView({ ...pe, roleLabels }) })
  }
  out.push({ t: 'setting', key: 'roles', obj: S._settings.roles, data: S.roles, view: { Title: 'roles' } })
  out.push({ t: 'setting', key: 'cc', obj: S._settings.cc, data: S.cc, view: { Title: 'cc' } })
  out.push({ t: 'setting', key: 'roleDefs', obj: S._settings.roleDefs, data: { list: S.roleDefs || [] }, view: { Title: 'roleDefs' } })
  return out
}

/* ---------- e-mail notifications ---------- */
let noticeBase = new Set<string>()
let outbox: Notice[] = []
const safeDue = () => { try { return dueNotices() } catch (e) { report(e, 'notices'); return new Map<string, Notice>() } }
/** After loading: whatever is due now was caused by someone else (or earlier) and is not sent again. */
const rebaseNotices = () => { noticeBase = new Set(safeDue().keys()) }
/** After a local change: newly due notices go to the outbox. Nobody is e-mailed about their own action, except on TEST procurements. */
function collectNotices() {
  const now = safeDue()
  for (const [k, n] of now) if (!noticeBase.has(k) && (n.test || n.to !== S.user)) outbox.push(n)
  noticeBase = new Set(now.keys())
}

function pendingCount() {
  if (!S) return 0
  let n = S.audit.filter((e: any) => e._new).length + outbox.length
  for (const e of entities()) if (snap.get(`${e.t}:${e.key}`) !== stable(e.data)) n++
  return n
}

function rememberAll() {
  snap.clear(); spOf.clear()
  for (const e of entities()) { const k = `${e.t}:${e.key}`; snap.set(k, stable(e.data)); if (e.obj?._sp) spOf.set(k, e.obj._sp) }
}

/* ---------- loading ---------- */
export class AuthError extends Error {}

/** Loads everything from SharePoint and replaces the state. With `canApply`, the result is dropped (returns false) when it says no at arrival time. */
export async function loadAll(canApply?: () => boolean): Promise<boolean> {
  const res = await fetch('/api/data', { credentials: 'same-origin', cache: 'no-store' })
  if (res.status === 401) throw new AuthError('unauthorized')
  if (res.status === 403) throw new Error('A fiókod hozzáférése le van tiltva. Fordulj az adminisztrátorhoz.')
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Betöltési hiba (${res.status})`)
  const d = await res.json()
  const s: any = emptyState()
  s.user = d.me.email
  s.me = d.me
  s.people = d.people
  s.roles = d.settings.roles?.value || {}
  s.cc = d.settings.cc?.value || DEFAULT_CC
  s.roleDefs = d.settings.roleDefs?.value?.list || []
  s._settings = { roles: { _sp: d.settings.roles?._sp }, cc: { _sp: d.settings.cc?._sp }, roleDefs: { _sp: d.settings.roleDefs?._sp } }
  const byPid = (rows: any[]) => rows.reduce((m: Record<string, any[]>, r) => ((m[r.pid] ||= []).push(r), m), {})
  const bidders = byPid(d.bidders), docs = byPid(d.docs)
  const apprs: Record<string, Record<string, any>> = {}
  for (const a of d.apprs) {
    const cur = apprs[a.pid]?.[a.key]
    if (!cur || (a.req?.ts || '') > (cur.req?.ts || '') || ((a.req?.ts || '') === (cur.req?.ts || '') && +a._sp > +cur._sp)) (apprs[a.pid] ||= {})[a.key] = a
  }
  const moved: [string, number, number][] = []
  s.procs = d.procs
    .map((p: any) => {
      // PROC6 (Teljesítés) was removed: older records continue in the last stage. Missing parts get safe defaults.
      const stage = Math.min(Math.max(1, Math.round(Number(p.stage)) || 1), STAGES.length)
      if (stage !== p.stage) moved.push([p.id, p.stage, stage])
      return { ...p, stage, value: Number(p.value) || 0, f: p.f || {}, due: p.due || {}, mail: Array.isArray(p.mail) ? p.mail : [], round: p.round || 1 }
    })
    .map((p: any) => ({
      ...p,
      bidders: (bidders[p.id] || []).sort((a: any, b: any) => +a._sp - +b._sp),
      docs: (docs[p.id] || []).sort((a: any, b: any) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : a.ver - b.ver)),
      appr: apprs[p.id] || {},
    }))
    .sort((a: any, b: any) => (a.created < b.created ? 1 : a.created > b.created ? -1 : b.id.localeCompare(a.id)))
  s.tasks = d.tasks
  s.audit = d.audit
  s.today = todayLocal()
  s.theme = S?.theme || initialTheme()
  if (canApply && !canApply()) return false
  setS(s)
  rememberAll()
  rebaseNotices()
  if (moved.length) {
    for (const [id, from, to] of moved) { snap.delete(`proc:${id}`); log(id, 'Státusz', 'Szakasz áthelyezve', `PROC${from} → PROC${to} (a Teljesítés szakasz megszűnt)`) }
    scheduleSync(1500)
  }
  failures.clear()
  state = 'idle'; lastError = ''; emit()
  return true
}
function initialTheme() {
  try { const t = localStorage.getItem('bsz-theme'); if (t === 'dark' || t === 'light') return t } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/* ---------- saving ---------- */
let timer: ReturnType<typeof setTimeout> | null = null
let running: Promise<void> | null = null
let again = false
let onAuthLost: () => void = () => {}
export const setAuthLostHandler = (f: () => void) => { onAuthLost = f }

export function scheduleSync(delay = 350) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { timer = null; void runSync() }, delay)
}

/** Resolves when everything currently known is saved (or the attempt failed). */
export async function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  await runSync()
  if (running) await running
}

async function runSync(): Promise<void> {
  if (!S) return
  if (running) { again = true; return running }
  running = (async () => {
    try {
      do { again = false; await syncOnce() } while (again)
    } finally { running = null }
  })()
  return running
}

async function syncOnce() {
  const ents = entities()
  const seen = new Set<string>()
  const ops: any[] = []
  const meta: Record<string, { ent: Ent; json: string }> = {}
  for (const e of ents) {
    const k = `${e.t}:${e.key}`
    seen.add(k)
    const j = stable(e.data)
    if (snap.get(k) === j) continue
    if ((failures.get(k) || 0) >= 3) continue
    if ((e.t === 'person' || e.t === 'setting') && !S.me?.admin) continue
    ops.push({ t: e.t, key: e.key, sp: e.obj?._sp || spOf.get(k), data: JSON.parse(j), view: e.view })
    meta[k] = { ent: e, json: j }
  }
  for (const [k, sp] of spOf) if (!seen.has(k) && k.startsWith('bidder:')) ops.push({ t: 'bidder', key: k.slice(7), sp, del: true })
  const newAudit = S.audit.filter((e: any) => e._new && !e._sending)
  collectNotices()
  const notify = outbox.slice()
  if (!ops.length && !newAudit.length && !notify.length) { if (state !== 'idle') { state = 'idle'; emit() } return }

  newAudit.forEach((e: any) => (e._sending = true))
  state = 'saving'; emit()
  try {
    const res = await fetch('/api/sync', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops, audit: newAudit.map((e: any) => ({ proc: e.proc, type: e.type, title: e.title, detail: e.detail })), notify: notify.map(({ key: _k, ...n }) => n) }),
    })
    if (res.status === 401) { newAudit.forEach((e: any) => delete e._sending); state = 'error'; lastError = 'A munkamenet lejárt.'; emit(); onAuthLost(); return }
    const body = await res.json().catch(() => ({}))
    const errKeys = new Set<string>((body.errors || []).map((x: any) => x.k))
    for (const op of ops) {
      const k = `${op.t}:${op.key}`
      if (op.del) { if (!errKeys.has(k)) { spOf.delete(k); snap.delete(k) } continue }
      if (errKeys.has(k)) { failures.set(k, (failures.get(k) || 0) + 1); continue }
      const m = meta[k]
      const sp = body.sp?.[k]
      if (sp) { m.ent.obj._sp = sp; spOf.set(k, sp) }
      const patch = body.patch?.[k]
      if (patch) Object.assign(m.ent.obj, patch)
      // snapshot what was saved (plus server-side patches) so the next diff starts from there
      snap.set(k, patch ? stable({ ...JSON.parse(m.json), ...patch }) : m.json)
      failures.delete(k)
    }
    if (res.ok) outbox = outbox.filter((n) => !notify.includes(n))
    if (Array.isArray(body.audit) && res.ok) newAudit.forEach((e: any, i: number) => { Object.assign(e, body.audit[i] || {}); delete e._new; delete e._sending })
    else newAudit.forEach((e: any) => delete e._sending)
    if (!res.ok || errKeys.size) {
      state = 'error'
      lastError = body.message || (body.errors || []).map((x: any) => x.message).join('; ') || `Mentési hiba (${res.status})`
    } else { state = 'idle'; lastError = '' }
  } catch (e) {
    newAudit.forEach((x: any) => delete x._sending)
    state = 'error'; lastError = 'Hálózati hiba – a mentés újrapróbálódik.'
    setTimeout(() => scheduleSync(0), 5000)
  }
  emit()
}

export const hasPending = () => !!S && (pendingCount() > 0 || !!running)
export { S }
