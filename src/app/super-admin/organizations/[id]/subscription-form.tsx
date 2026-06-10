'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const PLANS = [
  { value: 'trial', label: 'Trial' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'expired', label: 'Expired' },
]

export function SubscriptionForm({
  orgId,
  currentPlan,
  currentExpiresAt,
  currentPrice,
  stripeCustomerId,
}: {
  orgId: string
  currentPlan: string | null
  currentExpiresAt: string | null
  currentPrice: number | null
  stripeCustomerId?: string | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [plan, setPlan] = useState(currentPlan ?? 'trial')
  const [expiresAt, setExpiresAt] = useState(
    currentExpiresAt ? currentExpiresAt.slice(0, 10) : ''
  )
  const [price, setPrice] = useState(
    currentPrice ? currentPrice.toString() : ''
  )
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`/super-admin/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          planExpiresAt: expiresAt ? `${expiresAt}T23:59:59Z` : null,
          subscriptionPrice: price ? parseFloat(price) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error ?? 'Failed to update' })
        return
      }

      setMessage({ type: 'success', text: 'Subscription updated.' })
      router.refresh()
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleStripeCheckout() {
    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      setMessage({ type: 'error', text: 'Select a paid plan (Starter, Pro, or Enterprise) for Stripe checkout.' })
      return
    }

    setCheckingOut(true)
    setMessage(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          plan,
        }),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to create checkout session' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Billing</p>
      <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A] mb-4">Subscription & Pricing</h2>

      {message && (
        <p className={`mb-4 text-[11px] font-medium rounded-lg px-3 py-2 ${
          message.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
        }`}>
          {message.text}
        </p>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8] block mb-1.5">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-[#3A2A4A] outline-none focus:border-[#E8799E] focus:ring-2 focus:ring-[#E8799E]/10"
          >
            {PLANS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8] block mb-1.5">Expires</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-[#3A2A4A] outline-none focus:border-[#E8799E] focus:ring-2 focus:ring-[#E8799E]/10"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8] block mb-1.5">Monthly Price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-[#3A2A4A] outline-none focus:border-[#E8799E] focus:ring-2 focus:ring-[#E8799E]/10"
          />
        </div>

        {stripeCustomerId && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
            Stripe customer connected
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" loading={saving} className="flex-1">
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={checkingOut}
            onClick={handleStripeCheckout}
            className="flex-1"
          >
            Stripe Checkout
          </Button>
        </div>
      </div>
    </form>
  )
}
