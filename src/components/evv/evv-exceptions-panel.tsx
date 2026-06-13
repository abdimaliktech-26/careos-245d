'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import type { EvvException } from '@/lib/evv/compliance'
import { resolveException } from '@/lib/evv/workflow-actions'
import { RESOLUTION_CODES } from '@/lib/evv/resolution-codes'

const SEVERITY_STYLES: Record<EvvException['severity'], string> = {
  critical: 'bg-status-error-bg text-status-error',
  high: 'bg-status-warn-bg text-status-warn',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
}

const TYPE_LABELS: Record<EvvException['type'], string> = {
  late_check_in: 'Late check-in',
  early_check_out: 'Early check-out',
  missing_check_out: 'Missing check-out',
  missed_visit: 'Missed visit',
  geofence_violation: 'GPS exception',
  incomplete_documentation: 'Incomplete documentation',
  missing_progress_note: 'Missing progress note',
  overlapping_visits: 'Overlapping visits',
  impossible_travel: 'Impossible travel',
}

export function EvvExceptionsPanel({ exceptions, canResolve }: { exceptions: EvvException[]; canResolve: boolean }) {
  const router = useRouter()
  const [openVisitId, setOpenVisitId] = useState<string | null>(null)
  const [code, setCode] = useState<string>(RESOLUTION_CODES[0].code)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (exceptions.length === 0) return null

  async function handleResolve(visitId: string) {
    setPending(true)
    setError(null)
    const result = await resolveException(visitId, code, note)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpenVisitId(null)
    setNote('')
    router.refresh()
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <AlertTriangle className="h-4 w-4 text-status-warn" />
        <h2 className="text-[13px] font-bold text-foreground">Open Exceptions ({exceptions.length})</h2>
        <span className="text-[11px] text-muted-foreground">
          Resolve each with a reason code — resolutions are audit-logged.
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {exceptions.map((exception, index) => (
          <li key={`${exception.visitId}-${exception.type}-${index}`} className="px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEVERITY_STYLES[exception.severity]}`}>
                {exception.severity}
              </span>
              <span className="text-[12px] font-semibold text-foreground">{TYPE_LABELS[exception.type]}</span>
              <span className="text-[11px] text-muted-foreground">
                {exception.serviceDate}
                {exception.clientName ? ` · ${exception.clientName}` : ''}
                {exception.staffName ? ` · ${exception.staffName}` : ''}
              </span>
              {canResolve && (
                <button
                  type="button"
                  onClick={() => setOpenVisitId(openVisitId === exception.visitId ? null : exception.visitId)}
                  className="ml-auto rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {openVisitId === exception.visitId ? 'Cancel' : 'Resolve'}
                </button>
              )}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">{exception.message}</p>

            {canResolve && openVisitId === exception.visitId && (
              <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <select
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="care-input w-full rounded-xl border px-3 py-2 text-sm"
                >
                  {RESOLUTION_CODES.map((option) => (
                    <option key={option.code} value={option.code}>{option.label}</option>
                  ))}
                </select>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Explanation (required, kept for audit)"
                  className="care-input w-full rounded-xl border px-3 py-2 text-sm"
                />
                {error && <p className="text-[11px] text-status-error">{error}</p>}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleResolve(exception.visitId)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? 'Resolving…' : 'Resolve all exceptions on this visit'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
