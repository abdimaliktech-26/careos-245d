'use client'

import { useState } from 'react'
import { recordProgress } from '@/lib/goals/actions'
import { Button } from '@/components/ui/button'

type ProgressFormProps = {
  goalId: string
  onClose: () => void
  onSuccess?: () => void
}

export function ProgressForm({ goalId, onClose, onSuccess }: ProgressFormProps) {
  const [progressNote, setProgressNote] = useState('')
  const [progressScore, setProgressScore] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await recordProgress(goalId, {
      progressNote,
      progressScore: progressScore ? Math.max(0, Math.min(100, parseInt(progressScore, 10))) : null,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setProgressNote('')
      setProgressScore('')
      onSuccess?.()
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="progressNote" className="text-sm font-medium text-gray-700">
          Progress Note <span className="text-red-500">*</span>
        </label>
        <textarea
          id="progressNote"
          value={progressNote}
          onChange={(e) => setProgressNote(e.target.value)}
          rows={4}
          required
          className="w-full border border-[#e5d8cd] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-[#f37d6d] focus:ring-[#f37d6d]/20 transition-colors bg-white resize-none"
          placeholder="Describe the progress made toward this goal..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="progressScore" className="text-sm font-medium text-gray-700">
          Progress Score (0-100)
        </label>
        <input
          id="progressScore"
          type="range"
          min="0"
          max="100"
          value={progressScore || '0'}
          onChange={(e) => setProgressScore(e.target.value)}
          className="w-full accent-[#E8799E]"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span className="font-semibold text-[#E8799E]">{progressScore || '0'}%</span>
          <span>100</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Record Progress
        </Button>
      </div>
    </form>
  )
}
