'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DismissButton({ alertId }: { alertId: string }) {
  const router = useRouter()
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await fetch(`/api/compliance/alerts/${alertId}/dismiss`, { method: 'POST' })
      router.refresh()
    } catch {
      setDismissing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDismiss}
      disabled={dismissing}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {dismissing ? 'Dismissing…' : 'Dismiss'}
    </button>
  )
}
