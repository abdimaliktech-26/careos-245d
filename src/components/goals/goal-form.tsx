'use client'

import { useState } from 'react'
import { createGoal, updateGoal } from '@/lib/goals/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Goal, GoalCategory } from '@/lib/goals/types'

const CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: 'clinical', label: 'Clinical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'developmental', label: 'Developmental' },
  { value: 'social', label: 'Social' },
  { value: 'communication', label: 'Communication' },
  { value: 'daily_living', label: 'Daily Living' },
  { value: 'employment', label: 'Employment' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
]

type GoalFormProps = {
  clientId: string
  goal?: Goal
  onClose: () => void
  onSuccess?: () => void
}

export function GoalForm({ clientId, goal, onClose, onSuccess }: GoalFormProps) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'other')
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '')
  const [startDate, setStartDate] = useState(goal?.start_date ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = goal
      ? await updateGoal(goal.id, {
          title: title || undefined,
          description: description || undefined,
          category,
          targetDate: targetDate || undefined,
        })
      : await createGoal({
          clientId,
          title,
          description: description || undefined,
          category,
          targetDate: targetDate || undefined,
          startDate: startDate || undefined,
        })

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
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
        <label htmlFor="title" className="text-sm font-medium text-foreground">
          Title <span className="text-red-500">*</span>
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g., Improve daily living skills"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border border-[#e5d8cd] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-[#f37d6d] focus:ring-[#f37d6d]/20 transition-colors bg-card resize-none"
          placeholder="Detailed description of the goal..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-foreground">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as GoalCategory)}
          className="w-full border border-[#e5d8cd] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-[#f37d6d] focus:ring-[#f37d6d]/20 transition-colors bg-card"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="startDate" className="text-sm font-medium text-foreground">
            Start Date
          </label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="targetDate" className="text-sm font-medium text-foreground">
            Target Date
          </label>
          <Input
            id="targetDate"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {goal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  )
}
