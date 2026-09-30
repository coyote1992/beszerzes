import { useEffect } from 'react'
import { S } from '@/engine/engine.js'
import { ensureState } from '@/engine/commands.js'
import { useEngine, useUI } from '@/lib/store'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Shell } from '@/components/app/Shell'
import { Dashboard } from '@/components/app/Dashboard'
import { Approvals, Audit, Policy, Procurements, Tasks } from '@/components/app/Pages'
import { ProcSheet } from '@/components/app/ProcSheet'
import { Dialogs } from '@/components/app/Dialogs'

ensureState()

export default function App() {
  useEngine()
  const u = useUI()
  useEffect(() => { document.title = 'Fonte Viva · Beszerzési Központ' }, [])
  void S
  return (
    <TooltipProvider>
      <Shell>
        {u.view === 'dash' && <Dashboard />}
        {u.view === 'procs' && <Procurements />}
        {u.view === 'appr' && <Approvals />}
        {u.view === 'tasks' && <Tasks />}
        {u.view === 'audit' && <Audit />}
        {u.view === 'policy' && <Policy />}
      </Shell>
      <ProcSheet />
      <Dialogs />
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
