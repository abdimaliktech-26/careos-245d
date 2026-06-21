# AI Governance Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all AI through one env-driven, governed gateway (Anthropic primary, OpenAI fallback) with per-org enable/disable, monthly usage limits, audit logging, graceful failure, and draft labeling — and keep the platform fully working when AI is off.

**Architecture:** `provider.ts` resolves models from env. `gateway.ts` (`runAiText`/`runAiObject`) is the single seam every AI feature calls; it checks org settings + usage limit, calls the model with fallback, audits, increments usage, and returns a result object (never throws). Admin controls + a draft badge complete it.

**Tech Stack:** TypeScript, Next.js 16, Supabase (RLS + RPC), Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`), Zod, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-19-ai-governance-layer-design.md`

---

## File Structure

- Modify `src/lib/ai/provider.ts` — env-driven provider/model resolution (+ back-compat `aiModel`).
- Create `src/lib/ai/usage.ts` — pure usage-limit check.
- Create `src/lib/ai/gateway.ts` — `runAiText`, `runAiObject`, governance.
- Create `src/lib/ai/settings.ts` — `getOrgAiSettings`, admin set actions.
- Create `src/lib/app-config.ts` — `appName()`.
- Create `src/components/ai/ai-draft-badge.tsx`.
- Create `supabase/migrations/202606200001_ai_governance.sql`.
- Modify `src/lib/audit/log.ts` — add `ai_generation`.
- Modify `src/app/api/ai/*/route.ts`, `src/app/api/chat/route.ts`, `src/lib/agent/ai/enrich.ts` — call gateway.
- Modify org settings UI (super-admin org detail + an org AI settings surface).
- Tests under `src/lib/ai/__tests__/` + `e2e/ai-governance.spec.ts`.

Constants: env `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_MODEL`, `AI_MONTHLY_LIMIT_DEFAULT`, `NEXT_PUBLIC_APP_NAME`.

---

## Task 1: Env-driven provider resolution

**Files:**
- Modify: `src/lib/ai/provider.ts`
- Test: `src/lib/ai/__tests__/provider.test.ts`

- [ ] **Step 1: Rewrite provider.ts**

```typescript
// src/lib/ai/provider.ts
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

export type AiProvider = 'anthropic' | 'openai' | 'none'

function hasKey(p: AiProvider): boolean {
  if (p === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY)
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  return false
}

export function getModelName(p: AiProvider): string {
  if (p === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5'
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  return ''
}

/** Configured primary provider, downgraded to 'none' if its key is missing. */
export function getPrimaryProvider(): AiProvider {
  const want = (process.env.AI_PROVIDER || 'anthropic').toLowerCase() as AiProvider
  if (want === 'none') return 'none'
  if (want === 'anthropic' || want === 'openai') return hasKey(want) ? want : 'none'
  return 'none'
}

/** The other provider, only if its key exists (used as fallback). */
export function getFallbackProvider(): AiProvider {
  const primary = getPrimaryProvider()
  if (primary === 'anthropic' && hasKey('openai')) return 'openai'
  if (primary === 'openai' && hasKey('anthropic')) return 'anthropic'
  return 'none'
}

export function getModel(p: AiProvider): LanguageModel | null {
  if (p === 'anthropic' && hasKey('anthropic')) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(getModelName('anthropic'))
  }
  if (p === 'openai' && hasKey('openai')) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })(getModelName('openai'))
  }
  return null
}

export function isAiConfigured(): boolean {
  return getPrimaryProvider() !== 'none'
}

// Back-compat: existing imports of `aiModel` keep working until the gateway
// refactor (Task 6) removes them. Resolves to the primary model or null.
export const aiModel = getModel(getPrimaryProvider())
```

- [ ] **Step 2: Test (env-driven, reset env per case)**

