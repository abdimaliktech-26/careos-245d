'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pill, Check, X, PauseCircle, AlertCircle } from 'lucide-react'
import { recordAdministration } from '@/lib/medications/actions'
import type { MedAdminStatus } from '@/types/app'
import { classifyTiming } from '@/lib/medications/schedule'

export type PassTask = {
  id: string
  dueAt: string
  status: string
  medicationId: string
  clientId: string
  medicationName: string
  dosage: string | null
  route: string | null
  isControlled: boolean
  specialInstructions: string | null
  clientName: string
  clientPhoto: string | null
}

const TIMING_STYLES: Record<string, string> = {
  upcoming: 'border-border',
  due: 'border-primary/50 ring-1 ring-primary/20',
  late: 'border-status-warn/60 ring-1 ring-status-warn/20',
  missed: 'border-status-error/60 ring-1 ring-status-error/20',
}

const STATUS_OPTIONS: { value: MedAdminStatus; label: string; needsReason?: boolean }[] = [
  { value: 'given', label: 'Given' },
  { value: 'refused', label: 'Refused', needsReason: true },
  { value: 'held', label: 'Held', needsReason: true },
  { value: 'missed', label: 'Missed', needsReason: true },
  { value: 'not_available', label: 'Not available' },
  { value: 'late', label: 'Late' },
]

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function MedicationPassBoard({ tasks }: { tasks: PassTask[] }) {
  const router = useRouter()
  const [active, setActive] = useState<PassTask | null>(null)

  const pending = tasks.filter((t) => t.status === 'pending')
  const done = tasks.filter((t) => t.status !== 'pending')

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <Pill className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">No medications due today</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Scheduled doses appear here automatically.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {pending.length === 0 && (
          <p className="rounded-lg bg-status-ok-bg px-4 py-3 text-[13px] font-semibold text-status-ok">
            All doses recorded for now. Nice work.
          </p>
        )}
        {pending.map((t) => {
          const timing = classifyTiming(new Date(t.dueAt), new Date())
          return (
            <button
              key={t.id}
              onClick={() => setActive(t)}
              className={`flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm ${TIMING_STYLES[timing]}`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {t.clientPhoto
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.clientPhoto} alt="" className="h-full w-full object-cover" />
                  : t.clientName.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-foreground">{t.clientName}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {t.medicationName}{t.dosage ? ` · ${t.dosage}` : ''}{t.route ? ` · ${t.route}` : ''}
                </p>
                {t.isControlled && (
                  <span className="mt-1 inline-block rounded bg-status-error-bg px-1.5 py-0.5 text-[10px] font-bold text-status-error">CONTROLLED</span>
                )}
              </div>
              <span className={`shrink-0 text-right text-[13px] font-bold ${timing === 'missed' ? 'text-status-error' : timing === 'late' ? 'text-status-warn' : 'text-foreground'}`}>
                {timeLabel(t.dueAt)}
                <span className="block text-[11px] font-medium capitalize text-muted-foreground">{timing}</span>
              </span>
            </button>
          )
        })}
      </div>

      {done.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recorded today</p>
          <div className="space-y-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-[13px]">
                <Check className="h-4 w-4 text-status-ok" />
                <span className="font-medium text-foreground">{t.clientName}</span>
                <span className="text-muted-foreground">· {t.medicationName}</span>
                <span className="ml-auto text-muted-foreground">{timeLabel(t.dueAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {active && (
        <PassModal task={active} onClose={() => setActive(null)} onDone={() => { setActive(null); router.refresh() }} />
      )}
    </div>
  )
}

function PassModal({ task, onClose, onDone }: { task: PassTask; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<MedAdminStatus>('given')
  const [signature, setSignature] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = STATUS_OPTIONS.find((o) => o.value === status)
  const needsReason = selected?.needsReason ?? false

  async function submit() {
    setError(null)
    if (!signature.trim()) { setError('Signature required.'); return }
    if (needsReason && !reason.trim()) { setError('Reason required for this status.'); return }
    setSaving(true)
    const res = await recordAdministration({
      medicationId: task.medicationId,
      clientId: task.clientId,
      taskId: task.id,
      status,
      signature,
      notes: notes || undefined,
      reason: needsReason ? reason : undefined,
      scheduledFor: task.dueAt,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-modal sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <p className="text-[15px] font-bold text-foreground">{task.clientName}</p>
          <p className="text-[13px] text-muted-foreground">{task.medicationName}{task.dosage ? ` · ${task.dosage}` : ''} · {timeLabel(task.dueAt)}</p>
          {task.specialInstructions && (
            <p className="mt-2 rounded-lg bg-status-warn-bg px-3 py-2 text-[12px] text-status-warn">{task.specialInstructions}</p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setStatus(o.value)}
              className={`rounded-lg border px-2 py-2.5 text-[12px] font-bold transition-colors ${
                status === o.value ? 'border-primary bg-primary text-white' : 'border-border bg-card text-foreground hover:bg-muted'
              }`}
            >
              {o.value === 'given' && <Check className="mx-auto mb-0.5 h-4 w-4" />}
              {o.value === 'refused' && <X className="mx-auto mb-0.5 h-4 w-4" />}
              {o.value === 'held' && <PauseCircle className="mx-auto mb-0.5 h-4 w-4" />}
              {(o.value === 'missed' || o.value === 'not_available' || o.value === 'late') && <AlertCircle className="mx-auto mb-0.5 h-4 w-4" />}
              {o.label}
            </button>
          ))}
        </div>

        {needsReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            rows={2}
            className="mb-3 w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
          />
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="mb-3 w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
        />
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Type your full name to sign"
          className="mb-3 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-[13px] outline-none focus:border-ring focus:ring-2 focus:ring-ring/15"
        />

        {error && <p className="mb-3 rounded-lg bg-status-error-bg px-3 py-2 text-[12px] text-status-error">{error}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[13px] font-semibold text-foreground hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm & Sign'}
          </button>
        </div>
      </div>
    </div>
  )
}
