'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const TYPE_OPTIONS = [
  { value: 'signature', label: 'Signatures', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'form',      label: 'Forms',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'incident',  label: 'Incidents',  color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'evv',       label: 'EVV',        color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'note',      label: 'Notes',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'document',  label: 'Documents',  color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'message',   label: 'Messages',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'goal',      label: 'Goals',      color: 'bg-teal-50 text-teal-700 border-teal-200' },
]

export function ActivityFilters({
  activeFilters,
  total,
  filtered,
}: {
  activeFilters: string[]
  total: number
  filtered: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const toggle = useCallback(
    (value: string) => {
      const next = activeFilters.includes(value)
        ? activeFilters.filter((f) => f !== value)
        : [...activeFilters, value]
      const params = new URLSearchParams(searchParams.toString())
      if (next.length > 0) params.set('type', next.join(','))
      else params.delete('type')
      router.push(`?${params.toString()}`)
    },
    [activeFilters, router, searchParams]
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
        Filter: {filtered}/{total}
      </span>
      {TYPE_OPTIONS.map((opt) => {
        const isActive = activeFilters.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
              isActive ? opt.color : 'border-border text-muted-foreground bg-card hover:border-gray-300'
            }`}
          >
            {opt.label}
            {isActive && (
              <svg className="ml-1" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
