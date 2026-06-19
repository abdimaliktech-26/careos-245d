import type { PlanStatus } from '@/lib/isp/types'

const STYLES: Record<PlanStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300',
  under_review: 'bg-status-warn-bg text-status-warn border-amber-200',
  expired: 'bg-status-error-bg text-status-error border-red-200',
}

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${STYLES[status]}`}>{status.replace('_', ' ')}</span>
}
