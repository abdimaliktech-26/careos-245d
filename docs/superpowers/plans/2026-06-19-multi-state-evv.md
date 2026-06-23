# Multi-State EVV Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a state-configuration + rules layer so EVV visit validation and aggregator routing are driven by a per-state profile (MN/OH/AZ to start), on top of the existing vendor-agnostic adapter/registry/queue.

**Architecture:** Code-defined `StateProfile` registry supplies rule parameters (geofence, grace periods, required elements, default aggregator). `compliance.ts` rule functions take an optional profile (defaulting to MN constants for back-compat). Per-org `evv_state_config` binds an org to a state; a per-state `evv_service_codes` catalog maps service names to procedure codes for the aggregator payload.

**Tech Stack:** TypeScript, Next.js 16 (Server Components/Actions), Supabase (RLS), Zod, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-19-multi-state-evv-design.md`

---

## File Structure

- Create `src/lib/evv/states/types.ts` — `StateProfile`, `EvvModel`.
- Create `src/lib/evv/states/mn.ts`, `oh.ts`, `az.ts` — profiles.
- Create `src/lib/evv/states/registry.ts` — `getStateProfile`, `DEFAULT_STATE`.
- Create `src/lib/evv/states/resolve.ts` — `getOrgStateProfile(orgId)`.
- Create `src/lib/evv/states/service-codes.ts` — `resolveServiceCode(...)`.
- Modify `src/lib/evv/compliance.ts` — rule fns accept optional `StateProfile`.
- Modify `src/lib/evv/aggregator/mapping.ts` — payload uses resolved service code.
- Create `supabase/migrations/202606190001_evv_multistate.sql`.
- Modify org EVV settings UI (state selector) — file identified in Task 6.
- Tests under `src/lib/evv/states/__tests__/` + `e2e/multistate-evv.spec.ts`.

Constants: states `MN`,`OH`,`AZ`; `DEFAULT_STATE='MN'`.

---

## Task 1: State profile types + registry + profiles

**Files:**
- Create: `src/lib/evv/states/types.ts`, `mn.ts`, `oh.ts`, `az.ts`, `registry.ts`
- Test: `src/lib/evv/states/__tests__/registry.test.ts`

- [ ] **Step 1: Types**

```typescript
// src/lib/evv/states/types.ts
import type { CuresActElementKey } from '@/lib/evv/compliance'
import type { AggregatorVendor } from '@/lib/evv/aggregator/types'

export type EvvModel = 'open' | 'closed' | 'provider_choice'

export type StateProfile = {
  code: string
  name: string
  model: EvvModel
  defaultVendor: AggregatorVendor
  geofenceRadiusM: number
  lateCheckInGraceMin: number
  earlyCheckOutGraceMin: number
  missedVisitGraceMin: number
  impossibleTravelSpeedKmh: number
  requiredElements: CuresActElementKey[]
}
```

- [ ] **Step 2: The six Cures elements constant (shared)**

The standard required set (used by every profile by default):
```typescript
// add to src/lib/evv/states/types.ts
import type { CuresActElementKey } from '@/lib/evv/compliance'
export const CURES_REQUIRED: CuresActElementKey[] = [
  'service_type', 'individual_receiving', 'date_of_service',
  'service_location', 'individual_providing', 'service_times',
]
```

- [ ] **Step 3: Profiles**

```typescript
// src/lib/evv/states/mn.ts
import type { StateProfile } from './types'
import { CURES_REQUIRED } from './types'
export const MN: StateProfile = {
  code: 'MN', name: 'Minnesota', model: 'open', defaultVendor: 'hhaexchange',
  geofenceRadiusM: 100, lateCheckInGraceMin: 10, earlyCheckOutGraceMin: 10,
  missedVisitGraceMin: 15, impossibleTravelSpeedKmh: 120, requiredElements: CURES_REQUIRED,
}
```
```typescript
// src/lib/evv/states/oh.ts
import type { StateProfile } from './types'
import { CURES_REQUIRED } from './types'
export const OH: StateProfile = {
  code: 'OH', name: 'Ohio', model: 'open', defaultVendor: 'sandata',
  geofenceRadiusM: 100, lateCheckInGraceMin: 7, earlyCheckOutGraceMin: 7,
  missedVisitGraceMin: 15, impossibleTravelSpeedKmh: 120, requiredElements: CURES_REQUIRED,
}
```
```typescript
// src/lib/evv/states/az.ts
import type { StateProfile } from './types'
import { CURES_REQUIRED } from './types'
export const AZ: StateProfile = {
  code: 'AZ', name: 'Arizona', model: 'open', defaultVendor: 'sandata',
  geofenceRadiusM: 150, lateCheckInGraceMin: 10, earlyCheckOutGraceMin: 10,
  missedVisitGraceMin: 15, impossibleTravelSpeedKmh: 120, requiredElements: CURES_REQUIRED,
}
```
(Grace/geofence values are sane starting defaults; tune per each state's published
spec at certification. They are config, not logic.)

- [ ] **Step 4: Registry**

```typescript
// src/lib/evv/states/registry.ts
import type { StateProfile } from './types'
import { MN } from './mn'; import { OH } from './oh'; import { AZ } from './az'

