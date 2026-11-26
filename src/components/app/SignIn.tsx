import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Microsoft sign-in, coming back to the current page (e.g. a link from a notification e-mail). */
export const msLogin = () => location.replace('/api/auth/login?returnTo=' + encodeURIComponent(location.pathname + location.search))

export function Splash({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">F</div>
        {children}
      </div>
    </div>
  )
}

export function SignIn() {
  return (
    <Splash>
      <h1 className="text-base font-semibold">Fonte Viva · Beszerzési központ</h1>
      <p className="text-sm text-muted-foreground">Jelentkezz be a folytatáshoz.</p>
      <Button className="mt-1 w-full" onClick={msLogin}>Bejelentkezés Microsoft-fiókkal</Button>
      <EmailCodeForm />
    </Splash>
  )
}

const CODE_ERRORS: Record<string, string> = {
  invalid: 'Hibás kód. Ellenőrizd, és próbáld újra.',
  expired: 'A kód lejárt vagy már nem érvényes. Kérj új kódot.',
  locked: 'Túl sok hibás próbálkozás. Kérj új kódot.',
  blocked: 'A fiókod hozzáférése le van tiltva. Fordulj a beszerzési csapathoz.',
  failed: 'A belépés nem sikerült. Próbáld újra.',
}
/** Seconds before another code can be requested. */
const RESEND_AFTER = 30

const post = (url: string, body: object) =>
  fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** Sign-in for people outside Fonte Viva who are on the SharePoint "Login" list: their address, then the 6-digit
 *  code from the e-mail. Folded away behind a link, so the Microsoft button stays the obvious way in. */
function EmailCodeForm() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function requestCode() {
    setBusy(true); setError(null)
    try {
      const res = await post('/api/login/code', { email })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) return setError(r.error || 'Most nem sikerült kódot küldeni. Próbáld újra.')
      setCode(''); setStep('code'); setWait(RESEND_AFTER)
    } catch {
      setError('Nincs kapcsolat a szerverrel. Próbáld újra.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCode() {
    setBusy(true); setError(null)
    try {
      const res = await post('/api/login/verify', { email, code, returnTo: location.pathname + location.search })
      const r = await res.json().catch(() => ({}))
      if (res.ok && r.ok) return location.replace(r.redirect || '/')
      setError(CODE_ERRORS[r.error] || CODE_ERRORS.failed)
      if (r.error === 'expired' || r.error === 'locked') setCode('')
    } catch {
      setError('Nincs kapcsolat a szerverrel. Próbáld újra.')
    }
    setBusy(false)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!busy) void (step === 'email' ? requestCode() : submitCode())
  }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      Külső partner vagy? Belépés e-mailben kapott kóddal
    </button>
  )

  return (
    <form onSubmit={onSubmit} className="mt-2 flex w-full flex-col gap-3 border-t pt-4 text-left">
      {step === 'email' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">E-mail-cím</Label>
          <Input id="login-email" type="email" autoComplete="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nev@ceg.hu" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">Ha a(z) <span className="font-medium text-foreground">{email}</span> cím jogosult a belépésre, elküldtük rá a 6 jegyű kódot. 10 percig érvényes.</p>
          <Label htmlFor="login-code">Kód</Label>
          <Input id="login-code" inputMode="numeric" autoComplete="one-time-code" autoFocus required value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className="text-center text-lg tracking-[0.4em]" />
        </div>
      )}
      {error && <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="outline" className="w-full" disabled={busy || (step === 'code' && code.length !== 6)}>
        {step === 'email' ? (busy ? 'Küldés…' : 'Kód küldése') : busy ? 'Belépés…' : 'Belépés'}
      </Button>
      {step === 'code' && (
        <div className="flex justify-between text-sm">
          <button type="button" onClick={() => { setStep('email'); setError(null) }} className="text-muted-foreground hover:text-foreground">Másik cím</button>
          <button type="button" disabled={busy || wait > 0} onClick={() => void requestCode()} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
            {wait > 0 ? `Új kód (${wait} mp)` : 'Új kód küldése'}
          </button>
        </div>
      )}
    </form>
  )
}
