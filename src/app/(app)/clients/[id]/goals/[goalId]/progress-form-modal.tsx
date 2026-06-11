'use client'

import { useState } from 'react'
import { ProgressForm } from '@/components/goals/progress-form'

type ProgressFormModalProps = {
  goalId: string
}

export function ProgressFormModal({ goalId }: ProgressFormModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-full text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#DB2777' }}
      >
        + Record Progress
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Record Progress</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <ProgressForm goalId={goalId} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
