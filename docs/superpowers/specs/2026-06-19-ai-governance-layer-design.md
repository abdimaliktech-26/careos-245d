# AI Governance Layer — Design

**Date:** 2026-06-19
**Status:** Approved (design); pending implementation plan
**Project:** CareIntake / Stillwater 245D Suite

## Summary

Make AI production-ready and governable: an env-driven provider abstraction
(Anthropic primary, OpenAI fallback) behind a single gateway that every AI feature
routes through. The gateway enforces per-organization enable/disable, monthly usage
limits, audit logging, graceful failure, and "draft / recommendation" labeling. The
platform runs fully with AI disabled or unconfigured.

Follow-on (separate spec): human-review-before-finalize workflow for compliance
reports.

## Non-negotiables (from requirements)

- **Env-only configuration; no hardcoded API keys.**
- **Non-AI features keep working** if AI is disabled or the API fails.
- AI outputs labeled **draft / recommendation**, never final legal/compliance determinations.
- **Per-provider (per-organization)** enable/disable.
- **Usage limits per provider (organization).**
- **Every AI action logged.**
- **OpenAI fallback** support.

## Environment Variables

```
AI_PROVIDER=anthropic            # anthropic | openai | none
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5 # optional override
OPENAI_MODEL=gpt-4o-mini         # optional override
AI_MONTHLY_LIMIT_DEFAULT=2000    # optional default per-org cap
NEXT_PUBLIC_APP_NAME=Project Higsi
```

No key present (or `AI_PROVIDER=none`) → AI is off; all non-AI features unaffected.

## Provider Abstraction

`src/lib/ai/provider.ts` (rewritten, env-driven):
- `getPrimaryProvider(): 'anthropic' | 'openai' | 'none'` — from `AI_PROVIDER`,
  downgraded to `'none'` if the chosen provider's key is missing.
- `getModel(provider)`: builds the AI SDK model for a provider using its env key +
  model name; returns `null` if unconfigured.
- `getPrimaryModel()` / `getFallbackModel()`: primary from `AI_PROVIDER`; fallback is
  the *other* provider when its key exists.
- `isAiConfigured(): boolean` — a usable provider+key exists.
- `getModelName(provider)` — the resolved model id (for audit).

No keys are ever read in the browser; `provider.ts` is server-only.

## Gateway

`src/lib/ai/gateway.ts` — the single entry point for all AI text generation:

```typescript
export type AiResult =
  | { ok: true; text: string; provider: string; model: string; isDraft: true }
  | { ok: false; reason: 'ai_disabled' | 'limit_reached' | 'not_configured' | 'ai_error'; message: string }

export async function runAiText(input: {
  organizationId: string
  userId: string | null
  feature: string                 // e.g. 'client_summary', 'evv_insights', 'agent_enrich'
  system: string
  prompt: string
}): Promise<AiResult>
```

Flow:
1. `isAiConfigured()` false → `{ ok:false, reason:'not_configured' }`.
2. Org settings: `ai_enabled` false (or feature disabled) → `{ ok:false, reason:'ai_disabled' }`.
3. Usage: current `(org, YYYY-MM)` count ≥ org monthly limit → `{ ok:false, reason:'limit_reached' }`.
4. `generateText(getPrimaryModel())`; on thrown error, retry with `getFallbackModel()`
   if present; on total failure → audit `error` + `{ ok:false, reason:'ai_error' }`.
5. On success: **audit** (`status:'ok'`, provider, model, token usage) + **increment
   usage counter**; return `{ ok:true, text, provider, model, isDraft:true }`.

The gateway never throws to callers — it always returns an `AiResult`.

A thin helper `runAiObject` (same governance, parses JSON like the current agent
enricher) is provided for structured callers.

## Data Model (migration)

```sql
CREATE TABLE org_ai_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  ai_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_limit   INTEGER NOT NULL DEFAULT 2000,
  features        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- per-feature {feature: bool}
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature         TEXT NOT NULL,
  provider        TEXT,
  model           TEXT,
  status          TEXT NOT NULL,            -- 'ok' | 'error' | 'disabled' | 'limit_reached'
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_audit_org_created ON ai_audit_logs(organization_id, created_at DESC);

CREATE TABLE ai_usage_counters (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,            -- 'YYYY-MM'
  count           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, period)
);

-- Atomic increment (avoids read-modify-write races).
CREATE OR REPLACE FUNCTION increment_ai_usage(p_org UUID, p_period TEXT)
RETURNS INTEGER AS $$
  INSERT INTO ai_usage_counters (organization_id, period, count) VALUES (p_org, p_period, 1)
  ON CONFLICT (organization_id, period) DO UPDATE SET count = ai_usage_counters.count + 1
  RETURNING count;
$$ LANGUAGE sql;
```

- **No raw prompts/PHI** stored in `ai_audit_logs` — only feature, provider, model,
  status, and token counts.
- RLS: all three org-scoped (`organization_id = get_my_org_id()`); writes via the
  server admin client (gateway runs server-side). `org_ai_settings` writable by
  `org_admin`/`super_admin`.
- New `audit_action`: `ai_generation` (high-level entry alongside `ai_audit_logs`).
- PHI note: `ai_audit_logs` rows are PHI-adjacent metadata; retained per policy.

## Admin Controls

- **Super-admin** (org detail page): toggle `ai_enabled`, set `monthly_limit` for any org.
- **Org admin** (org AI settings page): see AI status + current month usage; toggle
  features in `features` jsonb that they are permitted to control.
- Server actions `setOrgAiEnabled`, `setOrgAiLimit`, `setOrgAiFeature` (role-checked).

## Draft Labeling

- Gateway returns `isDraft: true` on every success.
- A shared `<AiDraftBadge>` component renders: *"AI draft / recommendation — not a
  final legal or compliance determination."* Shown wherever AI output is displayed
  (summaries, EVV insights, narratives, agent explanations).

## Error Handling / Degradation

- Gateway is total: returns `AiResult`, never throws.
- AI routes/components map `ok:false` to a friendly "AI unavailable" / "AI disabled"
  state; the page still renders.
- Non-AI features never import the gateway; no AI dependency on core flows.

## Call-Site Refactor

Each of `src/app/api/ai/*/route.ts`, `src/app/api/chat/route.ts`, and
`src/lib/agent/ai/enrich.ts` switches from importing `aiModel` + calling
`generateText` directly to calling `runAiText` / `runAiObject` with a `feature` name
and the org/user context. Behavior on success is unchanged; on `ok:false` they return
a clear unavailable response.

## App Name

Replace hardcoded "CareIntake" branding in shared UI (titles, headers, emails) with
`process.env.NEXT_PUBLIC_APP_NAME ?? 'CareIntake'`, exposed via a small
`appName()` helper so the name is configurable per deployment (e.g. "Project Higsi").

## Testing

- **Unit:** `provider.ts` resolution (anthropic/openai/none; missing key → none;
  fallback selection); `isAiConfigured`; pure usage-limit check; draft badge text.
- **Integration (test DB):** gateway paths — disabled org → `ai_disabled` + audit row;
  over limit → `limit_reached`; success (mocked model) → audit `ok` + usage increment.
- **E2E:** with `AI_PROVIDER=none`, an AI-using page renders and shows "AI unavailable"
  (no crash); admin can toggle an org's AI off.

## Out of Scope (separate specs)

- Human-review-before-finalize workflow for compliance reports.
- Streaming UI changes / per-token cost accounting / billing for AI usage.
- Provider-specific advanced features (tools, vision).
