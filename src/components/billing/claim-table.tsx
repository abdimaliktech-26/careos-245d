'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitClaim, payClaim, denyClaim } from '@/lib/billing/actions'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border border-gray-200',
  submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  denied: 'bg-red-50 text-red-700 border border-red-200',
}

const STATUS_ICONS: Record<string, string> = {
  draft: '○',
  submitted: '◎',
  paid: '●',
  denied: '✕',
}

export function ClaimTable({
  claims,
  basePath = '/billing-readiness/claims',
  selectedId,
}: {
  claims: Array<Record<string, unknown>>
  basePath?: string
  selectedId?: string | null
}) {
  const router = useRouter()
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleAction = async (id: string, action: 'submit' | 'pay' | 'deny') => {
    if (action === 'deny') {
      setDenyingId(id)
      setDenyReason('')
      return
    }
    setActionLoading(id)
    setActionError(null)
    const fn = action === 'submit' ? submitClaim : payClaim
    const result = await fn(id)
    if (result.error) setActionError(result.error)
    setActionLoading(null)
    router.refresh()
  }

  const handleDenyConfirm = async () => {
    if (!denyingId) return
    setActionLoading(denyingId)
    setActionError(null)
    const result = await denyClaim(denyingId, denyReason || undefined)
    if (result.error) setActionError(result.error)
    setDenyingId(null)
    setActionLoading(null)
    router.refresh()
  }

  const formatCurrency = (val: unknown) => {
    if (typeof val !== 'number') return null
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  if (claims.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-[#3A2A4A]">No claims yet</p>
        <p className="mt-1 text-[12px] text-[#94A3B8]">Create your first claim to start tracking billing.</p>
      </div>
    )
  }

  return (
    <div>
      {actionError && (
        <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700">
          {actionError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="divide-y divide-gray-50">
          {claims.map((claim) => {
            const status = (claim.status as string) ?? 'draft'
            const id = claim.id as string
            const isSelected = selectedId === id
            const isLoading = actionLoading === id

            return (
              <Link
                key={id}
                href={`${basePath}?selected=${id}${status !== 'draft' ? `&status=${status}` : ''}`}
                className={`flex items-center justify-between px-6 py-4 transition-all ${
                  isSelected
                    ? 'bg-[#EEF2FF] ring-1 ring-inset ring-[#E8799E]/20'
                    : 'hover:bg-gray-50/80'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      status === 'denied' ? 'bg-red-100 text-red-700' :
                      status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {STATUS_ICONS[status] ?? '○'}
                    </span>
                    <p className="text-sm font-semibold text-[#3A2A4A] font-mono text-[11px] tracking-wide">
                      {claim.claim_number as string}
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[status] ?? ''}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {(claim.clients as { legal_name?: string } | null)?.legal_name ?? 'Unknown'}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="font-mono text-[11px]">{claim.cpt_code as string}{(claim.modifier as string) ? `/${claim.modifier as string}` : ''}</span>
                    <span className="text-gray-300">·</span>
                    <span>{claim.service_date as string}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {typeof claim.amount === 'number' && (
                      <span className="text-sm font-bold text-[#3A2A4A]">{formatCurrency(claim.amount)}</span>
                    )}
                    {(claim.payer as string) && (
                      <span className="text-[11px] text-gray-400">{claim.payer as string}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4" onClick={(e) => e.preventDefault()}>
                  <a
                    href={`/api/billing/export/claims/${id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 hover:bg-[#EEF2FF] hover:border-[#C7D2FE] hover:text-[#E8799E] transition-colors flex items-center gap-1"
                    title="Export CMS-1500"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    CMS-1500
                  </a>

                  {isLoading && (
                    <span className="text-[10px] text-gray-400 animate-pulse">Processing...</span>
                  )}

                  {!isLoading && status === 'draft' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(id, 'submit') }}
                      className="rounded-lg bg-[#E8799E] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-all"
                    >
                      Submit
                    </button>
                  )}

                  {!isLoading && status === 'submitted' && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(id, 'pay') }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-all"
                      >
                        Paid
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(id, 'deny') }}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-all"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Deny dialog */}
      {denyingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDenyingId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()} style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
            <p className="text-sm font-bold text-[#3A2A4A] mb-1">Deny Claim</p>
            <p className="text-xs text-gray-500 mb-4">Provide a reason for denying this claim (optional).</p>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none mb-4"
              placeholder="Denial reason..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDenyingId(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDenyConfirm} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                Confirm Deny
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
