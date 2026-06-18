'use client'

import { useEffect, useState } from 'react'
import { exitOrg } from '@/lib/super-admin/impersonation'

export function ImpersonationBanner({ orgName, expiresAt }: { orgName: string; expiresAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) { setRemaining('expired'); return }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setRemaining(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-[13px] font-semibold text-amber-950">
      <span>
        ⚠ Viewing as <span className="font-bold">{orgName}</span> (platform admin) · session {remaining}
      </span>
      <form action={async () => { await exitOrg() }}>
        <button type="submit" className="rounded-lg bg-amber-950/90 px-3 py-1 text-[12px] font-bold text-amber-50 hover:bg-amber-950">
          Exit
        </button>
      </form>
    </div>
  )
}