```typescript
// src/lib/ai/__tests__/provider.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { getPrimaryProvider, getFallbackProvider, isAiConfigured, getModelName } from '../provider'

const ORIG = { ...process.env }
beforeEach(() => { delete process.env.AI_PROVIDER; delete process.env.ANTHROPIC_API_KEY; delete process.env.OPENAI_API_KEY })
afterEach(() => { process.env = { ...ORIG } })

describe('provider resolution', () => {
  test('anthropic chosen + key present', () => {
    process.env.AI_PROVIDER = 'anthropic'; process.env.ANTHROPIC_API_KEY = 'k'
    expect(getPrimaryProvider()).toBe('anthropic'); expect(isAiConfigured()).toBe(true)
  })
  test('chosen provider without key downgrades to none', () => {
    process.env.AI_PROVIDER = 'anthropic'
    expect(getPrimaryProvider()).toBe('none'); expect(isAiConfigured()).toBe(false)
  })
  test('openai fallback when anthropic primary + openai key', () => {
    process.env.AI_PROVIDER = 'anthropic'; process.env.ANTHROPIC_API_KEY = 'k'; process.env.OPENAI_API_KEY = 'o'
    expect(getFallbackProvider()).toBe('openai')
  })
  test('AI_PROVIDER=none', () => {
    process.env.AI_PROVIDER = 'none'; process.env.ANTHROPIC_API_KEY = 'k'
    expect(getPrimaryProvider()).toBe('none')
  })
  test('model name override', () => {
    process.env.OPENAI_MODEL = 'gpt-x'; expect(getModelName('openai')).toBe('gpt-x')
  })
})
```

- [ ] **Step 3: Run + tsc + commit**

Run: `npx vitest run src/lib/ai/__tests__/provider.test.ts && npx tsc --noEmit`
```bash
git add src/lib/ai/provider.ts src/lib/ai/__tests__/provider.test.ts
git commit -m "feat(ai): env-driven provider resolution (anthropic/openai/none + fallback)"
```

---

## Task 2: Migration

**Files:**
- Create: `supabase/migrations/202606200001_ai_governance.sql`

- [ ] **Step 1: Write the migration**

```sql
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ai_generation';

CREATE TABLE IF NOT EXISTS org_ai_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  ai_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_limit   INTEGER NOT NULL DEFAULT 2000,
  features        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature         TEXT NOT NULL,
  provider        TEXT,
  model           TEXT,
  status          TEXT NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_org_created ON ai_audit_logs(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_counters (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period          TEXT NOT NULL,
  count           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, period)
);

CREATE OR REPLACE FUNCTION increment_ai_usage(p_org UUID, p_period TEXT)
RETURNS INTEGER AS $$
  INSERT INTO ai_usage_counters (organization_id, period, count) VALUES (p_org, p_period, 1)
  ON CONFLICT (organization_id, period) DO UPDATE SET count = ai_usage_counters.count + 1
  RETURNING count;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

ALTER TABLE org_ai_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_counters  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oas_select" ON org_ai_settings FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "oas_write"  ON org_ai_settings FOR ALL
  USING (organization_id = get_my_org_id() AND has_role('org_admin'))
  WITH CHECK (organization_id = get_my_org_id() AND has_role('org_admin'));

CREATE POLICY "aal_select" ON ai_audit_logs FOR SELECT USING (organization_id = get_my_org_id());
CREATE POLICY "auc_select" ON ai_usage_counters FOR SELECT USING (organization_id = get_my_org_id());
-- inserts/increments go through the service-role gateway (bypasses RLS).

REVOKE EXECUTE ON FUNCTION increment_ai_usage(UUID, TEXT) FROM PUBLIC, anon, authenticated;
```

- [ ] **Step 2: Apply (split enum from rest)**

Apply via Supabase MCP `apply_migration` (project `hwsbizbdvxofsyehttkw`):
1. `ai_gen_enum`: `ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ai_generation';`
2. `ai_governance_tables`: everything else above (tables, RPC, RLS, revoke).

- [ ] **Step 3: Verify**

```bash
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)
node -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  for (const t of ["org_ai_settings","ai_audit_logs","ai_usage_counters"]) { const {error}=await a.from(t).select("*").limit(1); console.log(t, error? "ERR "+error.message : "OK"); }
  const {data,error}=await a.rpc("increment_ai_usage",{p_org:"00000000-0000-0000-0000-000000000000",p_period:"2026-06"}).then(r=>r,e=>({error:e}));
  console.log("rpc", error? "ERR" : "callable (fk may reject test org — that is fine)");
});'
```
Expected: three `OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606200001_ai_governance.sql
git commit -m "feat(ai): governance tables + usage RPC migration"
```

