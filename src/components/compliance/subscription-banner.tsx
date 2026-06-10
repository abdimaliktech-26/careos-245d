'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function SubscriptionBanner() {
  const [state, setState] = useState<{
    plan: string | null
    expiresAt: string | null
    daysLeft: number | null
    loading: boolean
  }>({ plan: null, expiresAt: null, daysLeft: null, loading: true })

  useEffect(() => {
    fetch('/api/org/subscription')
      .then((res) => res.json())
      .then((data) => {
        if (data.plan && data.expiresAt) {
          const now = Date.now()
          const expiry = new Date(data.expiresAt).getTime()
          const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
          setState({ plan: data.plan, expiresAt: data.expiresAt, daysLeft, loading: false })
        } else {
          setState((prev) => ({ ...prev, loading: false }))
        }
      })
      .catch(() => setState((prev) => ({ ...prev, loading: false })))
  }, [])

  if (state.loading || !state.plan || state.plan === 'expired' || state.daysLeft === null) return null

  if (state.daysLeft <= 0) {
    return (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-red-800">Subscription expired</p>
            <p className="mt-0.5 text-[11px] text-red-600">
              Your {state.plan} plan has expired. Contact the super admin to renew.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
          >
            Details
          </Link>
        </div>
      </div>
    )
  }

  if (state.daysLeft <= 14) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-amber-800">
              Subscription expiring {state.daysLeft === 1 ? 'tomorrow' : `in ${state.daysLeft} days`}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-600">
              Your {state.plan} plan expires on {new Date(state.expiresAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
            </p>
          </div>
          <Link
            href="/admin/settings"
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
          >
            Details
          </Link>
        </div>
      </div>
    )
  }

  return null
}
