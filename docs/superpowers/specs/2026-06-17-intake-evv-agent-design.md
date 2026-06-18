# Intake & EVV AI Agent Layer — Design

**Date:** 2026-06-17
**Status:** Approved (design); pending implementation plan
**Project:** CareIntake / Stillwater 245D Suite

## Summary

Add an AI agent layer that processes **intake form submissions** and **EVV data**.
It validates client eligibility data, flags missing required fields, recommends the
correct program (human-confirmed), monitors EVV entries for accuracy and 21st
Century Cures Act / MN 245D compliance, and logs every validation and EVV step to
Supabase for HIPAA audit.

**Core principle:** deterministic rules make every pass/fail decision (reproducible,
auditable); the LLM only adds plain-English explanations, a program-routing
recommendation, and fuzzy anomaly flags. The LLM never sets a verdict and never
blocks a submission.

## Decisions (from brainstorming)

1. **AI role:** rules decide, AI explains/flags.
2. **Trigger model:** deterministic validation + audit log run synchronously on
   submit (instant pass/fail; hard-fail blocks). AI explanation/routing runs async
   (`after()`/`waitUntil`) and patches the record.
3. **Audit storage:** dedicated immutable table `agent_validation_runs` + a summary
   row in existing `audit_logs`.
4. **EVV trigger:** on visit clock-out/complete **and** a daily cron sweep of
   open/recent visits.
5. **Program routing:** recommend + flag for human confirm. No auto-write to client
   records.

## Architecture & Components

Approach chosen: a self-contained `src/lib/agent/` orchestration layer. Existing
actions call into it; no validation/AI/audit logic is bolted into action files.

```
src/lib/agent/
  pipeline.ts          # runIntakeValidation(), runEvvValidation() — orchestrators
  types.ts             # ValidationRun, CheckResult, Verdict, Flag, ProgramRecommendation
  intake/
    eligibility.ts     # deterministic: eligibility data checks (program, waiver, county, dates, guardianship)
    required-fields.ts # deterministic: missing/invalid required fields vs form schema
    program-router.ts  # deterministic candidate + AI tie-break -> recommendation (no auto-write)
  evv/
    validate.ts        # wraps existing evv/compliance.ts (Cures-Act 6 + MN 245D) into CheckResults
  ai/
    enrich.ts          # aiModel: plain-English reasons, anomaly flags, routing rationale (async)
  audit/
    record.ts          # writes agent_validation_runs + summary audit_logs row
```

**Boundaries**
- Validators are pure functions: input -> `CheckResult[]`, no I/O, fully unit-testable.
- AI enricher is isolated and best-effort; failure never blocks a verdict.
- Audit writer is the only DB writer in the layer.

**Reuse**
- EVV validators wrap existing `src/lib/evv/compliance.ts` (no rule duplication).
- AI uses existing `src/lib/ai/provider.ts` (`aiModel` = Anthropic `claude-haiku-4-5`,
  HIPAA-eligible with BAA + zero data retention).
- Audit summary reuses `src/lib/audit/log.ts` `logAuditEvent`.

**Integration points (existing code)**
- Intake: `src/lib/forms/actions.ts` -> `submitFormForSignatures` (line ~188).
- EVV completion: `src/lib/evv/workflow-actions.ts` (visit reaches `completed`).
- Daily sweep: existing `evv-aggregator` cron (`/api/cron/evv-aggregator`).

## Data Model

New migration `supabase/migrations/<ts>_agent_validation.sql`:

```sql
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'agent_validation_run';

CREATE TABLE agent_validation_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL,          -- 'intake_form' | 'evv_visit'
  subject_id      UUID NOT NULL,          -- packet_form id or evv_visit id
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  trigger         TEXT NOT NULL,          -- 'form_submitted' | 'visit_clock_out' | 'daily_sweep'
  verdict         TEXT NOT NULL,          -- 'pass' | 'warn' | 'fail'
  checks          JSONB NOT NULL,         -- CheckResult[]: {key,label,status,detail}
  flags           JSONB NOT NULL DEFAULT '[]',
  program_recommendation JSONB,           -- {program, confidence, reason} | null
  ai_summary      TEXT,
  ai_model        TEXT,
  ai_status       TEXT NOT NULL DEFAULT 'pending', -- 'pending'|'done'|'skipped'|'error'
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_avr_org_created ON agent_validation_runs(organization_id, created_at DESC);
CREATE INDEX idx_avr_subject ON agent_validation_runs(subject_type, subject_id);
CREATE INDEX idx_avr_verdict ON agent_validation_runs(organization_id, verdict);
```