---

## Task 3: Usage-limit pure check + settings reader

**Files:**
- Create: `src/lib/ai/usage.ts`
- Create: `src/lib/ai/settings.ts`
- Test: `src/lib/ai/__tests__/usage.test.ts`

- [ ] **Step 1: Pure usage check + period helper**

```typescript
// src/lib/ai/usage.ts
export function currentPeriod(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7) // 'YYYY-MM'
}
export function isOverLimit(currentCount: number, monthlyLimit: number): boolean {
  return currentCount >= monthlyLimit
}
```

- [ ] **Step 2: Settings reader + feature gate**

```typescript
// src/lib/ai/settings.ts
import { createAdminClient } from '@/lib/supabase/admin'

export type OrgAiSettings = { aiEnabled: boolean; monthlyLimit: number; features: Record<string, boolean> }

const DEFAULTS: OrgAiSettings = {
  aiEnabled: true,
  monthlyLimit: Number(process.env.AI_MONTHLY_LIMIT_DEFAULT || 2000),
  features: {},
}

/** Effective AI settings for an org (defaults when no row). Admin client. */
export async function getOrgAiSettings(organizationId: string): Promise<OrgAiSettings> {
  const admin = createAdminClient()
  const { data } = await admin.from('org_ai_settings')
    .select('ai_enabled, monthly_limit, features').eq('organization_id', organizationId).maybeSingle()
  if (!data) return DEFAULTS
  return {
    aiEnabled: data.ai_enabled,
    monthlyLimit: data.monthly_limit ?? DEFAULTS.monthlyLimit,
    features: (data.features as Record<string, boolean>) ?? {},
  }
}

/** A feature is on unless explicitly set false. */
export function isFeatureEnabled(settings: OrgAiSettings, feature: string): boolean {
  return settings.aiEnabled && settings.features[feature] !== false
}
```

- [ ] **Step 3: Test the pure parts**

```typescript
// src/lib/ai/__tests__/usage.test.ts
import { describe, test, expect } from 'vitest'
import { currentPeriod, isOverLimit } from '../usage'
import { isFeatureEnabled, type OrgAiSettings } from '../settings'

describe('usage', () => {
  test('period is YYYY-MM', () => { expect(currentPeriod(new Date('2026-06-20T00:00:00Z'))).toBe('2026-06') })
  test('over limit at/above cap', () => { expect(isOverLimit(2000, 2000)).toBe(true); expect(isOverLimit(1999, 2000)).toBe(false) })
})
describe('feature gate', () => {
  const s: OrgAiSettings = { aiEnabled: true, monthlyLimit: 10, features: { evv_insights: false } }
  test('feature explicitly disabled', () => { expect(isFeatureEnabled(s, 'evv_insights')).toBe(false) })
  test('feature default on', () => { expect(isFeatureEnabled(s, 'client_summary')).toBe(true) })
  test('org disabled disables all', () => { expect(isFeatureEnabled({ ...s, aiEnabled: false }, 'client_summary')).toBe(false) })
})
```

- [ ] **Step 4: Run + tsc + commit**

Run: `npx vitest run src/lib/ai/__tests__/usage.test.ts && npx tsc --noEmit`
```bash
git add src/lib/ai/usage.ts src/lib/ai/settings.ts src/lib/ai/__tests__/usage.test.ts
git commit -m "feat(ai): org AI settings + usage-limit logic"
```

---

## Task 4: The gateway

**Files:**
- Create: `src/lib/ai/gateway.ts`
- Test: `src/lib/ai/__tests__/gateway.test.ts`

- [ ] **Step 1: Implement the gateway**

