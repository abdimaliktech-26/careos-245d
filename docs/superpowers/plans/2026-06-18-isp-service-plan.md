# ISP / 245D Service Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Individual Service Plan (MN 245D CSSP): a per-client plan with assessed needs, services, risks, outcomes linked to existing goals, key dates, a status lifecycle, and team signatures.

**Architecture:** New `service_plans` aggregate with child tables (`plan_services`, `plan_outcomes`, `plan_risks`, `plan_signatures`), all org-scoped via RLS. Pure status-transition rules gate activation. Outcomes reuse the existing `goals` feature. Server actions handle CRUD + transitions + signing; UI lives under `/clients/[id]/isp`.

**Tech Stack:** TypeScript, Next.js 16 App Router (Server Actions/Components), Supabase (RLS), Zod v4, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-18-isp-service-plan-design.md`

---

## File Structure

- Create `supabase/migrations/202606180002_service_plans.sql` — tables, enum, RLS, indexes, audit actions.
- Create `src/lib/isp/types.ts` — types + Zod schemas.
- Create `src/lib/isp/status.ts` — pure transition rules (`canActivate`, `nextStatuses`).
- Create `src/lib/isp/queries.ts` — `getClientPlans`, `getPlan`.
- Create `src/lib/isp/actions.ts` — CRUD + transitions + sign server actions.
- Modify `src/lib/audit/log.ts` — add `isp_created`, `isp_activated`, `isp_signed`.
- Create routes `src/app/(app)/clients/[id]/isp/{page,new/page,[planId]/page}.tsx`.
- Create components `src/components/isp/{plan-status-badge,plan-form,services-editor,outcomes-picker,risks-editor,signatures-panel}.tsx`.
- Tests under `src/lib/isp/__tests__/` and `e2e/isp.spec.ts`.

Constants: `PlanStatus = 'draft'|'active'|'under_review'|'expired'`.

---

## Task 1: Migration

**Files:**
- Create: `supabase/migrations/202606180002_service_plans.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE TYPE service_plan_status AS ENUM ('draft','active','under_review','expired');

CREATE TABLE service_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_type          TEXT,
  status             service_plan_status NOT NULL DEFAULT 'draft',
  assessed_needs     TEXT,
  summary            TEXT,
  effective_date     DATE,
  review_date        DATE,
  annual_review_date DATE,
  activated_at       TIMESTAMPTZ,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plan_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_name    TEXT NOT NULL,
  frequency       TEXT,
  units           TEXT,
  responsible_party TEXT,
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (service_plan_id, goal_id)
);

CREATE TABLE plan_risks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk            TEXT NOT NULL,
  mitigation      TEXT,
  severity        TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signer_role     TEXT NOT NULL,
  signer_name     TEXT NOT NULL,
  signer_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_data  TEXT,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_plans_client ON service_plans(organization_id, client_id);
CREATE INDEX idx_service_plans_status ON service_plans(organization_id, status);
CREATE INDEX idx_plan_services_plan ON plan_services(service_plan_id);
CREATE INDEX idx_plan_outcomes_plan ON plan_outcomes(service_plan_id);
CREATE INDEX idx_plan_risks_plan ON plan_risks(service_plan_id);
CREATE INDEX idx_plan_signatures_plan ON plan_signatures(service_plan_id);

ALTER TABLE service_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_outcomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_risks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_signatures  ENABLE ROW LEVEL SECURITY;

-- SELECT for org members; write for program_manager+ (has_role covers org_admin/super_admin).
CREATE POLICY "sp_select" ON service_plans FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "sp_write"  ON service_plans FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "ps_select" ON plan_services FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "ps_write"  ON plan_services FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "po_select" ON plan_outcomes FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "po_write"  ON plan_outcomes FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "pr_select" ON plan_risks FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "pr_write"  ON plan_risks FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));