const PROFILES: Record<string, StateProfile> = { MN, OH, AZ }
export const DEFAULT_STATE = 'MN'

export function getStateProfile(code: string | null | undefined): StateProfile | null {
  if (!code) return null
  return PROFILES[code.toUpperCase()] ?? null
}
export function listStateProfiles(): StateProfile[] {
  return Object.values(PROFILES)
}
```

- [ ] **Step 5: Test**

```typescript
// src/lib/evv/states/__tests__/registry.test.ts
import { describe, test, expect } from 'vitest'
import { getStateProfile, listStateProfiles, DEFAULT_STATE } from '../registry'

describe('state registry', () => {
  test('MN profile uses hhaexchange + 100m geofence', () => {
    const p = getStateProfile('MN')!
    expect(p.defaultVendor).toBe('hhaexchange'); expect(p.geofenceRadiusM).toBe(100)
  })
  test('OH + AZ use sandata', () => {
    expect(getStateProfile('oh')!.defaultVendor).toBe('sandata')
    expect(getStateProfile('AZ')!.defaultVendor).toBe('sandata')
  })
  test('unknown state -> null', () => { expect(getStateProfile('ZZ')).toBeNull() })
  test('null code -> null', () => { expect(getStateProfile(null)).toBeNull() })
  test('default state exists', () => { expect(getStateProfile(DEFAULT_STATE)).not.toBeNull() })
  test('lists all profiles', () => { expect(listStateProfiles().length).toBeGreaterThanOrEqual(3) })
})
```

- [ ] **Step 6: Run + commit**

Run: `npx vitest run src/lib/evv/states/__tests__/registry.test.ts` (expect PASS), then:
```bash
git add src/lib/evv/states
git commit -m "feat(evv): state profile registry (MN/OH/AZ)"
```

---

## Task 2: Migration

**Files:**
- Create: `supabase/migrations/202606190001_evv_multistate.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE IF NOT EXISTS evv_state_config (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL DEFAULT 'MN',
  overrides       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evv_service_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL,
  service_name    TEXT NOT NULL,
  procedure_code  TEXT NOT NULL,
  unit_minutes    INTEGER NOT NULL DEFAULT 15,
  aggregator_code TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_evv_service_codes_org ON evv_service_codes(organization_id, state_code);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS payer TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medicaid_id TEXT;

ALTER TABLE evv_state_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE evv_service_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esc_select" ON evv_state_config FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "esc_write"  ON evv_state_config FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "svc_select" ON evv_service_codes FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "svc_write"  ON evv_service_codes FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));
```

- [ ] **Step 2: Apply to live DB**

Apply via Supabase MCP `apply_migration` (project `hwsbizbdvxofsyehttkw`, name
`evv_multistate`) with the SQL above (single call; no enum changes).

- [ ] **Step 3: Verify**

```bash
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)
node -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  for (const t of ["evv_state_config","evv_service_codes"]) { const {error}=await a.from(t).select("organization_id",{head:true,count:"exact"}).limit(1); console.log(t, error? "ERR "+error.message : "OK"); }
});'
```
Expected: both `OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606190001_evv_multistate.sql
git commit -m "feat(evv): multi-state config + service-code tables (migration)"
```

---

## Task 3: Generalize compliance rules to accept a StateProfile

**Files:**
- Modify: `src/lib/evv/compliance.ts`
- Test: `src/lib/evv/states/__tests__/compliance-profile.test.ts`

- [ ] **Step 1: Read the current functions**

Read `src/lib/evv/compliance.ts` lines 85–247. Confirm the module constants
(`LATE_CHECK_IN_GRACE_MINUTES`, `EARLY_CHECK_OUT_GRACE_MINUTES`,
`MISSED_VISIT_GRACE_MINUTES`, `GEOFENCE_RADIUS_M`, `IMPOSSIBLE_TRAVEL_SPEED_KMH`) and
the signatures of `isMissedVisit(visit, now?)`, `detectVisitExceptions(visit, {now?})`,
`checkCuresActElements(visit)`.

- [ ] **Step 2: Add a profile-params helper (keeps MN constants as the default)**

At the top of `compliance.ts`, after the existing constants, add a default-params
object so existing behavior is identical when no profile is passed:

```typescript
// Rule parameters; defaults preserve the historical Minnesota constants.
export type RuleParams = {
  geofenceRadiusM: number
  lateCheckInGraceMin: number
  earlyCheckOutGraceMin: number
  missedVisitGraceMin: number
  impossibleTravelSpeedKmh: number
  requiredElements: CuresActElementKey[]
}

