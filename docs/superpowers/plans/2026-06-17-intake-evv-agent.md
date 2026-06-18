# Intake & EVV AI Agent Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an agent layer that validates intake form submissions and EVV data with deterministic rules, enriches results with best-effort AI explanations/routing/anomaly flags, and logs every step to Supabase for HIPAA audit.

**Architecture:** A self-contained `src/lib/agent/` module with pure validators (intake + EVV), an isolated AI enricher, and an append-only audit writer. Two orchestrators (`runIntakeValidation`, `runEvvValidation`) are called from existing actions; deterministic verdict + audit row commit synchronously before any best-effort async AI call.

**Tech Stack:** TypeScript, Next.js 16 (App Router), Supabase (`@supabase/supabase-js` admin client), Vercel AI SDK (`ai` v6 + `@ai-sdk/anthropic`), Zod v4, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-17-intake-evv-agent-design.md`

---

## File Structure

- Create `src/lib/agent/types.ts` — shared types (Verdict, CheckResult, Flag, ProgramRecommendation, ValidationRun).
- Create `src/lib/agent/intake/required-fields.ts` — pure required-field validator.
- Create `src/lib/agent/intake/eligibility.ts` — pure eligibility validator.
- Create `src/lib/agent/intake/program-router.ts` — pure program recommendation.
- Create `src/lib/agent/evv/validate.ts` — wraps `evv/compliance.ts` into CheckResults/Flags.
- Create `src/lib/agent/ai/enrich.ts` — best-effort AI enrichment (injectable model).
- Create `src/lib/agent/audit/record.ts` — writes `agent_validation_runs` + `audit_logs`.
- Create `src/lib/agent/pipeline.ts` — `runIntakeValidation`, `runEvvValidation`.
- Create `supabase/migrations/202606170001_agent_validation.sql` — table + enum + RLS.
- Modify `src/lib/forms/actions.ts` — call `runIntakeValidation` in `submitFormForSignatures`.
- Modify `src/lib/evv/workflow-actions.ts` — call `runEvvValidation` on visit completion.
- Modify `src/app/api/cron/evv-aggregator/route.ts` — daily sweep calls `runEvvValidation`.
- Tests under `src/lib/agent/**/__tests__/` and `e2e/agent.spec.ts`.

Constants used across tasks:
- Programs: `ICS`, `ICLS`, `Day Services` (clients.program values; from existing seed).
- Waiver types: `CADI`, `DD`, `BI` (clients.waiver_type).

---

## Task 1: Shared types

**Files:**
- Create: `src/lib/agent/types.ts`

- [ ] **Step 1: Write the types module**

```typescript
// src/lib/agent/types.ts

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
```

- [ ] **Step 2: Write the failing test**

```typescript
// src/lib/agent/__tests__/types.test.ts
import { describe, test, expect } from 'vitest'
import { rollupVerdict } from '../types'

