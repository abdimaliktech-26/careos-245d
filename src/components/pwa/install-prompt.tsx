'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'careintake-install-dismissed'

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true
  const raw = localStorage.getItem(LS_KEY)
  if (!raw) return false
  const timestamp = parseInt(raw, 10)
  if (isNaN(timestamp)) return false
  return Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000
}

function markDismissed() {
  localStorage.setItem(LS_KEY, String(Date.now()))
}

export default function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStandalone(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!isDismissed()) setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    markDismissed()
    setShow(false)
  }

  if (standalone || !show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 lg:pb-4">
      <div className="mx-auto max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-lg shadow-black/5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#3A2A4A]">Install CareIntake</p>
            <p className="mt-0.5 text-[12px] text-[#64748B]">Install for the best experience</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#64748B] transition-colors hover:bg-gray-100"
            >
              Dismiss
            </button>
            <button
              onClick={handleInstall}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
