'use client'

import { useState } from 'react'
import { savePlatformSettings } from '@/lib/super-admin/platform-settings'

type Props = {
  settings: Record<string, string>
}

export function StripePriceEditor({ settings }: Props) {
  const [starter, setStarter] = useState(settings.stripe_starter_price_amount ?? '9900')
  const [pro, setPro] = useState(settings.stripe_pro_price_amount ?? '24900')
  const [enterprise, setEnterprise] = useState(settings.stripe_enterprise_price_amount ?? '49900')
  const [starterPriceId, setStarterPriceId] = useState(settings.stripe_starter_price_id ?? '')
  const [proPriceId, setProPriceId] = useState(settings.stripe_pro_price_id ?? '')
  const [enterprisePriceId, setEnterprisePriceId] = useState(settings.stripe_enterprise_price_id ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const res = await savePlatformSettings({
      stripe_starter_price_amount: starter,
      stripe_pro_price_amount: pro,
      stripe_enterprise_price_amount: enterprise,
      stripe_starter_price_id: starterPriceId,
      stripe_pro_price_id: proPriceId,
      stripe_enterprise_price_id: enterprisePriceId,
    })

    setSaving(false)
    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: 'Prices saved.' })
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-foreground">Stripe Pricing</h3>
          <p className="text-[11px] text-muted-foreground">Editable monthly prices for each plan</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-[11px] font-medium ${
          message.type === 'success' ? 'bg-status-ok-bg text-status-ok' : 'bg-status-error-bg text-status-error'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-foreground">Starter</p>
            <p className="text-[10px] text-muted-foreground">Basic 245D compliance features</p>
            <input
              type="text"
              value={starterPriceId}
              onChange={(e) => setStarterPriceId(e.target.value)}
              placeholder="Stripe Price ID (price_...)"
              className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <span className="text-[12px] text-muted-foreground">$</span>
            <input
              type="number"
              value={starter}
              onChange={(e) => setStarter(e.target.value)}
              className="w-20 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] font-semibold text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
            <span className="text-[11px] text-muted-foreground">/mo</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-foreground">Pro</p>
            <p className="text-[10px] text-muted-foreground">Advanced analytics + EVV</p>
            <input
              type="text"
              value={proPriceId}
              onChange={(e) => setProPriceId(e.target.value)}
              placeholder="Stripe Price ID (price_...)"
              className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <span className="text-[12px] text-muted-foreground">$</span>
            <input
              type="number"
              value={pro}
              onChange={(e) => setPro(e.target.value)}
              className="w-20 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] font-semibold text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
            <span className="text-[11px] text-muted-foreground">/mo</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-foreground">Enterprise</p>
            <p className="text-[10px] text-muted-foreground">Custom branding + priority support</p>
            <input
              type="text"
              value={enterprisePriceId}
              onChange={(e) => setEnterprisePriceId(e.target.value)}
              placeholder="Stripe Price ID (price_...)"
              className="mt-2 w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <span className="text-[12px] text-muted-foreground">$</span>
            <input
              type="number"
              value={enterprise}
              onChange={(e) => setEnterprise(e.target.value)}
              className="w-20 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] font-semibold text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring"
            />
            <span className="text-[11px] text-muted-foreground">/mo</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {saving ? 'Saving...' : 'Save Prices'}
        </button>
      </div>
    </div>
  )
}
