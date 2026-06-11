'use client'

import { useState } from 'react'
import { GoalForm } from '@/components/goals/goal-form'
import { Button } from '@/components/ui/button'

type GoalFormModalProps = {
  clientId: string
}

export function GoalFormModal({ clientId }: GoalFormModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Add Goal
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">New Goal</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <GoalForm clientId={clientId} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
