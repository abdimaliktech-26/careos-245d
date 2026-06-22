import type { LucideIcon } from 'lucide-react'

export type MetricVariant = 'default' | 'warning' | 'danger'

interface MetricCardProps {
  label: string
  value: number
  Icon: LucideIcon
  iconClass: string
  variant?: MetricVariant
}

/**
 * Executive stat card for the Audit Readiness dashboard. Mirrors the dashboard
 * StatCard styling so the module feels native to the Higsi design system.
 */
export function MetricCard({ label, value, Icon, iconClass, variant = 'default' }: MetricCardProps) {
  const isAlert = variant !== 'default' && value > 0
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card p-5 ${
        isAlert
          ? variant === 'danger' ? 'border-status-error/30' : 'border-status-warn/30'
          : 'border-border'
      }`}
      style={{ boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}
    >
      {isAlert && (
        <div
          className={`absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${
            variant === 'danger' ? 'bg-status-error' : 'bg-status-warn'
          }`}
        />
      )}
      <div className="mb-3 flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {isAlert && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              variant === 'danger' ? 'bg-status-error-bg text-status-error' : 'bg-status-warn-bg text-status-warn'
            }`}
          >
            {variant === 'danger' ? 'Critical' : 'Alert'}
          </span>
        )}
      </div>
      <p className="text-[30px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}
