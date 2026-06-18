import type { CheckResult, Flag, Verdict } from '../types'
import { rollupVerdict } from '../types'

export const VALID_PROGRAMS = ['ICS', 'ICLS', 'Day Services'] as const
export const VALID_WAIVERS = ['CADI', 'DD', 'BI'] as const

export type EligibilityInput = {
  program: string | null
  waiver_type: string | null
  county_of_service: string | null
  service_start_date: string | null
  guardianship_status: string | null
  guardian_name: string | null
  today: string // ISO yyyy-mm-dd, injected for deterministic tests
}

export function checkEligibility(
  input: EligibilityInput,
): { verdict: Verdict; checks: CheckResult[]; flags: Flag[] } {
  const flags: Flag[] = []

  if (!input.program?.trim()) {
    flags.push({ code: 'missing_program', severity: 'critical', message: 'Program is required.' })
  } else if (!VALID_PROGRAMS.includes(input.program as (typeof VALID_PROGRAMS)[number])) {
    flags.push({ code: 'invalid_program', severity: 'critical', message: `Unknown program "${input.program}".` })
  }

  if (!input.waiver_type?.trim()) {
    flags.push({ code: 'missing_waiver_type', severity: 'high', message: 'Waiver type is required.' })
  } else if (!VALID_WAIVERS.includes(input.waiver_type as (typeof VALID_WAIVERS)[number])) {
    flags.push({ code: 'invalid_waiver_type', severity: 'high', message: `Unknown waiver type "${input.waiver_type}".` })
  }

  if (!input.county_of_service?.trim()) {
    flags.push({ code: 'missing_county', severity: 'medium', message: 'County of service is required.' })
  }

  if (!input.service_start_date?.trim()) {
    flags.push({ code: 'missing_start_date', severity: 'high', message: 'Service start date is required.' })
  } else if (input.service_start_date > input.today) {
    flags.push({ code: 'future_start_date', severity: 'high', message: 'Service start date is in the future.' })
  }

  if (input.guardianship_status && input.guardianship_status !== 'self' && !input.guardian_name?.trim()) {
    flags.push({ code: 'missing_guardian', severity: 'high', message: 'Guardian name required when not self-guardianship.' })
  }

  // Critical/high eligibility flags fail; medium warns.
  const checks: CheckResult[] = [{
    key: 'eligibility',
    label: 'Client eligibility data',
    status: flags.some((f) => f.severity === 'critical' || f.severity === 'high')
      ? 'fail'
      : flags.length > 0 ? 'warn' : 'pass',
    detail: flags.length > 0 ? `${flags.length} issue(s)` : undefined,
  }]

  return { verdict: rollupVerdict(checks), checks, flags }
}