const DEFAULT_RULE_PARAMS: RuleParams = {
  geofenceRadiusM: GEOFENCE_RADIUS_M,
  lateCheckInGraceMin: LATE_CHECK_IN_GRACE_MINUTES,
  earlyCheckOutGraceMin: EARLY_CHECK_OUT_GRACE_MINUTES,
  missedVisitGraceMin: MISSED_VISIT_GRACE_MINUTES,
  impossibleTravelSpeedKmh: IMPOSSIBLE_TRAVEL_SPEED_KMH,
  requiredElements: CURES_ACT_ELEMENTS.map((e) => e.key),
}
```

- [ ] **Step 3: Thread params through the rule functions**

Change the three functions to accept optional params (default = MN). Replace the
module-constant references inside them with the params:

- `checkCuresActElements(visit, params: RuleParams = DEFAULT_RULE_PARAMS)` — mark only
  `params.requiredElements` (filter the existing `mark(...)` calls so missing is only
  reported for required keys; all six are required by default so behavior is unchanged).
- `isMissedVisit(visit, now = new Date(), params: RuleParams = DEFAULT_RULE_PARAMS)` —
  use `params.missedVisitGraceMin`.
- `detectVisitExceptions(visit, options: { now?: Date; params?: RuleParams } = {})` —
  `const params = options.params ?? DEFAULT_RULE_PARAMS;` then use
  `params.lateCheckInGraceMin`, `params.earlyCheckOutGraceMin`,
  `params.geofenceRadiusM`, and pass `params` into the internal `isMissedVisit` and
  `checkCuresActElements` calls.

Keep the exported constants (other code/tests import them). Existing callers that
pass no params get identical MN behavior.

- [ ] **Step 4: Add a profile→params adapter in the states module**

```typescript
// src/lib/evv/states/to-rule-params.ts
import type { RuleParams } from '@/lib/evv/compliance'
import type { StateProfile } from './types'

export function ruleParamsFor(profile: StateProfile): RuleParams {
  return {
    geofenceRadiusM: profile.geofenceRadiusM,
    lateCheckInGraceMin: profile.lateCheckInGraceMin,
    earlyCheckOutGraceMin: profile.earlyCheckOutGraceMin,
    missedVisitGraceMin: profile.missedVisitGraceMin,
    impossibleTravelSpeedKmh: profile.impossibleTravelSpeedKmh,
    requiredElements: profile.requiredElements,
  }
}
```

- [ ] **Step 5: Write the failing test**

```typescript
// src/lib/evv/states/__tests__/compliance-profile.test.ts
import { describe, test, expect } from 'vitest'
import { detectVisitExceptions, type EvvComplianceVisit } from '@/lib/evv/compliance'
import { ruleParamsFor } from '../to-rule-params'
import { getStateProfile } from '../registry'

