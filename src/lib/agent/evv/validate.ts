import {
  checkCuresActElements,
  detectVisitExceptions,
  CURES_ACT_ELEMENTS,
  type EvvComplianceVisit,
  type ExceptionSeverity,
  type RuleParams,
} from '@/lib/evv/compliance'
import type { CheckResult, Flag, FlagSeverity, Verdict } from '../types'
import { rollupVerdict } from '../types'

function mapSeverity(s: ExceptionSeverity): FlagSeverity {
  // Engine uses 'critical' | 'high' | 'medium'; Flag adds 'low' (unused here).
  return s
}

export function validateEvvVisit(
  visit: EvvComplianceVisit,
  params?: RuleParams,
): { verdict: Verdict; checks: CheckResult[]; flags: Flag[] } {
  const cures = checkCuresActElements(visit, params)
  const exceptions = detectVisitExceptions(visit, params ? { params } : {})

  const flags: Flag[] = []

  for (const key of cures.missing) {
    const label = CURES_ACT_ELEMENTS.find((e) => e.key === key)?.label ?? key
    flags.push({ code: `cures_missing_${key}`, severity: 'high', message: `Missing Cures Act element: ${label}.`, field: key })
  }

  for (const ex of exceptions) {
    flags.push({ code: `evv_${ex.type}`, severity: mapSeverity(ex.severity), message: ex.message })
  }

  const checks: CheckResult[] = [
    {
      key: 'cures_act',
      label: '21st Century Cures Act elements',
      status: cures.isComplete ? 'pass' : 'fail',
      detail: cures.isComplete ? undefined : `${cures.missing.length} missing`,
    },
    {
      key: 'exceptions',
      label: 'EVV exceptions',
      status: exceptions.some((e) => e.severity === 'critical' || e.severity === 'high')
        ? 'fail'
        : exceptions.length > 0 ? 'warn' : 'pass',
      detail: exceptions.length > 0 ? `${exceptions.length} exception(s)` : undefined,
    },
  ]

  return { verdict: rollupVerdict(checks), checks, flags }
}
