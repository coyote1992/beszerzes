import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useEngine, useUI, rerender, setUI, ui, type View } from '@/lib/store'
import { S } from '@/engine/engine.js'
import { AuthError, flush, hasPending, loadAll, setAuthLostHandler } from '@/lib/sync'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Shell, TITLES } from '@/components/app/Shell'
import { Dashboard } from '@/components/app/Dashboard'
import { Approvals, Audit, Policy, Procurements, Settings, Tasks } from '@/components/app/Pages'
import { ProcSheet } from '@/components/app/ProcSheet'
import { Dialogs } from '@/components/app/Dialogs'
import { Tour } from '@/components/app/Tour'
import { DecisionTree } from '@/components/app/Tree'
import { report } from '@/lib/report'
import { SignIn, Splash, msLogin } from '@/components/app/SignIn'

const REFRESH_MS = 90_000
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => report(e.error || e.message, 'window'))
  window.addEventListener('unhandledrejection', (e) => report(e.reason, 'promise'))
}

/** Keeps a rendering bug in one view from blanking the whole app. */
class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error) { report(err, 'render') }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <Splash>
        <h1 className="text-base font-semibold">Váratlan hiba történt</h1>
        <p className="text-sm text-muted-foreground">{this.state.err.message}</p>
        <p className="text-xs text-muted-foreground">A hibát automatikusan jelentettük. A mentett adatok nem vesztek el.</p>
        <Button onClick={() => location.reload()}>Újratöltés</Button>
      </Splash>
    )
  }
}

/** Links in notification e-mails: ?p=<procurement id>&tab=<tab> or ?view=<page>. */
function openFromLink() {
  const q = new URLSearchParams(location.search)
  const pid = q.get('p'), tab = q.get('tab'), view = q.get('view')
  if (pid && S.procs.some((x: any) => x.id === pid)) setUI({ view: 'procs', open: pid, tab: tab || 'ov' })
  else if (view && view in TITLES) setUI({ view: view as View })
  if (pid || view) history.replaceState(null, '', location.pathname)
}

function SessionExpired() {
  const u = useUI()
  if (!u.sessionExpired) return null
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-4">
      <div className="pop w-full max-w-sm rounded-lg border bg-popover p-5 text-popover-foreground shadow-lg">
        <h3 className="text-base font-semibold">A bejelentkezés lejárt</h3>
        <p className="mt-1 text-sm text-muted-foreground">A munkamenet 10 óra után lejár. Jelentkezz be újra a folytatáshoz – a még el nem mentett utolsó módosítás elveszhet.</p>
        {/* E-mail-code partners get a new code on the sign-in screen. */}
        <div className="mt-4 flex justify-end"><Button onClick={() => (S.me?.method === 'code' ? location.reload() : msLogin())}>Bejelentkezés</Button></div>
      </div>
    </div>
  )
}

export default function App() {
  useEngine()
  const u = useUI()
  const [phase, setPhase] = useState<'loading' | 'signin' | 'ready' | 'error'>('loading')
  const [err, setErr] = useState('')
  const [slow, setSlow] = useState(false)
  const lastLoad = useRef(0)

  const boot = useCallback(async () => {
    setPhase('loading'); setSlow(false)
    const t = setTimeout(() => setSlow(true), 4000)
    try { await loadAll(); lastLoad.current = Date.now(); openFromLink(); setPhase('ready') }
    catch (e) { if (e instanceof AuthError) return setPhase('signin'); report(e, 'load'); setErr((e as Error).message); setPhase('error') }
    finally { clearTimeout(t) }
  }, [])

  useEffect(() => { document.title = 'Fonte Viva · Beszerzési Központ'; setAuthLostHandler(() => setUI({ sessionExpired: true })); void boot() }, [boot])

  // Pick up colleagues' changes while idle: never while something is unsaved or a dialog/tour is open.
  useEffect(() => {
    if (phase !== 'ready') return
    const idle = () => !hasPending() && !ui.dialog && ui.tour < 0 && !ui.sessionExpired && !ui.palette
    const tick = async (minGap: number) => {
      if (document.hidden || !idle() || Date.now() - lastLoad.current < minGap) return
      try { if (await loadAll(idle)) { lastLoad.current = Date.now(); rerender() } }
      catch (e) { if (e instanceof AuthError) setUI({ sessionExpired: true }) }
    }
    const id = setInterval(() => void tick(REFRESH_MS - 1000), REFRESH_MS)
    const vis = () => { if (!document.hidden) void tick(20_000) }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [phase])

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (hasPending()) { void flush(); e.preventDefault() } }
    window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h)
  }, [])

  if (phase === 'loading') return <Splash><Spinner className="size-5" /><p className="text-sm text-muted-foreground">Betöltés…</p>{slow && <p className="text-xs text-muted-foreground">Első indításkor a SharePoint-listák és -mappák létrehozása egy percig is eltarthat.</p>}</Splash>
  if (phase === 'signin') return <SignIn />
  if (phase === 'error') return (
    <Splash>
      <h1 className="text-base font-semibold">Nem sikerült betölteni az adatokat</h1>
      <p className="whitespace-pre-line text-left text-sm text-muted-foreground">{err}</p>
      <div className="flex gap-2"><Button variant="outline" onClick={() => (location.href = '/api/auth/logout')}>Kijelentkezés</Button><Button onClick={() => void boot()}>Újrapróbálás</Button></div>
    </Splash>
  )
  return (
    <Boundary>
    <TooltipProvider>
      <Shell>
        {u.view === 'dash' && <Dashboard />}
        {u.view === 'procs' && <Procurements />}
        {u.view === 'appr' && <Approvals />}
        {u.view === 'tasks' && <Tasks />}
        {u.view === 'audit' && <Audit />}
        {u.view === 'policy' && <Policy />}
        {u.view === 'tree' && <DecisionTree />}
        {u.view === 'settings' && <Settings />}
      </Shell>
      <ProcSheet />
      <Dialogs />
      <Tour />
      <SessionExpired />
      <Toaster position="top-center" />
    </TooltipProvider>
    </Boundary>
  )
}