```typescript
// src/lib/ai/gateway.ts
import { generateText, type LanguageModel } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getModel, getPrimaryProvider, getFallbackProvider, getModelName, isAiConfigured, type AiProvider } from './provider'
import { getOrgAiSettings, isFeatureEnabled } from './settings'
import { currentPeriod, isOverLimit } from './usage'

export type AiOk = { ok: true; text: string; provider: string; model: string; isDraft: true }
export type AiFail = { ok: false; reason: 'not_configured' | 'ai_disabled' | 'limit_reached' | 'ai_error'; message: string }
export type AiResult = AiOk | AiFail

type AiInput = { organizationId: string; userId: string | null; feature: string; system: string; prompt: string }

async function audit(input: AiInput, provider: AiProvider, status: string, usage?: { input?: number; output?: number }) {
  const admin = createAdminClient()
  await admin.from('ai_audit_logs').insert({
    organization_id: input.organizationId, user_id: input.userId, feature: input.feature,
    provider: provider === 'none' ? null : provider, model: provider === 'none' ? null : getModelName(provider),
    status, input_tokens: usage?.input ?? null, output_tokens: usage?.output ?? null,
  }).then(() => null, () => null)
}

async function tryModel(model: LanguageModel, system: string, prompt: string) {
  const r = await generateText({ model, system, prompt })
  return { text: r.text, input: r.usage?.inputTokens, output: r.usage?.outputTokens }
}

/** Governed AI text generation. Never throws — always returns an AiResult. */
export async function runAiText(input: AiInput): Promise<AiResult> {
  if (!isAiConfigured()) { await audit(input, 'none', 'not_configured'); return { ok: false, reason: 'not_configured', message: 'AI is not configured.' } }

  const settings = await getOrgAiSettings(input.organizationId)
  if (!isFeatureEnabled(settings, input.feature)) { await audit(input, 'none', 'disabled'); return { ok: false, reason: 'ai_disabled', message: 'AI is disabled for this organization.' } }

  const admin = createAdminClient()
  const period = currentPeriod()
  const { data: counter } = await admin.from('ai_usage_counters').select('count').eq('organization_id', input.organizationId).eq('period', period).maybeSingle()
  if (isOverLimit(counter?.count ?? 0, settings.monthlyLimit)) { await audit(input, 'none', 'limit_reached'); return { ok: false, reason: 'limit_reached', message: 'Monthly AI usage limit reached.' } }

  const primary = getPrimaryProvider()
  const fallback = getFallbackProvider()
  for (const provider of [primary, fallback]) {
    if (provider === 'none') continue
    const model = getModel(provider)
    if (!model) continue
    try {
      const out = await tryModel(model, input.system, input.prompt)
      await admin.rpc('increment_ai_usage', { p_org: input.organizationId, p_period: period }).then(() => null, () => null)
      await audit(input, provider, 'ok', { input: out.input, output: out.output })
      return { ok: true, text: out.text, provider, model: getModelName(provider), isDraft: true }
    } catch {
      // try fallback
    }
  }
  await audit(input, primary, 'error')
  return { ok: false, reason: 'ai_error', message: 'AI request failed.' }
}

/** Same governance, parses the model's JSON text with a validator. */
export async function runAiObject<T>(input: AiInput, parse: (text: string) => T): Promise<{ ok: true; data: T; isDraft: true } | AiFail> {
  const res = await runAiText(input)
  if (!res.ok) return res
  try { return { ok: true, data: parse(res.text), isDraft: true } } catch { return { ok: false, reason: 'ai_error', message: 'AI returned unparseable output.' } }
}
```

- [ ] **Step 2: Test (mock provider + supabase admin)**