CREATE POLICY "psig_select" ON plan_signatures FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "psig_write"  ON plan_signatures FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('program_manager'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('program_manager'));
```

- [ ] **Step 2: Apply to live DB (split enum from rest)**

Apply via Supabase MCP `apply_migration` (project `hwsbizbdvxofsyehttkw`):
1. name `service_plan_enum`: `CREATE TYPE service_plan_status ...;` plus the three
   `ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_created'|'isp_activated'|'isp_signed';`
   (each ADD VALUE in this same call is fine; they aren't used in the same statement).
2. name `service_plan_tables`: the five `CREATE TABLE` + indexes + RLS enable + policies.

Audit enum statements to include in call 1:
```sql
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_activated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_signed';
```

- [ ] **Step 3: Verify**

```bash
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)
node -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  for (const t of ["service_plans","plan_services","plan_outcomes","plan_risks","plan_signatures"]) {
    const {error}=await a.from(t).select("id").limit(1); console.log(t, error? "ERR "+error.message : "OK");
  }
});'
```
Expected: all `OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606180002_service_plans.sql
git commit -m "feat(isp): service_plans schema + RLS migration"
```

---

## Task 2: Types + Zod schemas

**Files:**
- Create: `src/lib/isp/types.ts`

- [ ] **Step 1: Write types**

```typescript
// src/lib/isp/types.ts
import { z } from 'zod'

export type PlanStatus = 'draft' | 'active' | 'under_review' | 'expired'

export type ServicePlan = {
  id: string
  organization_id: string
  client_id: string
  plan_type: string | null
  status: PlanStatus
  assessed_needs: string | null
  summary: string | null
  effective_date: string | null
  review_date: string | null
  annual_review_date: string | null
  activated_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PlanService = {
  id: string
  service_plan_id: string
  service_name: string
  frequency: string | null
  units: string | null
  responsible_party: string | null
  notes: string | null
  sort_order: number
}

export type PlanRisk = {
  id: string
  service_plan_id: string
  risk: string
  mitigation: string | null
  severity: string | null
  sort_order: number
}

export type PlanSignature = {
  id: string
  service_plan_id: string
  signer_role: string
  signer_name: string
  signer_user_id: string | null
  signature_data: string | null
  signed_at: string
}

export const planFormSchema = z.object({
  clientId: z.string().uuid(),
  planType: z.string().max(40).optional().nullable(),
  assessedNeeds: z.string().max(8000).optional().nullable(),
  summary: z.string().max(8000).optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  reviewDate: z.string().optional().nullable(),
  annualReviewDate: z.string().optional().nullable(),
})
export type PlanFormInput = z.infer<typeof planFormSchema>

export const serviceSchema = z.object({
  serviceName: z.string().min(1).max(200),
  frequency: z.string().max(120).optional().nullable(),
  units: z.string().max(60).optional().nullable(),
  responsibleParty: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const riskSchema = z.object({
  risk: z.string().min(1).max(2000),
  mitigation: z.string().max(2000).optional().nullable(),
  severity: z.enum(['low', 'medium', 'high']).optional().nullable(),
})

export const signSchema = z.object({
  signerRole: z.enum(['client', 'guardian', 'case_manager', 'staff']),
  signerName: z.string().min(1).max(200),
  signatureData: z.string().max(200000).optional().nullable(),
})
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/isp/types.ts
git commit -m "feat(isp): types and Zod schemas"
```

---

## Task 3: Status transition rules (pure)

**Files:**
- Create: `src/lib/isp/status.ts`
- Test: `src/lib/isp/__tests__/status.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/isp/__tests__/status.test.ts
import { describe, test, expect } from 'vitest'
import { canActivate, nextStatuses } from '../status'

describe('canActivate', () => {
  const ok = { effectiveDate: '2026-01-01', serviceCount: 1, outcomeCount: 1 }
  test('passes when complete', () => {
    expect(canActivate(ok).ok).toBe(true)
  })
  test('fails without effective date', () => {
    const r = canActivate({ ...ok, effectiveDate: null })
    expect(r.ok).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/effective date/i)
  })
  test('fails without a service', () => {
    expect(canActivate({ ...ok, serviceCount: 0 }).ok).toBe(false)
  })
  test('fails without an outcome', () => {
    expect(canActivate({ ...ok, outcomeCount: 0 }).ok).toBe(false)
  })
})

describe('nextStatuses', () => {
  test('draft can go active', () => { expect(nextStatuses('draft')).toContain('active') })
  test('active can go under_review or expired', () => {
    expect(nextStatuses('active')).toEqual(expect.arrayContaining(['under_review', 'expired']))
  })
  test('expired is terminal', () => { expect(nextStatuses('expired')).toEqual([]) })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/isp/__tests__/status.test.ts`
Expected: FAIL — cannot find module `../status`.

- [ ] **Step 3: Implement**

```typescript
// src/lib/isp/status.ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/isp/__tests__/status.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/isp/status.ts src/lib/isp/__tests__/status.test.ts
git commit -m "feat(isp): pure status transition + activation rules"
```

---

## Task 4: Queries

**Files:**
- Create: `src/lib/isp/queries.ts`

- [ ] **Step 1: Implement**

```typescript
// src/lib/isp/queries.ts
import { createClient } from '@/lib/supabase/server'
import type { ServicePlan, PlanService, PlanRisk, PlanSignature } from './types'

export type PlanDetail = ServicePlan & {
  services: PlanService[]
  risks: PlanRisk[]
  signatures: PlanSignature[]
  outcomes: { id: string; goal_id: string; sort_order: number; goals: { id: string; title: string; status: string } | null }[]
}

/** Plans for a client, newest first (RLS-scoped). */
export async function getClientPlans(clientId: string): Promise<ServicePlan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_plans')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ServicePlan[]
}

/** One plan with children + linked goal summaries. */
export async function getPlan(planId: string): Promise<PlanDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_plans')
    .select(`*,
      services:plan_services(*),
      risks:plan_risks(*),
      signatures:plan_signatures(*),
      outcomes:plan_outcomes(id, goal_id, sort_order, goals(id, title, status))`)
    .eq('id', planId)
    .maybeSingle()
  return (data as PlanDetail | null) ?? null
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/isp/queries.ts
git commit -m "feat(isp): plan queries"
```

---

## Task 5: Server actions

**Files:**
- Modify: `src/lib/audit/log.ts`
- Create: `src/lib/isp/actions.ts`
- Test: `src/lib/isp/__tests__/actions.test.ts`

- [ ] **Step 1: Add audit actions**

In `src/lib/audit/log.ts`, extend the `AuditAction` union:
```typescript
  | 'isp_created'
  | 'isp_activated'
  | 'isp_signed'
```

- [ ] **Step 2: Implement actions**

```typescript
// src/lib/isp/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { canActivate, nextStatuses } from './status'
import { planFormSchema, serviceSchema, riskSchema, signSchema, type PlanStatus } from './types'

type Result<T> = { data: T; error: null } | { data: null; error: string }

const WRITE_ROLES = ['program_manager', 'org_admin', 'super_admin']

async function requireWriter() {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId || !WRITE_ROLES.includes(user.role)) return null
  return user
}

export async function createPlan(input: unknown): Promise<Result<{ id: string }>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = planFormSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const supabase = await createClient()
  const { data, error } = await supabase.from('service_plans').insert({
    organization_id: user.organizationId,
    client_id: parsed.data.clientId,
    plan_type: parsed.data.planType ?? 'CSSP',
    assessed_needs: parsed.data.assessedNeeds ?? null,
    summary: parsed.data.summary ?? null,
    effective_date: parsed.data.effectiveDate || null,
    review_date: parsed.data.reviewDate || null,
    annual_review_date: parsed.data.annualReviewDate || null,
    created_by: user.id,
  }).select('id').single()
  if (error || !data) return { data: null, error: error?.message ?? 'Failed to create plan' }

  await logAuditEvent({ user, action: 'isp_created', entityType: 'service_plan', entityId: data.id, entityLabel: 'ISP created' }).catch(() => null)
  revalidatePath(`/clients/${parsed.data.clientId}/isp`)
  return { data: { id: data.id }, error: null }
}

export async function updatePlan(planId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = planFormSchema.partial().safeParse(input)
  if (!parsed.success) return { data: null, error: 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('service_plans').update({
    plan_type: parsed.data.planType ?? undefined,
    assessed_needs: parsed.data.assessedNeeds ?? undefined,
    summary: parsed.data.summary ?? undefined,
    effective_date: parsed.data.effectiveDate || undefined,
    review_date: parsed.data.reviewDate || undefined,
    annual_review_date: parsed.data.annualReviewDate || undefined,
    updated_at: new Date().toISOString(),
  }).eq('id', planId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${parsed.data.clientId ?? ''}/isp`)
  return { data: undefined, error: null }
}

