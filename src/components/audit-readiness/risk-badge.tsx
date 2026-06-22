import type { AuditRiskLevel } from '@/lib/audit-readiness/score'

const RISK_STYLES: Record<AuditRiskLevel, { chip: string; dot: string; label: string; cell: string }> = {
  high:     { chip: 'bg-status-error-bg text-status-error', dot: 'bg-status-error', label: 'High Risk',     cell: 'bg-red-500' },
  moderate: { chip: 'bg-status-warn-bg text-status-warn',   dot: 'bg-status-warn',  label: 'Moderate Risk', cell: 'bg-amber-500' },
  low:      { chip: 'bg-status-ok-bg text-status-ok',       dot: 'bg-status-ok',    label: 'Low Risk',      cell: 'bg-emerald-500' },
}

export function RiskBadge({ level }: { level: AuditRiskLevel }) {
  const s = RISK_STYLES[level]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function riskCellClass(level: AuditRiskLevel): string {
  return RISK_STYLES[level].cell
}