```typescript
// src/lib/ai/__tests__/gateway.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest'

const insert = vi.fn(() => ({ then: (r: () => void) => r() }))
const maybeSingle = vi.fn()
const rpc = vi.fn(() => ({ then: (r: () => void) => r() }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ insert, select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }),
    rpc,
  }),
}))
const generateText = vi.fn()
vi.mock('ai', () => ({ generateText: (...a: unknown[]) => generateText(...a) }))
vi.mock('../provider', () => ({
  getPrimaryProvider: () => 'anthropic', getFallbackProvider: () => 'none',
  getModel: () => ({}), getModelName: () => 'claude-haiku-4-5', isAiConfigured: () => true,
}))
vi.mock('../settings', () => ({
  getOrgAiSettings: async () => ({ aiEnabled: true, monthlyLimit: 100, features: {} }),
  isFeatureEnabled: () => true,
}))

import { runAiText } from '../gateway'

beforeEach(() => { vi.clearAllMocks(); maybeSingle.mockResolvedValue({ data: { count: 0 } }) })

describe('runAiText', () => {
  test('success returns draft text + increments usage', async () => {
    generateText.mockResolvedValueOnce({ text: 'hello', usage: { inputTokens: 5, outputTokens: 2 } })
    const r = await runAiText({ organizationId: 'o', userId: 'u', feature: 'f', system: 's', prompt: 'p' })
    expect(r).toMatchObject({ ok: true, text: 'hello', isDraft: true })
    expect(rpc).toHaveBeenCalledOnce()
  })
  test('over limit blocks', async () => {
    maybeSingle.mockResolvedValueOnce({ data: { count: 100 } })
    const r = await runAiText({ organizationId: 'o', userId: 'u', feature: 'f', system: 's', prompt: 'p' })
    expect(r).toMatchObject({ ok: false, reason: 'limit_reached' })
  })
  test('model error returns ai_error, never throws', async () => {
    generateText.mockRejectedValueOnce(new Error('boom'))
    const r = await runAiText({ organizationId: 'o', userId: 'u', feature: 'f', system: 's', prompt: 'p' })
    expect(r).toMatchObject({ ok: false, reason: 'ai_error' })
  })
})
```

- [ ] **Step 3: Run + tsc + commit**

Run: `npx vitest run src/lib/ai/__tests__/gateway.test.ts && npx tsc --noEmit`
```bash
git add src/lib/ai/gateway.ts src/lib/ai/__tests__/gateway.test.ts
git commit -m "feat(ai): governed AI gateway (limits, fallback, audit, draft)"
```

---

## Task 5: Admin controls + app name + draft badge

**Files:**
- Modify: `src/lib/audit/log.ts` (add `ai_generation`)
- Create: `src/lib/ai/admin-actions.ts` — `setOrgAiEnabled`, `setOrgAiLimit`
- Create: `src/lib/app-config.ts` — `appName()`
- Create: `src/components/ai/ai-draft-badge.tsx`
- Modify: super-admin org detail page (AI toggle + limit)

- [ ] **Step 1: Audit action**

In `src/lib/audit/log.ts` `AuditAction` union add: `| 'ai_generation'`.

- [ ] **Step 2: Admin actions**

```typescript
// src/lib/ai/admin-actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
type R = { error: string | null }
async function requireSuper() { const { user } = await getSession(); return user?.role === 'super_admin' ? user : null }

export async function setOrgAiEnabled(orgId: string, enabled: boolean): Promise<R> {
  if (!(await requireSuper())) return { error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('org_ai_settings')
    .upsert({ organization_id: orgId, ai_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
  return { error: error?.message ?? null }
}
export async function setOrgAiLimit(orgId: string, monthlyLimit: number): Promise<R> {
  if (!(await requireSuper())) return { error: 'Unauthorized' }
  const supabase = await createClient()
  const { error } = await supabase.from('org_ai_settings')
    .upsert({ organization_id: orgId, monthly_limit: Math.max(0, monthlyLimit), updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
  return { error: error?.message ?? null }
}
```
Note: super-admin reads/writes any org via the RLS rule `organization_id = get_my_org_id()` only when impersonating; for cross-org control here use the **admin client**. Replace `createClient()` with `createAdminClient()` from `@/lib/supabase/admin` in both actions so a super admin can govern any org without impersonating.

- [ ] **Step 3: App name helper**

```typescript
// src/lib/app-config.ts
export function appName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || 'CareIntake'
}
```

- [ ] **Step 4: Draft badge**

```typescript
// src/components/ai/ai-draft-badge.tsx
export function AiDraftBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      AI draft · recommendation — not a final determination
    </span>
  )
}
```

- [ ] **Step 5: Wire AI toggle + limit into super-admin org detail**

In `src/app/super-admin/organizations/[id]/page.tsx` (read it first), read the org's
`org_ai_settings` via admin client, and render a small client form calling
`setOrgAiEnabled` / `setOrgAiLimit` (checkbox + number input), following the page's
existing form/section style.

