'use client'

import { Fragment, useState } from 'react'
import { EvvVisitDetail } from './evv-visit-detail'
import type { EvvTableVisit } from './evv-visit-types'

const STATUS_STYLE: Record<string, { bg: string; dot: string; label: string }> = {
  scheduled: { bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', dot: 'bg-blue-500', label: 'Scheduled' },
  in_progress: { bg: 'bg-status-warn-bg text-status-warn', dot: 'bg-status-warn', label: 'In Progress' },
  completed: { bg: 'bg-status-ok-bg text-status-ok', dot: 'bg-status-ok', label: 'Completed' },
  missed: { bg: 'bg-status-error-bg text-status-error', dot: 'bg-status-error', label: 'Missed' },
  exception: { bg: 'bg-status-warn-bg text-status-warn', dot: 'bg-status-warn', label: 'Exception' },
}

const HEADERS = ['Date', 'Client', 'Staff', 'Service', 'Actual Time', 'Status', 'Workflow', 'Verification', '']

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function EvvVisitsTable({ visits, canSupervise }: { visits: EvvTableVisit[]; canSupervise: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (visits.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[13px] font-semibold text-foreground">No EVV visits recorded</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Add a visit or check in with GPS so the compliance engine can verify it.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {HEADERS.map((header) => (
              <th key={header || 'expand'} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {visits.map((visit) => {
            const style = STATUS_STYLE[visit.status] ?? STATUS_STYLE.scheduled
            const isExpanded = expandedId === visit.id
            return (
              <Fragment key={visit.id}>
                <tr
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                >
                  <td className="px-4 py-3 text-[13px] font-medium tabular-nums text-foreground">{visit.serviceDate}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{visit.clientName}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{visit.staffName}</td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{visit.serviceName ?? '—'}</td>
                  <td className="px-4 py-3 text-[12px] tabular-nums text-muted-foreground">
                    {formatTime(visit.actualStart)}–{formatTime(visit.actualEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.bg}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-semibold text-muted-foreground">{visit.stageLabel}</td>
                  <td className="px-4 py-3">
                    {visit.exceptionCount > 0 ? (
                      <span className="rounded-full bg-status-warn-bg px-2 py-0.5 text-[10px] font-bold text-status-warn">
                        {visit.exceptionCount} exception{visit.exceptionCount > 1 ? 's' : ''}
                      </span>
                    ) : visit.curesComplete ? (
                      <span className="rounded-full bg-status-ok-bg px-2 py-0.5 text-[10px] font-bold text-status-ok">6/6 verified</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">in progress</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[10px] font-semibold text-primary">
                    {isExpanded ? 'Close' : 'Open'}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={HEADERS.length} className="p-0">
                      <EvvVisitDetail visit={visit} canSupervise={canSupervise} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