function visit(overrides: Partial<EvvComplianceVisit> = {}): EvvComplianceVisit {
  return {
    id: 'v1', clientId: 'c1', staffId: 's1', serviceName: 'Personal Care',
    serviceDate: '2026-06-10', scheduledStart: '2026-06-10T09:00:00Z', scheduledEnd: '2026-06-10T10:00:00Z',
    actualStart: '2026-06-10T09:00:00Z', actualEnd: '2026-06-10T10:00:00Z', status: 'completed',
    checkInLocation: { lat: 1, lng: 1 }, checkOutLocation: { lat: 1, lng: 1 },
    checkInDistanceM: 120, checkOutDistanceM: 120, progressNote: 'note', reviewStatus: 'approved',
    billingStatus: null, billableMinutes: 60, resolvedAt: null, ...overrides,
  }
}

describe('state-driven geofence', () => {
  test('120m distance: MN (100m) flags geofence, AZ (150m) does not', () => {
    const mn = detectVisitExceptions(visit(), { params: ruleParamsFor(getStateProfile('MN')!) })
    const az = detectVisitExceptions(visit(), { params: ruleParamsFor(getStateProfile('AZ')!) })
    expect(mn.some((e) => e.type === 'geofence_violation')).toBe(true)
    expect(az.some((e) => e.type === 'geofence_violation')).toBe(false)
  })
  test('default (no params) preserves MN behavior', () => {
    expect(detectVisitExceptions(visit()).some((e) => e.type === 'geofence_violation')).toBe(true)
  })
})
```

- [ ] **Step 6: Run + commit**

Run: `npx vitest run src/lib/evv/states/__tests__/compliance-profile.test.ts && npx vitest run src/lib/evv` (all pass — existing EVV tests must still pass).
```bash
git add src/lib/evv/compliance.ts src/lib/evv/states/to-rule-params.ts src/lib/evv/states/__tests__/compliance-profile.test.ts
git commit -m "feat(evv): state-driven rule params in compliance engine"
```

---

## Task 4: Org → state profile resolver

**Files:**
- Create: `src/lib/evv/states/resolve.ts`
- Test: `src/lib/evv/states/__tests__/resolve.test.ts`

- [ ] **Step 1: Implement**

```typescript
// src/lib/evv/states/resolve.ts
import { createClient } from '@/lib/supabase/server'
import { getStateProfile, DEFAULT_STATE } from './registry'
import type { StateProfile } from './types'

/** Pure: merge per-org overrides onto a base profile. */
export function applyOverrides(profile: StateProfile, overrides: Partial<StateProfile> | null): StateProfile {
  if (!overrides) return profile
  return { ...profile, ...overrides }
}

/** Resolve the org's effective state profile (RLS-scoped read). Falls back to MN. */
export async function getOrgStateProfile(organizationId: string): Promise<StateProfile> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evv_state_config')
    .select('state_code, overrides')
    .eq('organization_id', organizationId)
    .maybeSingle()
  const base = getStateProfile(data?.state_code ?? DEFAULT_STATE) ?? getStateProfile(DEFAULT_STATE)!
  return applyOverrides(base, (data?.overrides as Partial<StateProfile>) ?? null)
}
```

- [ ] **Step 2: Test the pure part**

```typescript
// src/lib/evv/states/__tests__/resolve.test.ts
import { describe, test, expect } from 'vitest'
import { applyOverrides } from '../resolve'
import { getStateProfile } from '../registry'

