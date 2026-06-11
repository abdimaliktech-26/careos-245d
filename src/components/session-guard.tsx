'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// HIPAA §164.312(a)(2)(iii) — automatic logoff after period of inactivity
const IDLE_MS = 10 * 60 * 1000 // 10 minutes

export function SessionGuard() {
  const router = useRouter()
  const routerRef = useRef(router)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line react-hooks/refs
  routerRef.current = router

  useEffect(() => {
    function reset() {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        try { await fetch('/auth/logout', { method: 'POST' }) } catch { /* network may be down */ }
        routerRef.current.push('/auth/login')
      }, IDLE_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach((e) => document.removeEventListener(e, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])  

  return null
}
