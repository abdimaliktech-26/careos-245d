'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ComplianceAlert } from '@/lib/audit/compliance-alerts'

const SEVERITY_STYLES = {
  critical: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-800', icon: 'text-red-500', dot: 'bg-red-500' },
  warning: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800', icon: 'text-amber-500', dot: 'bg-amber-500' },
  info: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', icon: 'text-blue-500', dot: 'bg-blue-500' },
}

export function ComplianceAlertBanner() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/compliance/alerts?limit=3')
      .then((res) => res.json())
      .then((data) => {
        if (data.alerts) setAlerts(data.alerts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/compliance/alerts/${id}/dismiss`, { method: 'POST' })
      setDismissed((prev) => new Set(prev).add(id))
    } catch {}
  }

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id))

  if (loading || visibleAlerts.length === 0) return null

  const topAlert = visibleAlerts[0]
  const style = SEVERITY_STYLES[topAlert.severity]

  return (
    <div className={`mb-4 rounded-xl border ${style.border} ${style.bg} p-3`}>
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-semibold ${style.text}`}>
            {topAlert.title}
          </p>
          {topAlert.description && (
            <p className="mt-0.5 text-[11px] text-gray-600">{topAlert.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/compliance/alerts"
            className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {visibleAlerts.length > 1 ? `View all (${visibleAlerts.length})` : 'Details'}
          </Link>
          <button
            type="button"
            onClick={() => handleDismiss(topAlert.id)}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
