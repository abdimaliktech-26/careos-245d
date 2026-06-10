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
    <div className="rounded-2xl border border-gray-100 bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#3A2A4A]">Stripe Pricing</h3>
          <p className="text-[11px] text-[#94A3B8]">Editable monthly prices for each plan</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-[11px] font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-[#3A2A4A]">Starter</p>
            <p className="text-[10px] text-[#94A3B8]">Basic 245D compliance features</p>
            <input
              type="text"
              value={starterPriceId}
              onChange={(e) => setStarterPriceId(e.target.value)}
              placeholder="Stripe Price ID (price_...)"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <span className="text-[12px] text-[#94A3B8]">$</span>
            <input
              type="number"
              value={starter}
              onChange={(e) => setStarter(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#3A2A4A] text-right focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
            />
            <span className="text-[11px] text-[#94A3B8]">/mo</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-[#3A2A4A]">Pro</p>
            <p className="text-[10px] text-[#94A3B8]">Advanced analytics + EVV</p>
            <input
              type="text"
              value={proPriceId}
              onChange={(e) => setProPriceId(e.target.value)}
              placeholder="Stripe Price ID (price_...)"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <span className="text-[12px] text-[#94A3B8]">$</span>
            <input
              type="number"
              value={pro}
              onChange={(e) => setPro(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#3A2A4A] text-right focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
            />
            <span className="text-[11px] text-[#94A3B8]">/mo</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-[#3A2A4A]">Enterprise</p>
            <p className="text-[10px] text-[#94A3B8]">Custom branding + priority support</p>
            <input
              type="text"
              value={enterprisePriceId}
              onChange={(e) => setEnterprisePriceId(e.target.value)}
              placeholder="Stripe Price ID (price_...)"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            <span className="text-[12px] text-[#94A3B8]">$</span>
            <input
              type="number"
              value={enterprise}
              onChange={(e) => setEnterprise(e.target.value)}
              className="w-20 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[13px] font-semibold text-[#3A2A4A] text-right focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
            />
            <span className="text-[11px] text-[#94A3B8]">/mo</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
        >
          {saving ? 'Saving...' : 'Save Prices'}
        </button>
      </div>
    </div>
  )
}
