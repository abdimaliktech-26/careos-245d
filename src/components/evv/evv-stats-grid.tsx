import type { ComplianceSummary } from '@/lib/evv/compliance'

type StatCard = {
  label: string
  value: string | number
  tone: 'neutral' | 'ok' | 'warn' | 'error' | 'brand'
  hint?: string
}

const TONE_STYLES: Record<StatCard['tone'], { text: string; bg: string }> = {
  neutral: { text: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-500/15' },
  ok: { text: 'text-status-ok', bg: 'bg-status-ok-bg' },
  warn: { text: 'text-status-warn', bg: 'bg-status-warn-bg' },
  error: { text: 'text-status-error', bg: 'bg-status-error-bg' },
  brand: { text: 'text-primary', bg: 'bg-accent' },
}

export function EvvStatsGrid({ summary }: { summary: ComplianceSummary }) {
  const cards: StatCard[] = [
    { label: 'Scheduled', value: summary.scheduledCount, tone: 'neutral' },
    { label: 'Active Visits', value: summary.activeCount, tone: 'warn' },
    { label: 'Completed', value: summary.completedCount, tone: 'ok' },
    { label: 'Missed', value: summary.missedCount, tone: 'error' },
    { label: 'Late Check-Ins', value: summary.lateCheckInCount, tone: 'warn' },
    { label: 'GPS Exceptions', value: summary.gpsExceptionCount, tone: 'error' },
    {
      label: 'Compliance Score',
      value: `${summary.complianceRate}%`,
      tone: summary.complianceRate >= 90 ? 'ok' : summary.complianceRate >= 70 ? 'warn' : 'error',
      hint: `${summary.verifiedCount}/${summary.completedCount} visits verified`,
    },
    {
      label: 'Billable Hours',
      value: summary.billableHours,
      tone: 'brand',
      hint: 'From verified time records',
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const tone = TONE_STYLES[card.tone]
        return (
          <div key={card.label} className={`rounded-2xl border border-border shadow-sm px-5 py-4 ${tone.bg}`}>
            <p className={`text-2xl font-black tabular-nums ${tone.text}`}>{card.value}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {card.label}
            </p>
            {card.hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{card.hint}</p>}
          </div>
        )
      })}
    </div>
  )
}
