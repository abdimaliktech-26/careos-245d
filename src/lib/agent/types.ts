/** Overall outcome of a validation run. */
export type Verdict = 'pass' | 'warn' | 'fail'

/** Result of one deterministic check. */
export type CheckResult = {
  key: string
  label: string
  status: Verdict
  detail?: string
}

export type FlagSeverity = 'critical' | 'high' | 'medium' | 'low'

/** A specific problem surfaced for human attention. */
export type Flag = {
  code: string
  severity: FlagSeverity
  message: string
  field?: string
}

/** Program routing recommendation (advisory; never auto-applied). */
export type ProgramRecommendation = {
  program: string
  confidence: number // 0..1
  reason: string
}

export type SubjectType = 'intake_form' | 'evv_visit'
export type RunTrigger = 'form_submitted' | 'visit_clock_out' | 'daily_sweep'

/** A complete deterministic validation result, pre-AI. */
export type ValidationRun = {
  subjectType: SubjectType
  subjectId: string
  clientId: string | null
  trigger: RunTrigger
  verdict: Verdict
  checks: CheckResult[]
  flags: Flag[]
  programRecommendation: ProgramRecommendation | null
}

/** Roll a list of check statuses into a single verdict (worst wins). */
export function rollupVerdict(checks: CheckResult[]): Verdict {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  return 'pass'
}