describe('applyOverrides', () => {
  test('override geofence only', () => {
    const p = applyOverrides(getStateProfile('MN')!, { geofenceRadiusM: 250 })
    expect(p.geofenceRadiusM).toBe(250); expect(p.defaultVendor).toBe('hhaexchange')
  })
  test('no overrides returns base', () => {
    expect(applyOverrides(getStateProfile('OH')!, null).defaultVendor).toBe('sandata')
  })
})
```

- [ ] **Step 3: Run + commit**

Run: `npx vitest run src/lib/evv/states/__tests__/resolve.test.ts`
```bash
git add src/lib/evv/states/resolve.ts src/lib/evv/states/__tests__/resolve.test.ts
git commit -m "feat(evv): resolve org state profile with overrides"
```

---

## Task 5: Service-code resolution + payload wiring

**Files:**
- Create: `src/lib/evv/states/service-codes.ts`
- Modify: `src/lib/evv/aggregator/mapping.ts` (payload `serviceType`)
- Test: `src/lib/evv/states/__tests__/service-codes.test.ts`

- [ ] **Step 1: Read the payload builder**

Read `src/lib/evv/aggregator/mapping.ts` around the payload build (the function that
sets `serviceType` on `AggregatorVisitPayload`). Note its inputs (it currently uses
`visit.serviceName` as `serviceType`).

- [ ] **Step 2: Implement the resolver**

```typescript
// src/lib/evv/states/service-codes.ts
import { createAdminClient } from '@/lib/supabase/admin'

export type ResolvedServiceCode = { procedureCode: string; aggregatorCode: string | null; unitMinutes: number }

/** Look up the procedure/aggregator code for a service name in an org's state catalog. */
export async function resolveServiceCode(
  organizationId: string, stateCode: string, serviceName: string,
): Promise<ResolvedServiceCode | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('evv_service_codes')
    .select('procedure_code, aggregator_code, unit_minutes')
    .eq('organization_id', organizationId)
    .eq('state_code', stateCode)
    .eq('service_name', serviceName)
    .eq('active', true)
    .maybeSingle()
  if (!data) return null
  return { procedureCode: data.procedure_code, aggregatorCode: data.aggregator_code, unitMinutes: data.unit_minutes }
}
```

- [ ] **Step 3: Wire into the payload builder**

In `mapping.ts`, where the payload is assembled, set `serviceType` from the resolved
code when available (preferring `aggregatorCode`, else `procedureCode`), falling back
to `visit.serviceName` only if no mapping exists — and surface "unmapped" so the
caller can hold transmission. Concretely, add an optional resolved-code argument to
the payload builder and use:
```typescript
serviceType: resolved?.aggregatorCode ?? resolved?.procedureCode ?? visit.serviceName,
```
The transmission caller (in `queue.ts`/`actions`) resolves the code first via
`resolveServiceCode(orgId, stateCode, visit.serviceName)`; if `null`, mark the
transmission `not_configured` with reason "service code not mapped" instead of
sending an unmapped service.

- [ ] **Step 4: Test the resolver (mock admin client)**

```typescript
// src/lib/evv/states/__tests__/service-codes.test.ts
import { describe, test, expect, vi } from 'vitest'

const maybeSingle = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }) }) }),
  }),
}))
import { resolveServiceCode } from '../service-codes'

describe('resolveServiceCode', () => {
  test('returns mapped code', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { procedure_code: 'T1019', aggregator_code: null, unit_minutes: 15 } })
    expect(await resolveServiceCode('o', 'MN', 'Personal Care')).toEqual({ procedureCode: 'T1019', aggregatorCode: null, unitMinutes: 15 })
  })
  test('returns null when unmapped', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null })
    expect(await resolveServiceCode('o', 'MN', 'Nope')).toBeNull()
  })
})
```

- [ ] **Step 5: Run + typecheck + commit**

Run: `npx vitest run src/lib/evv/states/__tests__/service-codes.test.ts && npx tsc --noEmit`
```bash
git add src/lib/evv/states/service-codes.ts src/lib/evv/aggregator/mapping.ts src/lib/evv/states/__tests__/service-codes.test.ts
git commit -m "feat(evv): per-state service-code resolution for aggregator payload"
```

---

## Task 6: Org onboarding — state selector + service-code seed

**Files:**
- Create: `src/lib/evv/states/actions.ts` — `setOrgState`, `seedServiceCodes`.
- Modify: the org EVV settings page (find it: `grep -rln "evv_aggregator_config\|AggregatorConfig\|aggregator" src/app/\(app\)/admin src/app/\(app\)/evv src/components`).

- [ ] **Step 1: Server action to set state + seed codes**

```typescript
// src/lib/evv/states/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { getStateProfile } from './registry'