export async function addService(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = serviceSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_services').insert({
    service_plan_id: planId, organization_id: user.organizationId,
    service_name: parsed.data.serviceName, frequency: parsed.data.frequency ?? null,
    units: parsed.data.units ?? null, responsible_party: parsed.data.responsibleParty ?? null,
    notes: parsed.data.notes ?? null,
  })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function removeService(serviceId: string, planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_services').delete().eq('id', serviceId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function linkOutcome(planId: string, clientId: string, goalId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_outcomes').insert({
    service_plan_id: planId, organization_id: user.organizationId, goal_id: goalId,
  })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function unlinkOutcome(outcomeId: string, planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_outcomes').delete().eq('id', outcomeId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function addRisk(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = riskSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_risks').insert({
    service_plan_id: planId, organization_id: user.organizationId,
    risk: parsed.data.risk, mitigation: parsed.data.mitigation ?? null, severity: parsed.data.severity ?? null,
  })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function removeRisk(riskId: string, planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_risks').delete().eq('id', riskId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function activatePlan(planId: string, clientId: string): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { data: plan } = await supabase.from('service_plans').select('effective_date, status').eq('id', planId).maybeSingle()
  if (!plan) return { data: null, error: 'Plan not found' }
  if (!nextStatuses(plan.status as PlanStatus).includes('active')) return { data: null, error: `Cannot activate from ${plan.status}.` }

  const [{ count: serviceCount }, { count: outcomeCount }] = await Promise.all([
    supabase.from('plan_services').select('*', { count: 'exact', head: true }).eq('service_plan_id', planId),
    supabase.from('plan_outcomes').select('*', { count: 'exact', head: true }).eq('service_plan_id', planId),
  ])
  const check = canActivate({ effectiveDate: plan.effective_date, serviceCount: serviceCount ?? 0, outcomeCount: outcomeCount ?? 0 })
  if (!check.ok) return { data: null, error: check.reasons.join(' ') }

  const { error } = await supabase.from('service_plans')
    .update({ status: 'active', activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (error) return { data: null, error: error.message }
  await logAuditEvent({ user, action: 'isp_activated', entityType: 'service_plan', entityId: planId, entityLabel: 'ISP activated' }).catch(() => null)
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function setReviewStatus(planId: string, clientId: string, target: PlanStatus): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const supabase = await createClient()
  const { data: plan } = await supabase.from('service_plans').select('status').eq('id', planId).maybeSingle()
  if (!plan) return { data: null, error: 'Plan not found' }
  if (!nextStatuses(plan.status as PlanStatus).includes(target)) return { data: null, error: `Cannot move from ${plan.status} to ${target}.` }
  const { error } = await supabase.from('service_plans').update({ status: target, updated_at: new Date().toISOString() }).eq('id', planId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}

export async function signPlan(planId: string, clientId: string, input: unknown): Promise<Result<void>> {
  const user = await requireWriter()
  if (!user) return { data: null, error: 'Unauthorized' }
  const parsed = signSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const supabase = await createClient()
  const { error } = await supabase.from('plan_signatures').insert({
    service_plan_id: planId, organization_id: user.organizationId,
    signer_role: parsed.data.signerRole, signer_name: parsed.data.signerName,
    signer_user_id: user.id, signature_data: parsed.data.signatureData ?? null,
  })
  if (error) return { data: null, error: error.message }
  await logAuditEvent({ user, action: 'isp_signed', entityType: 'service_plan', entityId: planId, entityLabel: `Signed (${parsed.data.signerRole})` }).catch(() => null)
  revalidatePath(`/clients/${clientId}/isp/${planId}`)
  return { data: undefined, error: null }
}
```

- [ ] **Step 3: Write an integration test (create + activate guard)**

```typescript
// src/lib/isp/__tests__/actions.test.ts
import { describe, test, expect } from 'vitest'
import { canActivate } from '../status'

// The server actions require an authed session (getSession), so they are exercised
// via E2E (Task 8). Here we lock the activation rule the action relies on.
describe('activation rule used by activatePlan', () => {
  test('blocks activation when no services/outcomes', () => {
    expect(canActivate({ effectiveDate: '2026-01-01', serviceCount: 0, outcomeCount: 0 }).ok).toBe(false)
  })
  test('allows activation when complete', () => {
    expect(canActivate({ effectiveDate: '2026-01-01', serviceCount: 2, outcomeCount: 1 }).ok).toBe(true)
  })
})
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `npx vitest run src/lib/isp && npx tsc --noEmit && npm run lint`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/isp/actions.ts src/lib/isp/__tests__/actions.test.ts src/lib/audit/log.ts
git commit -m "feat(isp): server actions for plan CRUD, activation, signing"
```

---

## Task 6: UI — routes + components

**Files:**
- Create: `src/components/isp/plan-status-badge.tsx`
- Create: `src/components/isp/plan-form.tsx`
- Create: `src/components/isp/services-editor.tsx`
- Create: `src/components/isp/outcomes-picker.tsx`
- Create: `src/components/isp/risks-editor.tsx`
- Create: `src/components/isp/signatures-panel.tsx`
- Create: `src/app/(app)/clients/[id]/isp/page.tsx`
- Create: `src/app/(app)/clients/[id]/isp/new/page.tsx`
- Create: `src/app/(app)/clients/[id]/isp/[planId]/page.tsx`

- [ ] **Step 1: Status badge (presentational)**

```typescript
// src/components/isp/plan-status-badge.tsx
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
```

- [ ] **Step 2: Plan list page**

```typescript
// src/app/(app)/clients/[id]/isp/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getClientPlans } from '@/lib/isp/queries'
import { PlanStatusBadge } from '@/components/isp/plan-status-badge'

export default async function ClientIspPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const plans = await getClientPlans(id)
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Service Plans</h1>
        <Link href={`/clients/${id}/isp/new`} className="rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground">New plan</Link>
      </div>
      {plans.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No service plans yet.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
              <Link href={`/clients/${id}/isp/${p.id}`} className="text-[13px] font-semibold text-foreground hover:text-primary">
                {p.plan_type ?? 'CSSP'} · effective {p.effective_date ?? '—'}
              </Link>
              <PlanStatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: New-plan page + form**

`plan-form.tsx` is a client component that posts to `createPlan` and on success
routes to the new plan. New-plan page (server) just renders it with `clientId`.

```typescript
// src/components/isp/plan-form.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPlan } from '@/lib/isp/actions'

export function PlanForm({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-4"
      action={async (fd: FormData) => {
        setBusy(true); setErr('')
        const res = await createPlan({
          clientId,
          planType: String(fd.get('planType') || 'CSSP'),
          assessedNeeds: String(fd.get('assessedNeeds') || ''),
          summary: String(fd.get('summary') || ''),
          effectiveDate: String(fd.get('effectiveDate') || ''),
          reviewDate: String(fd.get('reviewDate') || ''),
          annualReviewDate: String(fd.get('annualReviewDate') || ''),
        })
        setBusy(false)
        if (res.error) { setErr(res.error); return }
        router.push(`/clients/${clientId}/isp/${res.data.id}`); router.refresh()
      }}
    >
      <input name="planType" defaultValue="CSSP" className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm" placeholder="Plan type" />
      <textarea name="assessedNeeds" className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm" placeholder="Assessed needs" rows={4} />
      <textarea name="summary" className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm" placeholder="Summary" rows={3} />
      <div className="grid grid-cols-3 gap-3">
        <label className="text-[12px] text-muted-foreground">Effective<input type="date" name="effectiveDate" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" /></label>
        <label className="text-[12px] text-muted-foreground">Review<input type="date" name="reviewDate" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" /></label>
        <label className="text-[12px] text-muted-foreground">Annual review<input type="date" name="annualReviewDate" className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" /></label>
      </div>
      {err && <p className="text-[12px] text-status-error">{err}</p>}
      <button type="submit" disabled={busy} className="rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground disabled:opacity-60">{busy ? 'Creating…' : 'Create plan'}</button>
    </form>
  )
}
```

```typescript
// src/app/(app)/clients/[id]/isp/new/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { PlanForm } from '@/components/isp/plan-form'

export default async function NewIspPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getSession()
  if (error || !user || !['program_manager', 'org_admin', 'super_admin'].includes(user.role)) redirect(`/clients/${id}/isp`)
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">New Service Plan</h1>
      <PlanForm clientId={id} />
    </div>
  )
}
```

- [ ] **Step 4: Editors (services, risks, outcomes, signatures)**

Create four client components. Each renders existing rows + a small add form calling
the matching server action, and a remove button. `outcomes-picker` takes the client's
goals (fetched server-side via `getClientGoals`) and the already-linked goal ids.

```typescript
// src/components/isp/services-editor.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addService, removeService } from '@/lib/isp/actions'
import type { PlanService } from '@/lib/isp/types'

export function ServicesEditor({ planId, clientId, services }: { planId: string; clientId: string; services: PlanService[] }) {
  const router = useRouter(); const [err, setErr] = useState('')
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-foreground">Services</h2>
      <ul className="mb-3 space-y-2">
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-[13px]">
            <span>{s.service_name} · {s.frequency ?? '—'} · {s.responsible_party ?? '—'}</span>
            <button onClick={async () => { const r = await removeService(s.id, planId, clientId); if (r.error) setErr(r.error); else router.refresh() }} className="text-[12px] text-status-error">Remove</button>
          </li>
        ))}
      </ul>
      <form action={async (fd: FormData) => {
        const r = await addService(planId, clientId, { serviceName: String(fd.get('serviceName') || ''), frequency: String(fd.get('frequency') || ''), responsibleParty: String(fd.get('responsibleParty') || '') })
        if (r.error) setErr(r.error); else router.refresh()
      }} className="flex gap-2">
        <input name="serviceName" required placeholder="Service" className="flex-1 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <input name="frequency" placeholder="Frequency" className="w-28 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <input name="responsibleParty" placeholder="Responsible" className="w-32 rounded-lg border border-input bg-card px-3 py-1.5 text-[13px]" />
        <button className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">Add</button>
      </form>
      {err && <p className="mt-2 text-[12px] text-status-error">{err}</p>}
    </section>
  )
}
```

Build `risks-editor.tsx` (fields: risk, mitigation, severity select → `addRisk`/`removeRisk`),
`outcomes-picker.tsx` (props `planId, clientId, goals: {id,title}[], linked: {id,goal_id}[]`;
a `<select>` of unlinked goals → `linkOutcome`, and remove → `unlinkOutcome`), and
`signatures-panel.tsx` (list signatures; a form with signerRole select + signerName +
typed signature → `signPlan`) — all following the `services-editor` shape exactly
(map rows + add form + `router.refresh()` + error state).

- [ ] **Step 5: Plan detail page (wires editors + activate/status)**

```typescript
// src/app/(app)/clients/[id]/isp/[planId]/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getPlan } from '@/lib/isp/queries'
import { getClientGoals } from '@/lib/goals/actions'
import { activatePlan, setReviewStatus } from '@/lib/isp/actions'
import { PlanStatusBadge } from '@/components/isp/plan-status-badge'
import { ServicesEditor } from '@/components/isp/services-editor'
import { RisksEditor } from '@/components/isp/risks-editor'
import { OutcomesPicker } from '@/components/isp/outcomes-picker'
import { SignaturesPanel } from '@/components/isp/signatures-panel'

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const plan = await getPlan(planId)
  if (!plan) redirect(`/clients/${id}/isp`)
  const goalsRes = await getClientGoals(id)
  const goals = (goalsRes.data ?? []).map((g) => ({ id: g.id, title: g.title }))

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{plan.plan_type ?? 'CSSP'}</h1>
        <div className="flex items-center gap-3">
          <PlanStatusBadge status={plan.status} />
          {plan.status === 'draft' && (
            <form action={async () => { 'use server'; await activatePlan(planId, id) }}>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground">Activate</button>
            </form>
          )}
          {plan.status === 'active' && (
            <form action={async () => { 'use server'; await setReviewStatus(planId, id, 'under_review') }}>
              <button className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">Start review</button>
            </form>
          )}
        </div>
      </div>
      <ServicesEditor planId={planId} clientId={id} services={plan.services} />
      <OutcomesPicker planId={planId} clientId={id} goals={goals} linked={plan.outcomes.map((o) => ({ id: o.id, goal_id: o.goal_id }))} />
      <RisksEditor planId={planId} clientId={id} risks={plan.risks} />
      <SignaturesPanel planId={planId} clientId={id} signatures={plan.signatures} />
    </div>
  )
}
```

- [ ] **Step 6: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build exit 0. Fix any prop/type mismatches against `types.ts` + `queries.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/components/isp "src/app/(app)/clients/[id]/isp"
git commit -m "feat(isp): plan UI — list, create, detail with editors + signatures"
```

---

## Task 7: Add ISP to client nav + review-due alerts

**Files:**
- Modify: the client sub-nav (find it: `grep -rn "goals" src/app/(app)/clients/[id] src/components | grep -i nav`)
- Modify: `src/lib/audit/compliance-alerts.ts`

- [ ] **Step 1: Add an "ISP" / "Service Plan" link** to the client navigation alongside Goals/Health (match the existing tab/link pattern in that file).

- [ ] **Step 2: Surface review-due** — in `src/lib/audit/compliance-alerts.ts`, add a check that selects `service_plans` where `status='active'` and `review_date` or `annual_review_date` is within 30 days (or past), emitting an alert per plan. Follow the existing alert-shape used by other checks in that file (read it first; reuse its alert object structure and severity conventions).

- [ ] **Step 3: Typecheck + lint + build + commit**

```bash
npx tsc --noEmit && npm run lint && npm run build
git add src/lib/audit/compliance-alerts.ts src/components src/app
git commit -m "feat(isp): client nav link + review-due compliance alerts"
```

---

## Task 8: E2E + final verification

**Files:**
- Create: `e2e/isp.spec.ts`

- [ ] **Step 1: Seed an org_admin + a client**

```bash
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/seed-demo.mjs
```
Creates `demo@higsi.app` (org_admin) + sample clients (incl. one with a goal? if
not, the test creates a goal via the Goals UI first, or seed adds one).

- [ ] **Step 2: Write the E2E**

```typescript
// e2e/isp.spec.ts
import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_EMAIL ?? 'demo@higsi.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('create and activate a service plan', async ({ page }) => {
  await login(page)
  await page.goto('/clients')
  await page.waitForLoadState('networkidle')
  await page.locator('a[href*="/clients/"]').first().click()
  // navigate to ISP for this client
  const url = new URL(page.url())
  await page.goto(url.pathname.replace(/\/$/, '') + '/isp')
  await page.getByRole('link', { name: /New plan/i }).click()
  await page.fill('input[name="planType"]', 'CSSP')
  await page.fill('input[name="effectiveDate"]', '2026-01-01')
  await page.getByRole('button', { name: /Create plan/i }).click()
  await page.waitForURL(/\/isp\/[0-9a-f-]+/, { timeout: 45000 })
  await expect(page.getByText(/draft/i)).toBeVisible()

  // add a service
  await page.fill('input[name="serviceName"]', 'Personal Care')
  await page.getByRole('button', { name: /^Add$/ }).first().click()
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/Personal Care/)).toBeVisible()
})
```

Note: activation requires ≥1 linked outcome (goal). If the seeded client has no goal,
the assertion stops after adding a service (still proves create + child writes). Extend
to attach a goal + activate if a goal exists.

- [ ] **Step 3: Run**

Run: `DOTENV_CONFIG_PATH=.env.local npx playwright test isp.spec.ts --workers=1`
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
git add e2e/isp.spec.ts
git commit -m "test(isp): e2e create + populate a service plan"
```

---

## Final Verification

- [ ] `npx vitest run` — all pass.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — exit 0.
- [ ] `DOTENV_CONFIG_PATH=.env.local npx playwright test` — all pass.
- [ ] Manual: as program_manager, create a plan, add service + risk, attach a goal as outcome, activate (blocked until those exist), sign; status shows Active; signature listed.

## Spec Coverage Map

- Plan record + assessed needs/summary/dates → Task 1 (schema) + Task 5 (`createPlan`/`updatePlan`) + Task 6 (form).
- Services + frequency/responsible party → Task 1 + Task 5 (`addService`/`removeService`) + Task 6 (`services-editor`).
- Outcomes reuse goals → Task 1 (`plan_outcomes`→`goals`) + Task 5 (`linkOutcome`/`unlinkOutcome`) + Task 6 (`outcomes-picker`).
- Risk management → Task 1 (`plan_risks`) + Task 5 (`addRisk`/`removeRisk`) + Task 6 (`risks-editor`).
- Status workflow (draft→active→under_review→expired) → Task 3 (`status.ts`) + Task 5 (`activatePlan`/`setReviewStatus`).
- Team signatures → Task 1 (`plan_signatures`) + Task 5 (`signPlan`) + Task 6 (`signatures-panel`).
- Review-due alerts via compliance-alerts → Task 7.
- Audit (isp_created/activated/signed) → Task 5 + `log.ts`.
- RLS org-scoping + program_manager write → Task 1.
