# Individual Service Plan (ISP / 245D CSSP) — Design

**Date:** 2026-06-18
**Status:** Approved (design); pending implementation plan
**Project:** Higsi / Stillwater 245D Suite

## Summary

Add the Individual Service Plan — the parent care-plan document for a client,
aligned to Minnesota 245D Coordinated Service & Support Plan (CSSP) expectations.
A plan captures assessed needs, outcomes (reusing the existing goals feature),
services with frequency/responsible party, a risk-management plan, key dates, a
status lifecycle, and team signatures.

## Scope

In: plan record, assessed needs, services, risk-management entries, outcomes linked
to existing goals, effective/review/annual-review dates, status workflow
(`draft → active → under_review → expired`), team signatures, review-due alerts via
the existing compliance-alerts engine.

Deferred (later specs): standalone assessment instruments, plan versioning/amendments
with history diffing, AI completeness validation of plans, data-collection dashboards.

## Data Model (new migration)

```sql
CREATE TYPE service_plan_status AS ENUM ('draft','active','under_review','expired');

CREATE TABLE service_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_type          TEXT,                          -- e.g. 'CSSP', 'ISP'
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
  severity        TEXT,                              -- 'low' | 'medium' | 'high'
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_plan_id UUID NOT NULL REFERENCES service_plans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signer_role     TEXT NOT NULL,                     -- 'client' | 'guardian' | 'case_manager' | 'staff'
  signer_name     TEXT NOT NULL,
  signer_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_data  TEXT,                              -- typed name / data URL
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- new audit actions
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_activated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'isp_signed';
```

**RLS:** all five tables enable RLS. SELECT for org members
(`organization_id = get_my_org_id()`; child tables via their plan's org column).
INSERT/UPDATE/DELETE require `organization_id = get_my_org_id() AND has_role('program_manager')`
(program_manager, org_admin, super_admin all satisfy `has_role('program_manager')`).
Indexes: `service_plans(organization_id, client_id)`, `service_plans(organization_id, status)`,
and each child on `service_plan_id`.

## Code Structure

- `src/lib/isp/types.ts` — `ServicePlan`, `PlanService`, `PlanOutcome`, `PlanRisk`,
  `PlanSignature`, `PlanStatus`, Zod schemas.
- `src/lib/isp/status.ts` — pure transition rules:
  `canActivate(plan, serviceCount, outcomeCount): { ok: boolean; reasons: string[] }`
  (activate requires effective_date set, ≥1 service, ≥1 outcome) and
  `nextStatuses(current): PlanStatus[]`.
- `src/lib/isp/actions.ts` — server actions: `createPlan`, `updatePlan`, `addService`,
  `removeService`, `linkOutcome`, `unlinkOutcome`, `addRisk`, `removeRisk`,
  `activatePlan` (guarded by `status.ts`), `setReviewStatus`, `signPlan`. Each audits
  where relevant and re-checks role server-side.
- `src/lib/isp/queries.ts` — `getClientPlans(clientId)`, `getPlan(planId)` (with services,
  outcomes+goal, risks, signatures), RLS-scoped server client.
- Routes: `src/app/(app)/clients/[id]/isp/page.tsx` (current plan + history),
  `.../isp/new/page.tsx`, `.../isp/[planId]/page.tsx` (view/edit + sign).
- Components: `src/components/isp/` — `plan-form`, `services-editor`, `outcomes-picker`
  (lists client goals to attach), `risks-editor`, `signatures-panel`, `plan-status-badge`.

## Workflow / Data Flow

```
Create (draft) → fill assessed needs, services, risks; attach goals as outcomes;
set effective/review/annual dates
   → Activate  [canActivate() must pass] → active (activated_at set, audit isp_activated)
   → Team signs (plan_signatures rows; audit isp_signed)
   → Periodic review: set under_review → back to active OR expired
review_date / annual_review_date surface in the existing compliance-alerts engine
(review-due), reusing src/lib/audit/compliance-alerts.ts.
```

Outcomes are existing `goals` rows; the ISP view shows each linked goal with its
current progress (goals already track progress). No duplication of goal/progress data.

## Error Handling

- All action inputs validated with Zod at the boundary; invalid → structured error.
- `activatePlan` calls `canActivate()`; on failure returns the list of missing
  requirements and does not change status (fail-closed).
- Status transitions restricted to `nextStatuses(current)`; illegal transitions rejected.
- Role re-checked server-side in every mutating action (never trust the client).
- Audit writes wrapped so a logging hiccup never blocks the core write, except the
  plan/signature inserts themselves which surface errors to the user.

## Testing

- **Unit:** `status.ts` — `canActivate` (missing date/service/outcome → fails with
  reasons; complete → ok) and `nextStatuses` for each status. Zod schema validation.
- **Integration (test DB):** `createPlan` + child inserts; RLS scoping (other-org cannot
  read); `activatePlan` guard; `signPlan` writes a signature row + audit.
- **E2E (Playwright):** as program_manager — create plan for a client, add a service,
  attach an existing goal as outcome, add a risk, set effective date, activate, sign;
  assert status badge shows Active and the signature appears.

## Out of Scope

- Standalone assessment instruments / forms.
- Plan versioning, amendments, and history diffing.
- AI validation of plan completeness (could later extend the agent layer).
- Billing linkage from plan services (handled by the separate billing roadmap phase).
