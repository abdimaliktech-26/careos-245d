'use client'

import { useEffect, useState, useCallback } from 'react'
import { getQueueSize } from '@/lib/pwa/offline-queue'
import { SyncManager } from '@/lib/pwa/sync-manager'

type BannerState = { online: boolean; pending: number; visible: boolean }

export default function OfflineBanner() {
  const [state, setState] = useState<BannerState>({ online: true, pending: 0, visible: false })
  const [dismissed, setDismissed] = useState(false)

  const updateStatus = useCallback(async () => {
    const online = navigator.onLine
    const pending = online ? 0 : await getQueueSize()
    setState((prev) => ({
      online,
      pending,
      visible: prev.visible || !online || pending > 0,
    }))
  }, [])

  useEffect(() => {
    const goOnline = () => {
      setState((prev) => ({ ...prev, online: true }))
      SyncManager.getInstance().syncNow()
      setTimeout(() => setState((prev) => ({ ...prev, visible: false })), 2000)
    }
    const goOffline = () => {
      getQueueSize().then((pending) =>
        setState({ online: false, pending, visible: true })
      )
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateStatus()

    const interval = setInterval(() => {
      if (!navigator.onLine) {
        getQueueSize().then((n) => setState((prev) => ({ ...prev, pending: n })))
      }
    }, 10000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [updateStatus])

  if (!state.visible || dismissed) return null

  if (state.online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
        <div className="flex items-center justify-center gap-2 bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Connected
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>You&apos;re offline — {state.pending} change{state.pending !== 1 ? 's' : ''} pending sync</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-600/50 text-white hover:bg-amber-600 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
