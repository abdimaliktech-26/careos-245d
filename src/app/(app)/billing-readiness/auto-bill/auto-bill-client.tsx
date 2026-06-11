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
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
          >
            {selected.size === packets.length ? 'Deselect All' : 'Select All'}
          </button>
          {selected.size > 0 && (
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={selected.size === 0 || generating}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          {generating ? 'Generating...' : `Generate Claims (${selected.size})`}
        </button>
      </div>

      {result && (
        <div className="rounded-2xl border p-4 bg-muted text-sm space-y-1">
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
        <div className="rounded-2xl border border-border bg-card p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-lg font-bold text-foreground">No packets ready for billing</p>
          <p className="text-sm text-muted-foreground mt-1">Complete forms with valid signatures will appear here.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === packets.length && packets.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Form</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">CPT</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Completed</th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground text-right">Est. Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {packets.map((p) => (
                <tr key={p.packetFormId} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.packetFormId)}
                      onChange={() => toggle(p.packetFormId)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.clientName}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">{p.formTemplateCode}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">{p.formTemplateName}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.cptCode ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
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
