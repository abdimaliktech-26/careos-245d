import type { EvvComplianceVisit } from '@/lib/evv/compliance'
import type { UserProfile } from '@/types/app'
import { checkRequiredFields, type FormFieldDef } from './intake/required-fields'
import { checkEligibility, type EligibilityInput } from './intake/eligibility'
import { recommendProgram, type RouterInput } from './intake/program-router'
import { validateEvvVisit } from './evv/validate'
import { getOrgStateProfile } from '@/lib/evv/states/resolve'
import { ruleParamsFor } from '@/lib/evv/states/to-rule-params'
import { recordValidationRun, patchRunAi } from './audit/record'
import { enrichRun } from './ai/enrich'
import { rollupVerdict, type ValidationRun, type Verdict, type CheckResult, type Flag } from './types'

type Actor = { organizationId: string; userId: string | null; user?: UserProfile }

/** Run best-effort AI enrichment and patch the run. Never throws. */
async function enrichAndPatch(runId: string, run: ValidationRun): Promise<void> {
  try {
    const result = await enrichRun(run)
    await patchRunAi(runId, {
      ai_status: 'done',
      ai_summary: result.summary,
      ai_model: result.modelId, // actual model id from the AI SDK result, not hardcoded
      flags: [...run.flags, ...result.anomalies.map((a) => ({ code: a.code, severity: 'low' as const, message: a.message }))],
    })
  } catch {
    await patchRunAi(runId, { ai_status: 'error' }).catch(() => {})
  }
}

export type IntakeInput = {
  subjectId: string
  clientId: string | null
  fields: FormFieldDef[]
  formData: Record<string, unknown>
  eligibility: EligibilityInput
  router: RouterInput
}

export type IntakeResult = { runId: string; verdict: Verdict; run: ValidationRun }

/**
 * Validate an intake submission. Returns synchronously after the audit row is
 * committed; AI enrichment runs in the background. Caller should block the
 * submission only when verdict === 'fail'.
 */
export async function runIntakeValidation(input: IntakeInput, actor: Actor): Promise<IntakeResult> {
  const reqd = checkRequiredFields(input.fields, input.formData)
  const elig = checkEligibility(input.eligibility)
  const program = recommendProgram(input.router)

  const checks: CheckResult[] = [...reqd.checks, ...elig.checks]
  const flags: Flag[] = [...reqd.flags, ...elig.flags]

  const run: ValidationRun = {
    subjectType: 'intake_form',
    subjectId: input.subjectId,
    clientId: input.clientId,
    trigger: 'form_submitted',
    verdict: rollupVerdict(checks),
    checks,
    flags,
    programRecommendation: program,
  }

  const { id } = await recordValidationRun(run, actor)
  void enrichAndPatch(id, run) // background; AI never blocks the verdict
  return { runId: id, verdict: run.verdict, run }
}

export type EvvResult = { runId: string; verdict: Verdict; run: ValidationRun }

export async function runEvvValidation(
  visit: EvvComplianceVisit,
  trigger: 'visit_clock_out' | 'daily_sweep',
  actor: Actor,
): Promise<EvvResult> {
  // State-aware rules: resolve the org's profile; fall back to defaults on any
  // config hiccup so validation is never blocked.
  let params
  try {
    const profile = await getOrgStateProfile(actor.organizationId)
    params = ruleParamsFor(profile)
  } catch {
    params = undefined
  }
  const res = validateEvvVisit(visit, params)
  const run: ValidationRun = {
    subjectType: 'evv_visit',
    subjectId: visit.id,
    clientId: visit.clientId,
    trigger,
    verdict: res.verdict,
    checks: res.checks,
    flags: res.flags,
    programRecommendation: null,
  }
  const { id } = await recordValidationRun(run, actor)
  void enrichAndPatch(id, run)
  return { runId: id, verdict: run.verdict, run }
}
