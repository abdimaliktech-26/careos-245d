'use client'

import { useState } from 'react'
import { GoalForm } from '@/components/goals/goal-form'
import type { Goal } from '@/lib/goals/types'

type GoalEditButtonProps = {
  goal: Goal
  clientId: string
}

export function GoalEditButton({ goal, clientId }: GoalEditButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#3A2A4A]">Edit Goal</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <GoalForm clientId={clientId} goal={goal} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