- [ ] **Step 6: Typecheck + lint + build + commit**

Run: `npx tsc --noEmit && npm run lint && npm run build`
```bash
git add src/lib/audit/log.ts src/lib/ai/admin-actions.ts src/lib/app-config.ts src/components/ai/ai-draft-badge.tsx src/app/super-admin/organizations
git commit -m "feat(ai): super-admin AI enable/limit controls, draft badge, app-name helper"
```

---

## Task 6: Route all callers through the gateway

**Files:**
- Modify: `src/lib/agent/ai/enrich.ts`
- Modify: `src/app/api/ai/*/route.ts` (all 10) + `src/app/api/chat/route.ts`
- Modify: `src/lib/ai/provider.ts` (remove `aiModel` export at the end)

- [ ] **Step 1: Convert the agent enricher**

Replace its direct `generateText(aiModel, ...)` with the gateway. `enrichRun` already
takes an optional model for tests; change it to call `runAiText` with the org context.
Update `src/lib/agent/pipeline.ts` `enrichAndPatch` to pass `organizationId`/`userId`
and handle `ok:false` (set `ai_status:'skipped'` when disabled/limit, `'error'` on
failure). Keep `parseEnrichResponse` for parsing.

```typescript
// enrich.ts — new signature
import { runAiText } from '@/lib/ai/gateway'
export async function enrichRun(run: ValidationRun, ctx: { organizationId: string; userId: string | null }): Promise<EnrichResult | { disabled: true }> {
  const res = await runAiText({
    organizationId: ctx.organizationId, userId: ctx.userId, feature: 'agent_enrich',
    system: SYSTEM, prompt: JSON.stringify({ subjectType: run.subjectType, verdict: run.verdict, checks: run.checks, flags: run.flags, programRecommendation: run.programRecommendation }),
  })
  if (!res.ok) return { disabled: true }
  return { ...parseEnrichResponse(res.text), modelId: res.model }
}
```
Adjust the enrich unit test to mock `@/lib/ai/gateway` `runAiText` instead of the model.

- [ ] **Step 2: Convert each AI route**

Pattern for every `src/app/api/ai/*/route.ts` (and `chat`): replace
```typescript
import { aiModel } from '@/lib/ai/provider'
// ...
const { text } = await generateText({ model: aiModel, system: SYS, prompt: P })
return Response.json({ result: text })
```
with
```typescript
import { runAiText } from '@/lib/ai/gateway'
// ...
const res = await runAiText({ organizationId: user.organizationId, userId: user.id, feature: '<route_name>', system: SYS, prompt: P })
if (!res.ok) return Response.json({ error: res.message, reason: res.reason }, { status: res.reason === 'ai_error' ? 502 : 409 })
return Response.json({ result: res.text, isDraft: true })
```
Use a stable `feature` per route: `client_summary`, `evv_insights`, `evv_progress_note`,
`incident_classify`, `morning_briefing`, `note_quality`, `optimize_schedule`,
`generate_narrative`, `auto_fill`, `chat`. Each route already has `user` from
`getSession()`; keep its existing data-gathering, only swap the model call.

- [ ] **Step 3: Remove the back-compat export**

Delete `export const aiModel = ...` from `provider.ts`. Confirm no remaining imports:
`grep -rn "aiModel" src` returns nothing.

- [ ] **Step 4: Typecheck + lint + tests + build**