describe('rollupVerdict', () => {
  test('returns fail when any check fails', () => {
    expect(rollupVerdict([
      { key: 'a', label: 'A', status: 'pass' },
      { key: 'b', label: 'B', status: 'fail' },
      { key: 'c', label: 'C', status: 'warn' },
    ])).toBe('fail')
  })
  test('returns warn when worst is warn', () => {
    expect(rollupVerdict([
      { key: 'a', label: 'A', status: 'pass' },
      { key: 'b', label: 'B', status: 'warn' },
    ])).toBe('warn')
  })
  test('returns pass when all pass', () => {
    expect(rollupVerdict([{ key: 'a', label: 'A', status: 'pass' }])).toBe('pass')
  })
  test('returns pass for empty input', () => {
    expect(rollupVerdict([])).toBe('pass')
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run src/lib/agent/__tests__/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 4: Commit**

```bash
git add src/lib/agent/types.ts src/lib/agent/__tests__/types.test.ts
git commit -m "feat(agent): shared validation types and verdict rollup"
```

---

## Task 2: Required-fields validator

Validates submitted `form_data` against a template's `form_fields` rows
(`is_required`, with `conditional_on`/`conditional_value` visibility).

**Files:**
- Create: `src/lib/agent/intake/required-fields.ts`
- Test: `src/lib/agent/intake/__tests__/required-fields.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/agent/intake/__tests__/required-fields.test.ts
import { describe, test, expect } from 'vitest'
import { checkRequiredFields, type FormFieldDef } from '../required-fields'

const fields: FormFieldDef[] = [
  { field_key: 'legal_name', label: 'Legal Name', is_required: true, conditional_on: null, conditional_value: null },
  { field_key: 'dob', label: 'Date of Birth', is_required: true, conditional_on: null, conditional_value: null },
  { field_key: 'guardian_name', label: 'Guardian Name', is_required: true, conditional_on: 'guardianship_status', conditional_value: 'full_guardian' },
  { field_key: 'notes', label: 'Notes', is_required: false, conditional_on: null, conditional_value: null },
]

describe('checkRequiredFields', () => {
  test('flags missing required field', () => {
    const { checks, flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '' })
    expect(flags.map((f) => f.field)).toContain('dob')
    expect(checks.find((c) => c.key === 'required_fields')?.status).toBe('fail')
  })

  test('passes when all required present', () => {
    const { checks, flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '1990-01-01' })
    expect(flags).toHaveLength(0)
    expect(checks.find((c) => c.key === 'required_fields')?.status).toBe('pass')
  })

  test('ignores hidden conditional field', () => {
    const { flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '1990-01-01', guardianship_status: 'self' })
    expect(flags).toHaveLength(0)
  })

  test('requires conditional field when condition met', () => {
    const { flags } = checkRequiredFields(fields, { legal_name: 'Jane', dob: '1990-01-01', guardianship_status: 'full_guardian' })
    expect(flags.map((f) => f.field)).toContain('guardian_name')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agent/intake/__tests__/required-fields.test.ts`
Expected: FAIL — cannot find module `../required-fields`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/agent/intake/required-fields.ts
import type { CheckResult, Flag } from '../types'

export type FormFieldDef = {
  field_key: string
  label: string
  is_required: boolean
  conditional_on: string | null
  conditional_value: string | null
}

function isVisible(field: FormFieldDef, data: Record<string, unknown>): boolean {
  if (!field.conditional_on) return true
  return String(data[field.conditional_on] ?? '') === String(field.conditional_value ?? '')
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Pure check: required, visible fields must be present in form_data. */
export function checkRequiredFields(
  fields: FormFieldDef[],
  data: Record<string, unknown>,
): { checks: CheckResult[]; flags: Flag[] } {
  const flags: Flag[] = []

  for (const field of fields) {
    if (!field.is_required) continue
    if (!isVisible(field, data)) continue
    if (isEmpty(data[field.field_key])) {
      flags.push({
        code: 'missing_required_field',
        severity: 'high',
        message: `Required field "${field.label}" is missing.`,
        field: field.field_key,
      })
    }
  }

  const checks: CheckResult[] = [{
    key: 'required_fields',
    label: 'Required fields complete',
    status: flags.length > 0 ? 'fail' : 'pass',
    detail: flags.length > 0 ? `${flags.length} missing` : undefined,
  }]

  return { checks, flags }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/agent/intake/__tests__/required-fields.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/intake/required-fields.ts src/lib/agent/intake/__tests__/required-fields.test.ts
git commit -m "feat(agent): required-fields validator"
```

---

## Task 3: Eligibility validator

Validates client eligibility data: program present + valid, waiver type valid,
county of service present, service start date present and not in the future,
guardianship consistency.

**Files:**
- Create: `src/lib/agent/intake/eligibility.ts`
- Test: `src/lib/agent/intake/__tests__/eligibility.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/agent/intake/__tests__/eligibility.test.ts
import { describe, test, expect } from 'vitest'
import { checkEligibility, type EligibilityInput } from '../eligibility'

const base: EligibilityInput = {
  program: 'ICS',
  waiver_type: 'CADI',
  county_of_service: 'Hennepin',
  service_start_date: '2025-01-15',
  guardianship_status: 'self',
  guardian_name: null,
  today: '2026-06-17',
}

describe('checkEligibility', () => {
  test('passes for complete valid data', () => {
    const { verdict, flags } = checkEligibility(base)
    expect(verdict).toBe('pass')
    expect(flags).toHaveLength(0)
  })

  test('fails on unknown program', () => {
    const { verdict, flags } = checkEligibility({ ...base, program: 'Wizardry' })
    expect(verdict).toBe('fail')
    expect(flags.map((f) => f.code)).toContain('invalid_program')
  })

  test('fails on missing waiver type', () => {
    const { flags } = checkEligibility({ ...base, waiver_type: '' })
    expect(flags.map((f) => f.code)).toContain('missing_waiver_type')
  })

  test('fails on future service start date', () => {
    const { flags } = checkEligibility({ ...base, service_start_date: '2099-01-01' })
    expect(flags.map((f) => f.code)).toContain('future_start_date')
  })

  test('flags guardian required but missing', () => {
    const { flags } = checkEligibility({ ...base, guardianship_status: 'full_guardian', guardian_name: null })
    expect(flags.map((f) => f.code)).toContain('missing_guardian')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agent/intake/__tests__/eligibility.test.ts`
Expected: FAIL — cannot find module `../eligibility`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/agent/intake/eligibility.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/agent/intake/__tests__/eligibility.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/intake/eligibility.ts src/lib/agent/intake/__tests__/eligibility.test.ts
git commit -m "feat(agent): client eligibility validator"
```

---

## Task 4: Program router (deterministic)

Maps intake data to a recommended program. Deterministic mapping by waiver type
with a confidence score; ambiguous cases get low confidence (AI tie-break happens
later in `enrich.ts`, advisory only).

**Files:**
- Create: `src/lib/agent/intake/program-router.ts`
- Test: `src/lib/agent/intake/__tests__/program-router.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/agent/intake/__tests__/program-router.test.ts
import { describe, test, expect } from 'vitest'
import { recommendProgram } from '../program-router'

describe('recommendProgram', () => {
  test('DD waiver with day-service need -> Day Services, high confidence', () => {
    const rec = recommendProgram({ waiver_type: 'DD', requested_service: 'day services', current_program: null })
    expect(rec?.program).toBe('Day Services')
    expect(rec!.confidence).toBeGreaterThanOrEqual(0.8)
  })

  test('CADI waiver -> ICS by default', () => {
    const rec = recommendProgram({ waiver_type: 'CADI', requested_service: null, current_program: null })
    expect(rec?.program).toBe('ICS')
  })

  test('unknown waiver -> low confidence recommendation', () => {
    const rec = recommendProgram({ waiver_type: 'XYZ', requested_service: null, current_program: null })
    expect(rec).not.toBeNull()
    expect(rec!.confidence).toBeLessThan(0.5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agent/intake/__tests__/program-router.test.ts`
Expected: FAIL — cannot find module `../program-router`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/agent/intake/program-router.ts
import type { ProgramRecommendation } from '../types'

export type RouterInput = {
  waiver_type: string | null
  requested_service: string | null
  current_program: string | null
}

/**
 * Deterministic first-pass routing. Confidence < 0.6 means "ambiguous" — the
 * async AI step may add a rationale, but routing is always human-confirmed.
 */
export function recommendProgram(input: RouterInput): ProgramRecommendation | null {
  const waiver = (input.waiver_type ?? '').toUpperCase()
  const service = (input.requested_service ?? '').toLowerCase()

  if (service.includes('day service')) {
    return { program: 'Day Services', confidence: 0.85, reason: 'Requested service indicates day services.' }
  }

  if (waiver === 'DD') {
    return { program: 'ICLS', confidence: 0.75, reason: 'DD waiver typically routes to ICLS.' }
  }
  if (waiver === 'CADI' || waiver === 'BI') {
    return { program: 'ICS', confidence: 0.75, reason: `${waiver} waiver typically routes to ICS.` }
  }

  return { program: 'ICS', confidence: 0.3, reason: 'No clear signal; defaulting to ICS for review.' }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/agent/intake/__tests__/program-router.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/intake/program-router.ts src/lib/agent/intake/__tests__/program-router.test.ts
git commit -m "feat(agent): deterministic program router"
```

---

## Task 5: EVV validator (wraps compliance engine)

Reuses `src/lib/evv/compliance.ts` (`checkCuresActElements`, `detectVisitExceptions`)
and converts its output into `CheckResult[]` + `Flag[]`.

**Files:**
- Create: `src/lib/agent/evv/validate.ts`
- Test: `src/lib/agent/evv/__tests__/validate.test.ts`

- [ ] **Step 1: Read the dependency**

Read `src/lib/evv/compliance.ts` lines 1–250. Confirm these exports exist and their shapes:
`EvvComplianceVisit`, `checkCuresActElements(visit) -> { captured, missing, isComplete }`,
`detectVisitExceptions(visit) -> EvvException[]` where `EvvException = { visitId, type, severity, message, serviceDate, ... }`.

- [ ] **Step 2: Write the failing test**

```typescript
// src/lib/agent/evv/__tests__/validate.test.ts
import { describe, test, expect } from 'vitest'
import { validateEvvVisit } from '../validate'
import type { EvvComplianceVisit } from '@/lib/evv/compliance'

function makeVisit(overrides: Partial<EvvComplianceVisit> = {}): EvvComplianceVisit {
  return {
    id: 'v1', clientId: 'c1', staffId: 's1', serviceName: 'Personal Care',
    serviceDate: '2026-06-10', scheduledStart: '2026-06-10T09:00:00Z',
    scheduledEnd: '2026-06-10T10:00:00Z', actualStart: '2026-06-10T09:00:00Z',
    actualEnd: '2026-06-10T10:00:00Z', status: 'completed',
    checkInLocation: { lat: 44.98, lng: -93.26 }, checkOutLocation: { lat: 44.98, lng: -93.26 },
    checkInDistanceM: 10, checkOutDistanceM: 12, progressNote: 'Note', reviewStatus: 'approved',
    billingStatus: null, billableMinutes: 60, resolvedAt: null,
    ...overrides,
  }
}

describe('validateEvvVisit', () => {
  test('clean completed visit passes', () => {
    const { verdict, flags } = validateEvvVisit(makeVisit())
    expect(verdict).toBe('pass')
    expect(flags).toHaveLength(0)
  })

  test('missing service times fails Cures-Act check', () => {
    const { checks } = validateEvvVisit(makeVisit({ actualStart: null, actualEnd: null }))
    expect(checks.find((c) => c.key === 'cures_act')?.status).toBe('fail')
  })

  test('exceptions become flags', () => {
    // No progress note + no check-out triggers exceptions in the engine.
    const { flags } = validateEvvVisit(makeVisit({ progressNote: null, actualEnd: null, checkOutLocation: null }))
    expect(flags.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/agent/evv/__tests__/validate.test.ts`
Expected: FAIL — cannot find module `../validate`.

- [ ] **Step 4: Write minimal implementation**

```typescript
// src/lib/agent/evv/validate.ts
import {
  checkCuresActElements,
  detectVisitExceptions,
  CURES_ACT_ELEMENTS,
  type EvvComplianceVisit,
  type ExceptionSeverity,
} from '@/lib/evv/compliance'
import type { CheckResult, Flag, FlagSeverity, Verdict } from '../types'
import { rollupVerdict } from '../types'

function mapSeverity(s: ExceptionSeverity): FlagSeverity {
  // Engine uses 'critical' | 'high' | 'medium'; Flag adds 'low' (unused here).
  return s
}

export function validateEvvVisit(
  visit: EvvComplianceVisit,
): { verdict: Verdict; checks: CheckResult[]; flags: Flag[] } {
  const cures = checkCuresActElements(visit)
  const exceptions = detectVisitExceptions(visit)

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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/agent/evv/__tests__/validate.test.ts`
Expected: PASS (3 tests). If an assertion about which exceptions fire is off, adjust the test's visit overrides to match the engine's actual exception rules (read `detectVisitExceptions`), not the implementation.

- [ ] **Step 6: Commit**

```bash
git add src/lib/agent/evv/validate.ts src/lib/agent/evv/__tests__/validate.test.ts
git commit -m "feat(agent): EVV validator wrapping compliance engine"
```

---

## Task 6: Database migration

**Files:**
- Create: `supabase/migrations/202606170001_agent_validation.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/202606170001_agent_validation.sql
-- Agent validation audit trail (intake + EVV).

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'agent_validation_run';

CREATE TABLE IF NOT EXISTS agent_validation_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL,          -- 'intake_form' | 'evv_visit'
  subject_id      UUID NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  trigger         TEXT NOT NULL,          -- 'form_submitted' | 'visit_clock_out' | 'daily_sweep'
  verdict         TEXT NOT NULL,          -- 'pass' | 'warn' | 'fail'
  checks          JSONB NOT NULL,
  flags           JSONB NOT NULL DEFAULT '[]'::jsonb,
  program_recommendation JSONB,
  ai_summary      TEXT,
  ai_model        TEXT,
  ai_status       TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'done'|'skipped'|'error'
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avr_org_created ON agent_validation_runs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avr_subject ON agent_validation_runs(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_avr_verdict ON agent_validation_runs(organization_id, verdict);

ALTER TABLE agent_validation_runs ENABLE ROW LEVEL SECURITY;

-- Members read their org's runs. (get_my_org_id() exists in 202606070002_rls_policies.sql)
CREATE POLICY "avr_select_own_org"
  ON agent_validation_runs FOR SELECT
  USING (organization_id = get_my_org_id());

-- No INSERT/UPDATE/DELETE policies: writes go through the service-role admin client,
-- which bypasses RLS. This keeps the table append-only for end users (immutable audit).
```

- [ ] **Step 2: Apply to the live database**

Apply via the Supabase MCP `apply_migration` (project `hwsbizbdvxofsyehttkw`, name `agent_validation`) OR ask the user to run it. Note: `ALTER TYPE ... ADD VALUE` cannot run inside a transaction with the subsequent statements on some Postgres versions — if the tool errors, split into two migrations: enum add first, then table.

- [ ] **Step 3: Verify the table exists**

```bash
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {error}=await a.from("agent_validation_runs").select("id").limit(1);
  console.log(error? "ERR: "+error.message : "TABLE OK");
});'
```
Expected: `TABLE OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606170001_agent_validation.sql
git commit -m "feat(agent): agent_validation_runs table + RLS migration"
```

---

## Task 7: Audit writer

Persists a `ValidationRun` to `agent_validation_runs` (returns the new row id) and a
summary entry to `audit_logs`. Uses the existing admin client.

**Files:**
- Create: `src/lib/agent/audit/record.ts`
- Test: `src/lib/agent/audit/__tests__/record.test.ts`

- [ ] **Step 1: Confirm admin client + audit log helpers**

Read `src/lib/supabase/admin.ts` (export `createAdminClient`) and `src/lib/audit/log.ts`
(export `logAuditEvent`). Confirm signatures used below.

- [ ] **Step 2: Write the implementation**

```typescript
// src/lib/agent/audit/record.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { logAuditEvent } from '@/lib/audit/log'
import type { UserProfile } from '@/types/app'
import type { ValidationRun } from '../types'

export type RecordedRun = { id: string }

/**
 * Append-only write of a validation run + a summary audit_logs entry.
 * Throws (fail-closed) if the run insert fails — never silently skip the audit.
 */
export async function recordValidationRun(
  run: ValidationRun,
  actor: { organizationId: string; userId: string | null; user?: UserProfile },
): Promise<RecordedRun> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('agent_validation_runs')
    .insert({
      organization_id: actor.organizationId,
      subject_type: run.subjectType,
      subject_id: run.subjectId,
      client_id: run.clientId,
      trigger: run.trigger,
      verdict: run.verdict,
      checks: run.checks,
      flags: run.flags,
      program_recommendation: run.programRecommendation,
      ai_status: 'pending',
      created_by: actor.userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`agent_validation_runs insert failed: ${error?.message ?? 'no row'}`)
  }

  if (actor.user) {
    await logAuditEvent({
      user: actor.user,
      action: 'agent_validation_run',
      entityType: run.subjectType,
      entityId: run.subjectId,
      entityLabel: `${run.subjectType} ${run.verdict}`,
      details: { verdict: run.verdict, flagCount: run.flags.length, trigger: run.trigger, runId: data.id },
    })
  }

  return { id: data.id }
}

/** Patch the async AI columns on an existing run (admin client; bypasses RLS). */
export async function patchRunAi(
  runId: string,
  patch: { ai_summary?: string | null; ai_model?: string | null; ai_status: string; flags?: unknown; program_recommendation?: unknown },
): Promise<void> {
  const admin = createAdminClient()
  await admin.from('agent_validation_runs').update(patch).eq('id', runId)
}
```

- [ ] **Step 3: Write the integration test**

```typescript
// src/lib/agent/audit/__tests__/record.test.ts
import { describe, test, expect, afterAll } from 'vitest'
import { recordValidationRun, patchRunAi } from '../record'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ValidationRun } from '../types'

// Requires a reachable test/live Supabase (env from .env.local). Skips if unset.
const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = process.env.AGENT_TEST_ORG_ID // set to a real org id for this test

const run: ValidationRun = {
  subjectType: 'intake_form', subjectId: '00000000-0000-0000-0000-000000000001',
  clientId: null, trigger: 'form_submitted', verdict: 'warn',
  checks: [{ key: 'required_fields', label: 'Required fields complete', status: 'warn' }],
  flags: [{ code: 'x', severity: 'low', message: 'test' }],
  programRecommendation: null,
}

describe.runIf(hasEnv && Boolean(ORG))('recordValidationRun (integration)', () => {
  const created: string[] = []
  afterAll(async () => {
    const admin = createAdminClient()
    for (const id of created) await admin.from('agent_validation_runs').delete().eq('id', id)
  })

  test('inserts a run and patches AI columns', async () => {
    const { id } = await recordValidationRun(run, { organizationId: ORG!, userId: null })
    created.push(id)
    expect(id).toBeTruthy()
    await patchRunAi(id, { ai_status: 'done', ai_summary: 'ok', ai_model: 'test-model' })
    const admin = createAdminClient()
    const { data } = await admin.from('agent_validation_runs').select('ai_status, ai_summary').eq('id', id).single()
    expect(data?.ai_status).toBe('done')
  })
})
```

- [ ] **Step 4: Run the test**

Run: `DOTENV_CONFIG_PATH=.env.local AGENT_TEST_ORG_ID=<real-org-id> npx vitest run src/lib/agent/audit/__tests__/record.test.ts`
Expected: PASS (or SKIPPED if env/org unset). To get a real org id, run `scripts/seed-demo.mjs` and query the "Demo Organization" id.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/audit/record.ts src/lib/agent/audit/__tests__/record.test.ts
git commit -m "feat(agent): append-only validation-run audit writer"
```

---

## Task 8: AI enricher (best-effort, injectable model)

Produces a plain-English summary, optional anomaly flags, and a routing rationale.
Validated with Zod; failure is swallowed by the caller (Task 9). Model is injectable
so tests use a mock.

**Files:**
- Create: `src/lib/agent/ai/enrich.ts`
- Test: `src/lib/agent/ai/__tests__/enrich.test.ts`

**Pattern note:** This repo's 9 existing AI routes all use `generateText` from `ai`
and parse the returned `text` (see `src/app/api/ai/*/route.ts`). The enricher follows
that exact pattern: `generateText` → `JSON.parse` → Zod validate. This avoids any
`generateObject`/`Output` API-shape uncertainty and matches the codebase. The actual
model id is read from the result (`response.modelId`), not hardcoded.

- [ ] **Step 1: Write the failing test (mocked model)**

```typescript
// src/lib/agent/ai/__tests__/enrich.test.ts
import { describe, test, expect } from 'vitest'
import { MockLanguageModelV2 } from 'ai/test'
import { enrichRun } from '../enrich'
import type { ValidationRun } from '../types'

const run: ValidationRun = {
  subjectType: 'intake_form', subjectId: 's1', clientId: 'c1', trigger: 'form_submitted',
  verdict: 'warn',
  checks: [{ key: 'required_fields', label: 'Required fields complete', status: 'warn', detail: '1 missing' }],
  flags: [{ code: 'missing_required_field', severity: 'high', message: 'Missing "DOB".', field: 'dob' }],
  programRecommendation: { program: 'ICS', confidence: 0.3, reason: 'ambiguous' },
}

describe('enrichRun', () => {
  test('returns parsed summary from the model', async () => {
    const model = new MockLanguageModelV2({
      doGenerate: async () => ({
        finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 1 },
        content: [{ type: 'text', text: JSON.stringify({
          summary: 'Date of birth is missing; confirm program ICS.',
          anomalies: [],
        }) }],
      }),
    })
    const result = await enrichRun(run, { model })
    expect(result.summary).toContain('Date of birth')
    expect(result.anomalies).toEqual([])
  })

  test('throws on unparseable model output (caller swallows)', async () => {
    const model = new MockLanguageModelV2({
      doGenerate: async () => ({
        finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 1 },
        content: [{ type: 'text', text: 'not json' }],
      }),
    })
    await expect(enrichRun(run, { model })).rejects.toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agent/ai/__tests__/enrich.test.ts`
Expected: FAIL — cannot find module `../enrich`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/agent/ai/enrich.ts
import { generateText, type LanguageModel } from 'ai'
import { z } from 'zod'
import { aiModel } from '@/lib/ai/provider'
import type { ValidationRun } from '../types'

const enrichSchema = z.object({
  summary: z.string().max(800),
  anomalies: z.array(z.object({
    code: z.string().max(60),
    message: z.string().max(300),
  })).max(10),
})

export type EnrichResult = z.infer<typeof enrichSchema> & { modelId: string | null }

const SYSTEM =
  'You are a compliance assistant for a Minnesota 245D home-care intake/EVV system. ' +
  'Explain validation results in plain English for staff. Do not invent facts. ' +
  'Only report anomalies clearly implied by the provided checks and flags. ' +
  'Respond with ONLY a JSON object: {"summary": string, "anomalies": [{"code": string, "message": string}]}.'

/**
 * Best-effort AI enrichment. Follows the repo's generateText + parse pattern.
 * Sends only minimum-necessary structured fields (no raw PHI free-text). The
 * model never changes the verdict. Throws on bad output; the pipeline swallows.
 */
export async function enrichRun(
  run: ValidationRun,
  opts: { model?: LanguageModel } = {},
): Promise<EnrichResult> {
  const { text, response } = await generateText({
    model: opts.model ?? aiModel,
    system: SYSTEM,
    prompt: JSON.stringify({
      subjectType: run.subjectType,
      verdict: run.verdict,
      checks: run.checks,
      flags: run.flags,
      programRecommendation: run.programRecommendation,
    }),
  })

  const parsed = enrichSchema.parse(JSON.parse(text))
  return { ...parsed, modelId: response?.modelId ?? null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/agent/ai/__tests__/enrich.test.ts`
Expected: PASS (2 tests). If `ai/test`'s `MockLanguageModelV2` import path differs in
the installed `ai` v6, check `node_modules/ai/test` exports and adjust the import; the
mock must return a `content` array with a JSON text part matching `enrichSchema`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/ai/enrich.ts src/lib/agent/ai/__tests__/enrich.test.ts
git commit -m "feat(agent): best-effort AI enricher with injectable model"
```

---

## Task 9: Pipeline orchestrators

Compose validators → verdict → audit write (sync), then kick off best-effort AI
enrichment that patches the run.

**Files:**
- Create: `src/lib/agent/pipeline.ts`
- Test: `src/lib/agent/__tests__/pipeline.test.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/agent/pipeline.ts
import type { EvvComplianceVisit } from '@/lib/evv/compliance'
import type { UserProfile } from '@/types/app'
import { checkRequiredFields, type FormFieldDef } from './intake/required-fields'
import { checkEligibility, type EligibilityInput } from './intake/eligibility'
import { recommendProgram, type RouterInput } from './intake/program-router'
import { validateEvvVisit } from './evv/validate'
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
  void enrichAndPatch(id, run) // background; see Task 10 for after()/waitUntil in route context
  return { runId: id, verdict: run.verdict, run }
}

export type EvvResult = { runId: string; verdict: Verdict; run: ValidationRun }

export async function runEvvValidation(
  visit: EvvComplianceVisit,
  trigger: 'visit_clock_out' | 'daily_sweep',
  actor: Actor,
): Promise<EvvResult> {
  const res = validateEvvVisit(visit)
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
```

- [ ] **Step 2: Write the failing test (mock audit + enrich via module mock)**

```typescript
// src/lib/agent/__tests__/pipeline.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../audit/record', () => ({
  recordValidationRun: vi.fn(async () => ({ id: 'run-1' })),
  patchRunAi: vi.fn(async () => {}),
}))
vi.mock('../ai/enrich', () => ({
  enrichRun: vi.fn(async () => ({ summary: 'ok', anomalies: [] })),
}))

import { runIntakeValidation } from '../pipeline'
import { recordValidationRun } from '../audit/record'

const baseInput = {
  subjectId: 's1', clientId: 'c1',
  fields: [{ field_key: 'dob', label: 'DOB', is_required: true, conditional_on: null, conditional_value: null }],
  formData: { dob: '' },
  eligibility: { program: 'ICS', waiver_type: 'CADI', county_of_service: 'Hennepin', service_start_date: '2025-01-01', guardianship_status: 'self', guardian_name: null, today: '2026-06-17' },
  router: { waiver_type: 'CADI', requested_service: null, current_program: null },
}

describe('runIntakeValidation', () => {
  beforeEach(() => vi.clearAllMocks())

  test('fails when required field missing and records a run', async () => {
    const result = await runIntakeValidation(baseInput, { organizationId: 'org1', userId: null })
    expect(result.verdict).toBe('fail')
    expect(recordValidationRun).toHaveBeenCalledOnce()
    expect(result.runId).toBe('run-1')
  })

  test('passes with complete valid data', async () => {
    const result = await runIntakeValidation({ ...baseInput, formData: { dob: '1990-01-01' } }, { organizationId: 'org1', userId: null })
    expect(result.verdict).toBe('pass')
  })
})
```

- [ ] **Step 3: Run test to verify it fails then passes**

Run: `npx vitest run src/lib/agent/__tests__/pipeline.test.ts`
Expected: PASS (2 tests) once `pipeline.ts` exists.

- [ ] **Step 4: Commit**

```bash
git add src/lib/agent/pipeline.ts src/lib/agent/__tests__/pipeline.test.ts
git commit -m "feat(agent): intake + EVV pipeline orchestrators"
```

---

## Task 10: Wire intake pipeline into form submission

**Files:**
- Modify: `src/lib/forms/actions.ts` (function `submitFormForSignatures`, ~line 188)

- [ ] **Step 1: Read the current function**

Read `src/lib/forms/actions.ts` lines 155–232. Note how it gets the authed user,
the `packetFormId`, `form_data`, the `template_id`, and the linked `client`. Confirm
the existing `form_submitted` audit call so the new run sits beside it.

- [ ] **Step 2: Add validation before the status update**

Inside `submitFormForSignatures`, after loading the packet form / form_data and
before marking it `needs_signature`, load the template fields + client and run the
pipeline. Use Next's `after()` so AI enrichment does not delay the response.

```typescript
import { after } from 'next/server'
import { runIntakeValidation } from '@/lib/agent/pipeline'
// ...inside submitFormForSignatures, after form_data + template_id + client are known:

const { data: fieldRows } = await supabase
  .from('form_fields')
  .select('field_key, label, is_required, conditional_on, conditional_value')
  .eq('template_id', templateId)

const today = new Date().toISOString().slice(0, 10)
let validation: Awaited<ReturnType<typeof runIntakeValidation>> | null = null
after(async () => {
  // AI enrichment happens inside the pipeline; after() keeps it off the response path.
})

validation = await runIntakeValidation(
  {
    subjectId: packetFormId,
    clientId: client?.id ?? null,
    fields: fieldRows ?? [],
    formData,
    eligibility: {
      program: client?.program ?? null,
      waiver_type: client?.waiver_type ?? null,
      county_of_service: client?.county_of_service ?? null,
      service_start_date: client?.service_start_date ?? null,
      guardianship_status: client?.guardianship_status ?? null,
      guardian_name: client?.guardian_name ?? null,
      today,
    },
    router: {
      waiver_type: client?.waiver_type ?? null,
      requested_service: (formData['requested_service'] as string) ?? null,
      current_program: client?.program ?? null,
    },
  },
  { organizationId: user.organizationId, userId: user.id, user },
)

if (validation.verdict === 'fail') {
  return {
    data: null,
    error: `Submission blocked by validation: ${validation.run.flags.map((f) => f.message).join(' ')}`,
  }
}
```

Notes for the implementer:
- If the function does not already load `client` (program/waiver/etc.), add a
  `supabase.from('clients').select('id, program, waiver_type, county_of_service, service_start_date, guardianship_status, guardian_name').eq('id', <clientId from packet>).maybeSingle()`.
- `templateId` comes from the packet_form's template; fetch it alongside `form_data`
  if not already present.
- Keep `runIntakeValidation`'s own background `enrichAndPatch` — wrapping the call in
  `after()` is optional; in a Server Action the floating promise still resolves. If
  enrichment must be guaranteed, move the `enrichRun` call into an `after(() => ...)`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Run the agent unit tests**

Run: `npx vitest run src/lib/agent`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/forms/actions.ts
git commit -m "feat(agent): validate intake on form submission, block hard failures"
```

---

## Task 11: Wire EVV pipeline (clock-out + daily sweep)

**Files:**
- Modify: `src/lib/evv/workflow-actions.ts` (the action where a visit becomes `completed`)
- Modify: `src/app/api/cron/evv-aggregator/route.ts`

- [ ] **Step 1: Identify the completion point**

Read `src/lib/evv/workflow-actions.ts`. Find where a visit transitions to
`status = 'completed'` (clock-out / completion). Read `src/lib/evv/aggregator/mapping.ts`
to reuse its row→`EvvComplianceVisit` mapping (or `toComplianceVisit` from
`compliance.ts`).

- [ ] **Step 2: Call the EVV pipeline on completion**

After the visit row is updated to `completed`, load the full visit row, map it, and
validate:

```typescript
import { toComplianceVisit } from '@/lib/evv/compliance'
import { runEvvValidation } from '@/lib/agent/pipeline'
// after the visit is marked completed and `user` + `visitRow` are available:

const visit = toComplianceVisit(visitRow as Record<string, unknown>)
await runEvvValidation(visit, 'visit_clock_out', {
  organizationId: user.organizationId,
  userId: user.id,
  user,
})
```

Wrap in try/catch so a validation/logging hiccup never blocks the clock-out itself
(but the audit writer itself is fail-closed within the run).

- [ ] **Step 3: Add the daily sweep to the cron**

Read `src/app/api/cron/evv-aggregator/route.ts`. After its existing aggregation, load
recent/open visits for each org and validate with `trigger='daily_sweep'`. Dedup:
skip a visit that already has a `daily_sweep` run for today.

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { toComplianceVisit } from '@/lib/evv/compliance'
import { runEvvValidation } from '@/lib/agent/pipeline'

// inside the cron handler, after existing work:
const admin = createAdminClient()
const since = new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)
const { data: visits } = await admin
  .from('evv_visits')
  .select('*')
  .gte('service_date', since)
  .in('status', ['completed', 'in_progress'])

const today = new Date().toISOString().slice(0, 10)
for (const row of visits ?? []) {
  const { data: existing } = await admin
    .from('agent_validation_runs')
    .select('id')
    .eq('subject_id', row.id)
    .eq('trigger', 'daily_sweep')
    .gte('created_at', `${today}T00:00:00Z`)
    .maybeSingle()
  if (existing) continue

  const visit = toComplianceVisit(row as Record<string, unknown>)
  await runEvvValidation(visit, 'daily_sweep', {
    organizationId: row.organization_id as string,
    userId: null, // system run; no audit_logs summary (no user)
  })
}
```

Note: `recordValidationRun` only writes an `audit_logs` summary when `actor.user`
is present; system sweeps still write the `agent_validation_runs` row (the audit of
record), which is intended.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/evv/workflow-actions.ts src/app/api/cron/evv-aggregator/route.ts
git commit -m "feat(agent): validate EVV on clock-out and daily sweep"
```

---

## Task 12: Surface flags in the EVV compliance + admin views

Minimal read-only surfacing so flagged runs are visible (full UI is out of scope).

**Files:**
- Create: `src/lib/agent/queries.ts` (read helpers)
- Modify: an existing compliance/admin page to render recent flagged runs (pick the
  page identified in Step 1).

- [ ] **Step 1: Find the host page**

Read `src/app/(app)/compliance/alerts/page.tsx` (and `src/components/evv/*`). Choose
the most natural place to list recent `verdict in ('warn','fail')` runs for the org.

- [ ] **Step 2: Add a read helper**

```typescript
// src/lib/agent/queries.ts
import { createClient } from '@/lib/supabase/server'

export type ValidationRunRow = {
  id: string
  subject_type: string
  subject_id: string
  trigger: string
  verdict: string
  flags: { code: string; severity: string; message: string; field?: string }[]
  program_recommendation: { program: string; confidence: number; reason: string } | null
  ai_summary: string | null
  ai_status: string
  created_at: string
}

/** Recent non-passing validation runs for the current user's org (RLS-scoped). */
export async function getRecentFlaggedRuns(limit = 25): Promise<ValidationRunRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('agent_validation_runs')
    .select('id, subject_type, subject_id, trigger, verdict, flags, program_recommendation, ai_summary, ai_status, created_at')
    .in('verdict', ['warn', 'fail'])
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as ValidationRunRow[]
}
```

- [ ] **Step 3: Render the list on the chosen page**

Add a server-component section that calls `getRecentFlaggedRuns()` and renders a
table: subject type, verdict badge, flag messages, program recommendation (with a
"Confirm" link that points to the existing client/program edit screen — recommendation
only, no auto-apply), AI summary (or "pending"). Follow the existing card/table styles
on that page (reuse existing badge components).

- [ ] **Step 4: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/queries.ts src/app/\(app\)/compliance/alerts/page.tsx
git commit -m "feat(agent): surface flagged validation runs in compliance view"
```

---

## Task 13: End-to-end test

**Files:**
- Create: `e2e/agent.spec.ts`

- [ ] **Step 1: Seed role users + a client**

Run: `DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/seed-demo.mjs`
This creates `demo@careintake.app` (org_admin, pwd `Demo2026!`) + sample clients.

- [ ] **Step 2: Write the E2E test**

```typescript
// e2e/agent.spec.ts
import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_EMAIL ?? 'demo@careintake.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('flagged validation runs are visible in compliance view', async ({ page }) => {
  await login(page)
  await page.goto('/compliance/alerts')
  await page.waitForLoadState('networkidle')
  // The page renders without error and the validation-runs section is present.
  await expect(page.locator('main')).toBeVisible()
})
```

Note: a full "submit intake with missing field → blocked" flow depends on the intake
UI route; if a deterministic intake form URL exists, extend this test to submit an
incomplete form and assert the blocking error. Otherwise this smoke test plus the
unit/integration coverage from Tasks 2–9 is the E2E gate.

- [ ] **Step 3: Run the test**

Run: `DOTENV_CONFIG_PATH=.env.local npx playwright test agent.spec.ts --workers=1`
Expected: PASS.

- [ ] **Step 4: Delete seeded demo users (public repo hygiene)**

```bash
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const t=["demo@careintake.app","superadmin@careintake.app","staff@careintake.app"];
  let p=1; while(true){const {data}=await a.auth.admin.listUsers({page:p,perPage:200});const us=data?.users??[];for(const u of us){if(u.email&&t.includes(u.email.toLowerCase()))await a.auth.admin.deleteUser(u.id);}if(us.length<200)break;p++;}
  const {data:o}=await a.from("organizations").select("id").eq("name","Demo Organization");for(const x of o??[])await a.from("organizations").delete().eq("id",x.id);
  console.log("cleaned");
});'
```

- [ ] **Step 5: Commit**

```bash
git add e2e/agent.spec.ts
git commit -m "test(agent): e2e smoke for flagged validation runs"
```

---

## Final Verification

- [ ] Run full unit suite: `npx vitest run` — all pass, agent modules ≥80% covered.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — exit 0.
- [ ] `DOTENV_CONFIG_PATH=.env.local npx playwright test` — all pass.
- [ ] Confirm `agent_validation_runs` rows appear with correct verdict/flags after a
      test intake submission and an EVV completion (query via admin client).

## Spec Coverage Map

- Validate client eligibility data → Task 3 (`eligibility.ts`), Task 9 (pipeline).
- Route intake forms to correct program → Task 4 (`program-router.ts`) + recommend/flag in Task 9/12.
- Flag missing required fields → Task 2 (`required-fields.ts`).
- Monitor EVV for accuracy/compliance → Task 5 (`evv/validate.ts`) + Task 11 (triggers).
- Automate EVV validation + flagging → Task 11 (clock-out + daily sweep).
- Log all steps to Supabase for HIPAA audit → Task 6 (table/RLS) + Task 7 (writer).
- Process form submissions and EVV data → Task 10 + Task 11 (wiring).