type Result = { error: string | null }
const STARTER_CODES: Record<string, Array<{ service_name: string; procedure_code: string }>> = {
  MN: [{ service_name: 'Personal Care', procedure_code: 'T1019' }, { service_name: 'Homemaker', procedure_code: 'S5130' }],
  OH: [{ service_name: 'Personal Care', procedure_code: 'T1019' }],
  AZ: [{ service_name: 'Personal Care', procedure_code: 'T1019' }],
}

export async function setOrgState(stateCode: string): Promise<Result> {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId || !['org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }
  if (!getStateProfile(stateCode)) return { error: 'Unknown state' }
  const supabase = await createClient()
  const { error: e1 } = await supabase.from('evv_state_config')
    .upsert({ organization_id: user.organizationId, state_code: stateCode.toUpperCase(), updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
  if (e1) return { error: e1.message }

  // Seed starter service codes if none exist for this state yet.
  const { count } = await supabase.from('evv_service_codes').select('id', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId).eq('state_code', stateCode.toUpperCase())
  if (!count) {
    const rows = (STARTER_CODES[stateCode.toUpperCase()] ?? []).map((c) => ({
      organization_id: user.organizationId, state_code: stateCode.toUpperCase(), ...c,
    }))
    if (rows.length) await supabase.from('evv_service_codes').insert(rows)
  }
  return { error: null }
}
```

- [ ] **Step 2: Add a state selector to the EVV settings UI**

On the page identified by the grep above (the org EVV/aggregator settings), add a
`<select>` of `listStateProfiles()` bound to a client form that calls `setOrgState`.
Show the current `evv_state_config.state_code`. Follow that page's existing form
pattern (server action + `router.refresh()`), mirroring the aggregator-config form
already there.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/evv/states/actions.ts src/app src/components
git commit -m "feat(evv): org state onboarding + starter service codes"
```

---

## Task 7: Wire profile into EVV validation call sites

**Files:**
- Modify: `src/lib/agent/evv/validate.ts` (the agent EVV validator from the agent layer)
- Modify: any compliance dashboard caller that should be state-aware (identify via
  `grep -rln "detectVisitExceptions\|checkCuresActElements" src/lib src/app`)

- [ ] **Step 1: Find call sites**

Run: `grep -rln "detectVisitExceptions\|checkCuresActElements\|buildComplianceSummary" src/lib src/app`.
For each server-side caller that has an `organizationId` in scope, pass the resolved
profile params; pure/UI callers without org context keep the MN default (back-compat).

- [ ] **Step 2: Update the agent EVV validator to be state-aware**

In `src/lib/agent/evv/validate.ts`, accept an optional `RuleParams` and pass it to
`checkCuresActElements` / `detectVisitExceptions`:
```typescript
import type { RuleParams } from '@/lib/evv/compliance'
export function validateEvvVisit(visit: EvvComplianceVisit, params?: RuleParams) {
  const cures = checkCuresActElements(visit, params)
  const exceptions = detectVisitExceptions(visit, params ? { params } : {})
  // ...rest unchanged
}
```
Then in the EVV pipeline caller (`src/lib/agent/pipeline.ts` `runEvvValidation`),
resolve `getOrgStateProfile(actor.organizationId)` → `ruleParamsFor(profile)` and pass
it in. Wrap the profile read in try/catch → fall back to undefined (MN default) so a
config hiccup never blocks validation.

- [ ] **Step 3: Run agent + evv tests + typecheck**

Run: `npx vitest run src/lib/agent src/lib/evv && npx tsc --noEmit`
Expected: all pass (existing tests unaffected since params optional).

- [ ] **Step 4: Commit**

```bash
git add src/lib/agent/evv/validate.ts src/lib/agent/pipeline.ts
git commit -m "feat(evv): state-aware validation in the EVV agent pipeline"
```

---

## Task 8: E2E + final verification

**Files:**
- Create: `e2e/multistate-evv.spec.ts`

- [ ] **Step 1: Integration test — org bound to OH resolves OH profile**

```typescript
// src/lib/evv/states/__tests__/resolve-integration.test.ts
import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('evv_state_config (integration)', () => {
  const admin = createAdminClient()
  const cleanup: Array<() => Promise<void>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  test('config row stores state code', async () => {
    const { data: org } = await admin.from('organizations').insert({ name: '__evv_state_org__', status: 'active', plan: 'pro' }).select('id').single()
    const orgId = (org as { id: string }).id
    cleanup.push(async () => { await admin.from('organizations').delete().eq('id', orgId) })
    const { error } = await admin.from('evv_state_config').insert({ organization_id: orgId, state_code: 'OH' })
    expect(error).toBeNull()
    const { data } = await admin.from('evv_state_config').select('state_code').eq('organization_id', orgId).maybeSingle()
    expect((data as { state_code: string }).state_code).toBe('OH')
  }, 30000)
})
```

- [ ] **Step 2: E2E smoke — settings page shows the state selector**

Seed: `DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/seed-demo.mjs`.

```typescript
// e2e/multistate-evv.spec.ts
import { test, expect, type Page } from '@playwright/test'
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@higsi.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'
async function login(page: Page) {
  await page.goto('/auth/login'); await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]'); await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}
test('EVV settings exposes a state selector', async ({ page }) => {
  await login(page)
  await page.goto('/evv/settings')   // adjust to the settings path found in Task 6
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main')).toBeVisible()
})
```

- [ ] **Step 3: Run integration + e2e**

```bash
export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=" .env.local | xargs)
npx vitest run src/lib/evv/states/__tests__/resolve-integration.test.ts
DOTENV_CONFIG_PATH=.env.local npx playwright test multistate-evv.spec.ts --workers=1
```
Expected: PASS.

- [ ] **Step 4: Delete seeded demo users**

```bash
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const t=["demo@higsi.app","superadmin@higsi.app","staff@higsi.app"];
  let p=1;while(true){const {data}=await a.auth.admin.listUsers({page:p,perPage:200});const us=data?.users??[];for(const u of us){if(u.email&&t.includes(u.email.toLowerCase()))await a.auth.admin.deleteUser(u.id);}if(us.length<200)break;p++;}
  const {data:o}=await a.from("organizations").select("id").eq("name","Demo Organization");for(const x of o??[])await a.from("organizations").delete().eq("id",x.id);
  console.log("cleaned");
});'
```

- [ ] **Step 5: Final verification + commit**

```bash
export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=" .env.local | xargs)
npx vitest run && npx tsc --noEmit && npm run lint && npm run build
git add e2e/multistate-evv.spec.ts src/lib/evv/states/__tests__/resolve-integration.test.ts
git commit -m "test(evv): multi-state config integration + settings e2e"
```

---

## Final Verification

- [ ] `npx vitest run` — all pass (existing EVV tests unchanged + new state tests).
- [ ] `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` exit 0.
- [ ] `npx playwright test` — all pass.
- [ ] Manual: set an org to OH in EVV settings → visits validate under OH params and
      route to the Sandata adapter (returns `not_configured` until certified).

## Spec Coverage Map

- State profiles (code registry) → Task 1.
- evv_state_config + evv_service_codes + client payer/medicaid → Task 2.
- Rules engine generalization (state-driven) → Task 3 + Task 7.
- Org → profile resolver (+ overrides) → Task 4.
- Service-code mapping into payload → Task 5.
- Org onboarding (state select + seed) → Task 6.
- Routing to state default aggregator → reuses existing registry; default vendor on
  profile + `evv_aggregator_config` (Task 6 settings) → adapter via existing `getAdapter`.
- Out of scope (vendor wire formats, certification) → unchanged stubs, noted.
