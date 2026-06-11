'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PacketItem = {
  id: string
  packet_type: string
  status: string
  due_date: string
  client_name: string
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-status-ok-bg text-status-ok border-emerald-200',
    in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300',
    needs_signature: 'bg-status-warn-bg text-status-warn border-amber-200',
    overdue: 'bg-status-error-bg text-status-error border-red-200',
    not_started: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${colors[status] ?? 'bg-muted text-muted-foreground'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function BulkPacketActions({ packets }: { packets: PacketItem[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [action, setAction] = useState<'completed' | 'in_progress'>('completed')
  const [, setProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

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
      setSelected(new Set(packets.map(p => p.id)))
    }
  }

  const handleConfirm = async () => {
    setProcessing(true)
    setShowConfirm(false)
    setResult(null)

    let success = 0
    const errors: string[] = []

    for (const id of selected) {
      try {
        const formData = new FormData()
        formData.set('status', action)
        const res = await fetch(`/api/packets/${id}/status`, {
          method: 'PATCH',
          body: formData,
        })
        if (res.ok) success++
        else {
          const data = await res.json()
          errors.push(`${id}: ${data.error ?? 'Request failed'}`)
        }
      } catch {
        errors.push(`${id}: Network error`)
      }
    }

    setResult({ success, errors })
    setSelected(new Set())
    setProcessing(false)
    router.refresh()
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
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={action}
            onChange={e => setAction(e.target.value as 'completed' | 'in_progress')}
            className="rounded-lg border border-border px-3 py-1.5 text-xs bg-card"
          >
            <option value="completed">Mark Complete</option>
            <option value="in_progress">Mark In Progress</option>
          </select>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={selected.size === 0}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            {action === 'completed' ? 'Approve Selected' : 'Update Status'}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-2xl border p-4 bg-muted text-sm space-y-1">
          {result.success > 0 && <p className="text-status-ok font-semibold">{result.success} packets updated.</p>}
          {result.errors.length > 0 && (
            <div className="text-status-error">
              <p className="font-semibold">{result.errors.length} errors:</p>
              <ul className="list-disc list-inside text-xs mt-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowConfirm(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-primary mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Confirm Bulk Action</p>
            <p className="text-xs text-muted-foreground mb-4">
              This will update {selected.size} packet(s) to &ldquo;{action.replace(/_/g, ' ')}&rdquo;.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {packets.map(p => (
              <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{p.client_name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.packet_type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.due_date ? new Date(p.due_date).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