**Immutability + RLS**
- Enable RLS. `SELECT` allowed for org members (`organization_id = get_my_org_id()`).
- INSERT only via service/admin client (the audit writer). No UPDATE/DELETE policies.
- Exception: the async AI step patches only `ai_summary`, `ai_model`, `ai_status`,
  `flags`, `program_recommendation` on its own row via the admin client.
- Deterministic verdict + checks are committed immediately; AI columns fill async
  (`ai_status: pending -> done`).

**HIPAA / minimum-necessary**
- `checks`/`flags` store field *keys* and IDs, not raw PHI values where avoidable.
- AI prompts include only the minimum fields needed for the task.

## Data Flow

**Intake pipeline** (on `submitFormForSignatures` / intake submit):
1. Gather form_data + client eligibility row.
2. Deterministic (sync): `required-fields` -> missing/invalid flags; `eligibility`
   -> check results; `program-router` -> candidate program + confidence.
3. Verdict: `fail` (hard-missing required / ineligible) | `warn` | `pass`.
4. `audit/record` (sync): INSERT `agent_validation_runs` (ai_status='pending') +
   `audit_logs` summary row.
5. If `verdict=fail` -> return blocking structured error (which fields / why);
   submission stops. Else submission proceeds.
6. Async (`after()`/`waitUntil`): `ai/enrich` -> ai_summary, anomaly flags, routing
   rationale; ambiguous program -> create admin review flag (recommend + confirm).
   Patch row (ai_status='done').

**EVV pipeline** (on visit clock-out/complete AND daily sweep):
1. Load visit -> map to `EvvComplianceVisit`.
2. Deterministic (sync): `evv/validate` wraps `evv/compliance.ts` -> Cures-Act 6
   elements + MN 245D + exceptions -> CheckResult[] + flags.
3. Verdict from exceptions.
4. `audit/record`: INSERT run (trigger='visit_clock_out' | 'daily_sweep') +
   audit_logs summary. Flagged visits surface in existing EVV compliance views.
5. Async `ai/enrich`: explanation + anomaly detection (improbable GPS distance,
   duration outliers) -> patch row.

**Daily sweep:** extend `evv-aggregator` cron to run `runEvvValidation` over
open/recent visits. Dedup by `(subject_id, trigger='daily_sweep', date)`.

**Key rule:** deterministic verdict + audit row commit *before* any AI call; AI is
always best-effort enrichment.

## Error Handling

- **AI failure isolated:** `enrich.ts` in try/catch; on error set `ai_status='error'`,
  leave verdict/audit intact. LLM timeout/down never blocks submission or loses audit.
- **AI output validated:** parse LLM responses with `generateObject` + Zod (program
  enum, bounded confidence, string lengths). Malformed -> discard, `ai_status='error'`.
- **Hard-fail explicit:** intake `verdict='fail'` returns structured error to caller;
  submission blocked. Warn/pass proceed.
- **Audit write failure:** if `agent_validation_runs` INSERT fails, the validation
  step throws (fail-closed) — never silently skip a HIPAA audit event.
- **Idempotency:** daily-sweep dedup key prevents duplicate runs; re-submitting a form
  creates a new immutable run (history preserved).
- **Input validation:** all pipeline inputs validated with Zod at the boundary before
  processing; never trust raw `form_data`.

## Testing

- **Unit (bulk, ≥80%):** pure validators (`required-fields`, `eligibility`,
  `program-router`, `evv/validate`) — table-driven pass/warn/fail + edge cases. AI
  enricher with a mocked model.
- **Integration:** `runIntakeValidation` / `runEvvValidation` against test Supabase —
  assert `agent_validation_runs` + `audit_logs` rows, verdict, blocking, idempotency.
- **E2E (Playwright):** intake missing required field -> blocked + flagged; EVV visit
  with GPS exception -> flagged run in compliance view.

## Out of Scope

- Auto-writing program/eligibility to client records (human-confirm only).
- Replacing or rewriting the existing deterministic `evv/compliance.ts` rules.
- New AI provider integrations (reuse existing Anthropic Haiku provider).
- Admin UI beyond surfacing flags/recommendations in existing views (covered in plan).
