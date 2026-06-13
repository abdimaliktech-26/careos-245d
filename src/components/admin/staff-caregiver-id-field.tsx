'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaffCaregiverId } from '@/lib/staff-admin/actions'

type StaffCaregiverIdFieldProps = {
  staffId: string
  initial: string | null
}

/** Inline editor for a staff member's EVV aggregator caregiver ID. */
export function StaffCaregiverIdField({ staffId, initial }: StaffCaregiverIdFieldProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initial ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateStaffCaregiverId(staffId, value)
      if (result.error) setError(result.error)
      else {
        setEditing(false)
        router.refresh()
      }
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left text-xs"
        title="EVV aggregator caregiver ID"
      >
        <span className="text-muted-foreground">EVV caregiver ID: </span>
        {initial ? (
          <span className="font-mono text-foreground">{initial}</span>
        ) : (
          <span className="font-semibold text-amber-600">Set ID →</span>
        )}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="UMPI / registry id"
        className="care-input rounded-md border px-2 py-1 font-mono text-xs"
        autoFocus
      />
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        {isPending ? '…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => { setEditing(false); setValue(initial ?? '') }}
        className="text-xs text-muted-foreground"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-status-error">{error}</span>}
    </div>
  )
}