Run: `npx vitest run && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, build exit 0. Fix any route whose feature/context wiring is off.

- [ ] **Step 5: Commit**

```bash
git add src/app/api src/lib/agent src/lib/ai/provider.ts
git commit -m "refactor(ai): route all AI features through the governed gateway"
```

---

## Task 7: Degradation + E2E + final verification

**Files:**
- Create: `e2e/ai-governance.spec.ts`

- [ ] **Step 1: Integration test — gateway audit/usage rows**

```typescript
// src/lib/ai/__tests__/gateway-integration.test.ts
import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('ai governance tables (integration)', () => {
  const admin = createAdminClient()
  const cleanup: Array<() => Promise<void>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  test('settings upsert + usage increment', { timeout: 30000 }, async () => {
    const { data: org } = await admin.from('organizations').insert({ name: '__ai_gov_org__', status: 'active', plan: 'pro' }).select('id').single()
    const orgId = (org as { id: string }).id
    cleanup.push(async () => { await admin.from('organizations').delete().eq('id', orgId) })
    await admin.from('org_ai_settings').insert({ organization_id: orgId, ai_enabled: false, monthly_limit: 5 })
    const { data: cnt } = await admin.rpc('increment_ai_usage', { p_org: orgId, p_period: '2026-06' })
    expect(typeof cnt).toBe('number')
  })
})
```

- [ ] **Step 2: E2E — AI off, page still works**

```typescript
// e2e/ai-governance.spec.ts
import { test, expect, type Page } from '@playwright/test'
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@careintake.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'
async function login(page: Page) {
  await page.goto('/auth/login'); await page.fill('#email', EMAIL); await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]'); await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}
test('AI-using page renders even when AI returns unavailable', async ({ page }) => {
  await login(page)
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('main')).toBeVisible()  // no crash regardless of AI state
})
```

(With `AI_PROVIDER=none` in the local dev env, AI routes return 409/502 and pages must
still render. The dev `.env.local` may have a key; the gateway still degrades safely
on disabled-org/limit.)

- [ ] **Step 3: Run integration + e2e**

```bash
export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=" .env.local | xargs)
npx vitest run src/lib/ai/__tests__/gateway-integration.test.ts
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/seed-demo.mjs
DOTENV_CONFIG_PATH=.env.local npx playwright test ai-governance.spec.ts --workers=1
```

- [ ] **Step 4: Delete seeded demo users** (same cleanup snippet as other plans).

- [ ] **Step 5: Final verification + commit**

```bash
export $(grep -E "^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=" .env.local | xargs)
npx vitest run && npx tsc --noEmit && npm run lint && npm run build
git add e2e/ai-governance.spec.ts src/lib/ai/__tests__/gateway-integration.test.ts
git commit -m "test(ai): governance integration + degradation e2e"
```

---

## Task 8: Production env wiring (no secrets in code)

**Files:** none in repo — Vercel env + `.env.example`.

- [ ] **Step 1: Update `.env.example`**

Add (values blank): `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=`, `OPENAI_API_KEY=`,
`ANTHROPIC_MODEL=`, `OPENAI_MODEL=`, `AI_MONTHLY_LIMIT_DEFAULT=2000`,
`NEXT_PUBLIC_APP_NAME=`.

- [ ] **Step 2: Set Vercel production env (user action or `vercel env add`)**

`AI_PROVIDER`, `ANTHROPIC_API_KEY` (already present), optionally `OPENAI_API_KEY`,
`NEXT_PUBLIC_APP_NAME`. Do **not** commit any key. Redeploy to apply.

- [ ] **Step 3: Commit env example**

```bash
git add .env.example
git commit -m "chore(ai): document AI governance env vars"
```

---

## Final Verification

- [ ] `npx vitest run` — all pass.
- [ ] `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` exit 0.
- [ ] `npx playwright test` — all pass.
- [ ] `grep -rn "aiModel" src` — empty (all callers on the gateway).
- [ ] Manual: super-admin disables an org's AI → that org's AI routes return "disabled";
      platform pages still render. With a valid key + enabled org, AI returns text +
      draft badge; audit + usage rows appear.

## Spec Coverage Map

- Env-driven provider + OpenAI fallback → Task 1.
- Gateway (limits, audit, error handling, draft) → Task 4.
- Per-org enable/disable + limits → Task 2 (schema) + 3 (read) + 5 (admin controls).
- Audit every AI action → Task 4 (`ai_audit_logs`) + Task 5 (`ai_generation`).
- Draft/recommendation labeling → Task 4 (`isDraft`) + Task 5 (badge).
- Non-AI works if AI off/fails → Task 4 (total gateway) + Task 6 (callers degrade) + Task 7 (e2e).
- No hardcoded keys (env only) → Task 1 + Task 8.
- App name (Project Higsi) → Task 5 (`appName`) + Task 8 (env).
- Human-review-before-finalize → out of scope (separate spec, noted).
