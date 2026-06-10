'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'deadline_upcoming', label: 'Upcoming Deadlines' },
  { value: 'deadline_overdue', label: 'Overdue Items' },
  { value: 'missing_signatures', label: 'Missing Signatures' },
  { value: 'missing_forms', label: 'Missing Forms' },
]

const SEVERITIES = [
  { value: '', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
]

export function AlertFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = searchParams.get('type') ?? ''
  const currentSeverity = searchParams.get('severity') ?? ''

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString())
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/compliance/alerts?${next.toString()}`)
  }

  return (
    <div className="flex gap-3">
      <select
        value={currentType}
        onChange={(e) => updateParam('type', e.target.value)}
        className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 bg-white"
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <select
        value={currentSeverity}
        onChange={(e) => updateParam('severity', e.target.value)}
        className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-700 bg-white"
      >
        {SEVERITIES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  )
}
