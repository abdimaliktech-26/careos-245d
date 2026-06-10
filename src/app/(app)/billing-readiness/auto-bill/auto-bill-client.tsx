'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { batchGenerateClaims, type AutoBillablePacket } from '@/lib/billing/auto-billing'

export function AutoBillClient({ packets }: { packets: AutoBillablePacket[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ claimIds: string[]; errors: string[] } | null>(null)

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === packets.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(packets.map(p => p.packetFormId)))
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)
    const res = await batchGenerateClaims(Array.from(selected))
    setResult(res)
    setSelected(new Set())
    setGenerating(false)
    router.refresh()
  }

  const formatCurrency = (val: number | null) => {
    if (val === null) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {selected.size === packets.length ? 'Deselect All' : 'Select All'}
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-gray-500">{selected.size} selected</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={selected.size === 0 || generating}
          className="rounded-lg bg-[#E8799E] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          {generating ? 'Generating...' : `Generate Claims (${selected.size})`}
        </button>
      </div>

      {result && (
        <div className="rounded-2xl border p-4 bg-gray-50 text-sm space-y-1">
          {result.claimIds.length > 0 && (
            <p className="text-emerald-600 font-semibold">{result.claimIds.length} claims generated successfully.</p>
          )}
          {result.errors.length > 0 && (
            <div className="text-red-600">
              <p className="font-semibold">{result.errors.length} errors:</p>
              <ul className="list-disc list-inside text-xs mt-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {packets.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-lg font-bold text-[#3A2A4A]">No packets ready for billing</p>
          <p className="text-sm text-gray-500 mt-1">Complete forms with valid signatures will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === packets.length && packets.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">Client</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">Form</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">CPT</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">Completed</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 text-right">Est. Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {packets.map((p) => (
                <tr key={p.packetFormId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.packetFormId)}
                      onChange={() => toggle(p.packetFormId)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-[#3A2A4A]">{p.clientName}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{p.formTemplateCode}</span>
                    <span className="text-[10px] text-gray-400 ml-1">{p.formTemplateName}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.cptCode ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(p.completedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.estimatedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
