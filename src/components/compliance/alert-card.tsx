'use client'

import Link from 'next/link'
import type { ComplianceAlert, AlertSeverity } from '@/lib/audit/compliance-alerts'

const SEVERITY_CONFIG: Record<AlertSeverity, { bg: string; text: string; dot: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' },
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type AlertCardProps = {
  alert: ComplianceAlert
  onDismiss?: (id: string) => void
  showActions?: boolean
}

export function AlertCard({ alert, onDismiss, showActions = true }: AlertCardProps) {
  const config = SEVERITY_CONFIG[alert.severity]
  const href = alert.relatedPacketId
    ? `/clients?packetId=${alert.relatedPacketId}`
    : alert.relatedPacketFormId
      ? `/clients?formId=${alert.relatedPacketFormId}`
      : undefined

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${config.text} text-[10px] font-bold uppercase tracking-[0.08em]`}>
              {alert.type.replace(/_/g, ' ')}
            </span>
            {alert.daysUntilDue !== null && (
              <span className={`text-[11px] ${alert.daysUntilDue <= 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {alert.daysUntilDue <= 0
                  ? `${Math.abs(alert.daysUntilDue)} day${Math.abs(alert.daysUntilDue) === 1 ? '' : 's'} overdue`
                  : `${alert.daysUntilDue} day${alert.daysUntilDue === 1 ? '' : 's'} left`}
              </span>
            )}
          </div>
          <h3 className="text-[13px] font-semibold text-gray-900">{alert.title}</h3>
          {alert.description && (
            <p className="mt-0.5 text-[12px] leading-relaxed text-gray-600">{alert.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
            <span>{relativeDate(alert.createdAt)}</span>
            {alert.dueDate && (
              <>
                <span>·</span>
                <span>Due {new Date(alert.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </>
            )}
          </div>
        </div>
        {showActions && (
          <div className="flex shrink-0 items-center gap-2">
            {href && (
              <Link
                href={href}
                className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View
              </Link>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
