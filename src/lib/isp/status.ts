import type { PlanStatus } from './types'

export type ActivateCheck = { effectiveDate: string | null; serviceCount: number; outcomeCount: number }

/** Pure: can a draft plan be activated? Returns reasons when not. */
export function canActivate(c: ActivateCheck): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (!c.effectiveDate) reasons.push('An effective date is required.')
  if (c.serviceCount < 1) reasons.push('At least one service is required.')
  if (c.outcomeCount < 1) reasons.push('At least one outcome (goal) is required.')
  return { ok: reasons.length === 0, reasons }
}

/** Pure: allowed next statuses from the current one. */
export function nextStatuses(current: PlanStatus): PlanStatus[] {
  switch (current) {
    case 'draft': return ['active']
    case 'active': return ['under_review', 'expired']
    case 'under_review': return ['active', 'expired']
    case 'expired': return []
  }
}
