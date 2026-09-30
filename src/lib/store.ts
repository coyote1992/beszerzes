import { useSyncExternalStore } from 'react'
import { save } from '@/engine/engine.js'
import { notify } from '@/engine/notify.js'

/* ---- engine (domain) store: engine mutates S in place, we bump a version ---- */
let ev = 0
const esubs = new Set<() => void>()
export function commit() { save(); ev++; esubs.forEach((f) => f()) }
export function useEngine() { return useSyncExternalStore((f) => (esubs.add(f), () => esubs.delete(f)), () => ev) }
/** Run a command; string results are errors (shown as toasts). Returns the raw result. */
export function run<T>(fn: () => T): T {
  const r = fn()
  if (typeof r === 'string' && r !== 'x' && r !== 'close') notify(r, 'bad')
  commit()
  return r
}

/* ---- UI store ---- */
export type View = 'dash' | 'procs' | 'appr' | 'tasks' | 'audit' | 'policy'
export type Dlg = { _id?: number; type: string; pid?: string; key?: string; bid?: string; folder?: number; dec?: string } | null
export const ui = {
  view: 'dash' as View, open: null as string | null, tab: 'ov',
  q: '', fType: '', fStage: '', fProc: '', taskF: 'me', apprTab: 'wait', auditQ: '', auditP: '', dashTab: 'all',
  auditMsg: null as null | ['ok' | 'bad', string], tamper: null as null | { i: number; orig: string },
  dialog: null as Dlg, palette: false,
}
let uv = 0
const usubs = new Set<() => void>()
export function setUI(p: Partial<typeof ui>) { Object.assign(ui, p); uv++; usubs.forEach((f) => f()) }
export function useUI() { useSyncExternalStore((f) => (usubs.add(f), () => usubs.delete(f)), () => uv); return ui }
export const openProc = (id: string, tab = 'ov') => setUI({ open: id, tab })
let did = 0
export const openDlg = (d: NonNullable<Dlg>) => setUI({ dialog: { ...d, _id: ++did } })
export const closeDlg = () => setUI({ dialog: null })
