# Super Admin Org Impersonation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a super_admin enter a specific org and act as its admin for a 60-minute, audited, banner-indicated session, with explicit exit.

**Architecture:** A DB-backed `super_admin_impersonations` row is the single source of the "effective org". `get_my_org_id()` (RLS) and `getSession` (app) both read it, so the database and app always agree; every existing admin page + RLS policy automatically operates on the target org. Enter/exit are audited server actions.

**Tech Stack:** TypeScript, Next.js 16 App Router (Server Actions), Supabase (RLS + service client), Postgres functions, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-17-super-admin-org-impersonation-design.md`

---

## File Structure

- Create `supabase/migrations/202606170002_super_admin_impersonation.sql` — table, RLS, enum values, `get_my_org_id()` rewrite.
- Create `src/lib/super-admin/impersonation.ts` — `enterOrg`, `exitOrg`, `getActiveImpersonation`.
- Modify `src/types/app.ts` — add `impersonating` to `UserProfile`.
- Modify `src/lib/auth/get-session.ts` — override org when impersonating.
- Modify `src/lib/audit/log.ts` — add audit action union values.
- Create `src/components/super-admin/impersonation-banner.tsx` — sticky banner + exit + countdown.
- Modify `src/app/(app)/layout.tsx` — render the banner when impersonating.
- Modify `src/components/super-admin/org-table.tsx` — "Enter as admin" per row.
- Tests under `src/lib/super-admin/__tests__/` and `e2e/impersonation.spec.ts`.

---

## Task 1: Migration — table, RLS, enum, get_my_org_id rewrite

**Files:**
- Create: `supabase/migrations/202606170002_super_admin_impersonation.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Super admin org impersonation ("enter as admin").

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'impersonation_started';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'impersonation_ended';

CREATE TABLE IF NOT EXISTS super_admin_impersonations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_impersonation
  ON super_admin_impersonations(super_admin_id)
  WHERE ended_at IS NULL;

ALTER TABLE super_admin_impersonations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_select_own"
  ON super_admin_impersonations FOR SELECT
  USING (super_admin_id = auth.uid());

-- get_my_org_id() now prefers an active impersonation, but ONLY for a real super admin.
CREATE OR REPLACE FUNCTION get_my_org_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (SELECT i.organization_id
       FROM super_admin_impersonations i
      WHERE i.super_admin_id = auth.uid()
        AND i.ended_at IS NULL
        AND i.expires_at > NOW()
        AND is_super_admin()
      ORDER BY i.started_at DESC
      LIMIT 1),
    (SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = TRUE
      LIMIT 1)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

- [ ] **Step 2: Apply to the live DB (split: enum, then table, then function)**

`ALTER TYPE ... ADD VALUE` cannot be used in the same transaction as statements that
use it, and the Supabase migration tool wraps statements in a transaction. Apply in
three separate `apply_migration` calls (project `hwsbizbdvxofsyehttkw`):

1. name `impersonation_enum`:
   ```sql
   ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'impersonation_started';
   ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'impersonation_ended';
   ```
2. name `impersonation_table`: the `CREATE TABLE` + index + `ENABLE ROW LEVEL SECURITY`
   + `CREATE POLICY` block above.
3. name `impersonation_get_my_org_id`: the `CREATE OR REPLACE FUNCTION get_my_org_id()` block.

- [ ] **Step 3: Verify table + function**

```bash
export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs)
node -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const {error}=await a.from("super_admin_impersonations").select("id").limit(1);
  console.log(error? "ERR "+error.message : "TABLE OK");
});'
```
Expected: `TABLE OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202606170002_super_admin_impersonation.sql
git commit -m "feat(impersonation): table, RLS, and get_my_org_id override migration"
```

---

## Task 2: UserProfile type + getActiveImpersonation helper

**Files:**
- Modify: `src/types/app.ts`
- Create: `src/lib/super-admin/impersonation.ts`
- Test: `src/lib/super-admin/__tests__/impersonation.test.ts`

- [ ] **Step 1: Add `impersonating` to UserProfile**

In `src/types/app.ts`, extend the `UserProfile` type:

```typescript
export type UserProfile = {
  id: string
  organizationId: string | null
  role: Role
  fullName: string
  email: string
  isActive: boolean
  impersonating?: { orgId: string; orgName: string; expiresAt: string } | null
}
```

- [ ] **Step 2: Write the failing test for getActiveImpersonation**

```typescript
// src/lib/super-admin/__tests__/impersonation.test.ts
import { describe, test, expect, vi } from 'vitest'
import { parseActiveImpersonation, type ImpersonationRow } from '../impersonation'

const future = new Date(Date.now() + 60000).toISOString()
const past = new Date(Date.now() - 60000).toISOString()

describe('parseActiveImpersonation', () => {
  test('returns target org for an active unexpired row', () => {
    const row: ImpersonationRow = { organization_id: 'org-2', expires_at: future, ended_at: null, organizations: { name: 'Acme' } }
    expect(parseActiveImpersonation(row)).toEqual({ orgId: 'org-2', orgName: 'Acme', expiresAt: future })
  })
  test('returns null for an expired row', () => {
    expect(parseActiveImpersonation({ organization_id: 'o', expires_at: past, ended_at: null, organizations: { name: 'X' } })).toBeNull()
  })
  test('returns null for an ended row', () => {
    expect(parseActiveImpersonation({ organization_id: 'o', expires_at: future, ended_at: past, organizations: { name: 'X' } })).toBeNull()
  })
  test('returns null for no row', () => {
    expect(parseActiveImpersonation(null)).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/super-admin/__tests__/impersonation.test.ts`
Expected: FAIL — cannot find module `../impersonation`.

- [ ] **Step 4: Write the implementation**

```typescript
// src/lib/super-admin/impersonation.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { redirect } from 'next/navigation'

const SESSION_MINUTES = 60

export type ImpersonationRow = {
  organization_id: string
  expires_at: string
  ended_at: string | null
  organizations: { name: string } | null
}

export type ActiveImpersonation = { orgId: string; orgName: string; expiresAt: string }

/** Pure: decide whether a row represents an active impersonation. */
export function parseActiveImpersonation(row: ImpersonationRow | null): ActiveImpersonation | null {
  if (!row) return null
  if (row.ended_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return { orgId: row.organization_id, orgName: row.organizations?.name ?? 'Organization', expiresAt: row.expires_at }
}

/** Read the caller's active impersonation (RLS-scoped to own rows). */
export async function getActiveImpersonation(userId: string): Promise<ActiveImpersonation | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('super_admin_impersonations')
    .select('organization_id, expires_at, ended_at, organizations(name)')
    .eq('super_admin_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return parseActiveImpersonation((data as ImpersonationRow | null) ?? null)
}

export async function enterOrg(orgId: string): Promise<{ error: string } | void> {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') return { error: 'Unauthorized' }

  const admin = createAdminClient()
  const { data: org } = await admin.from('organizations').select('id').eq('id', orgId).maybeSingle()
  if (!org) return { error: 'Organization not found' }

  // End any existing active session, then open a fresh one.
  await admin.from('super_admin_impersonations').update({ ended_at: new Date().toISOString() })
    .eq('super_admin_id', user.id).is('ended_at', null)

  const expiresAt = new Date(Date.now() + SESSION_MINUTES * 60000).toISOString()
  const { error: insErr } = await admin.from('super_admin_impersonations').insert({
    super_admin_id: user.id, organization_id: orgId, expires_at: expiresAt,
  })
  if (insErr) return { error: insErr.message }

  await logAuditEvent({
    user, action: 'impersonation_started', entityType: 'organization', entityId: orgId,
    entityLabel: 'Entered org as admin', organizationId: orgId,
  }).catch(() => null)

  redirect('/dashboard')
}

export async function exitOrg(): Promise<{ error: string } | void> {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') return { error: 'Unauthorized' }

  const admin = createAdminClient()
  await admin.from('super_admin_impersonations').update({ ended_at: new Date().toISOString() })
    .eq('super_admin_id', user.id).is('ended_at', null)

  await logAuditEvent({
    user, action: 'impersonation_ended', entityType: 'organization',
    entityId: user.impersonating?.orgId ?? null, entityLabel: 'Exited org admin view',
  }).catch(() => null)

  redirect('/super-admin/organizations')
}
```

Note: `getSession` returns the impersonated `organizationId` (Task 3), so the
`logAuditEvent` in `exitOrg` attributes to the right org via `user.impersonating`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/super-admin/__tests__/impersonation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/types/app.ts src/lib/super-admin/impersonation.ts src/lib/super-admin/__tests__/impersonation.test.ts
git commit -m "feat(impersonation): enter/exit actions + active-impersonation helper"
```

---

## Task 3: getSession override + audit action union

**Files:**
- Modify: `src/lib/audit/log.ts`
- Modify: `src/lib/auth/get-session.ts`
- Test: `src/lib/auth/__tests__/get-session-impersonation.test.ts`

- [ ] **Step 1: Add audit action union values**

In `src/lib/audit/log.ts`, extend the `AuditAction` union:

```typescript
  | 'agent_validation_run'
  | 'impersonation_started'
  | 'impersonation_ended'
```

- [ ] **Step 2: Write the failing test (pure override helper)**

```typescript
// src/lib/auth/__tests__/get-session-impersonation.test.ts
import { describe, test, expect } from 'vitest'
import { applyImpersonation } from '../get-session'
import type { UserProfile } from '@/types/app'

const base: UserProfile = { id: 'u1', organizationId: 'own-org', role: 'super_admin', fullName: 'Su', email: 's@x.com', isActive: true }

describe('applyImpersonation', () => {
  test('overrides org + sets flag when active', () => {
    const out = applyImpersonation(base, { orgId: 'org-2', orgName: 'Acme', expiresAt: 'T' })
    expect(out.organizationId).toBe('org-2')
    expect(out.impersonating).toEqual({ orgId: 'org-2', orgName: 'Acme', expiresAt: 'T' })
  })
  test('unchanged when no impersonation', () => {
    const out = applyImpersonation(base, null)
    expect(out.organizationId).toBe('own-org')
    expect(out.impersonating ?? null).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/__tests__/get-session-impersonation.test.ts`
Expected: FAIL — `applyImpersonation` not exported.

- [ ] **Step 4: Add `applyImpersonation` + wire into getSession**

In `src/lib/auth/get-session.ts`, add the pure helper and call the active-impersonation
read for super admins before returning the profile:

```typescript
import { getActiveImpersonation, type ActiveImpersonation } from '@/lib/super-admin/impersonation'
import type { UserProfile } from '@/types/app'

/** Pure: apply an active impersonation onto a profile (super_admin only path). */
export function applyImpersonation(profile: UserProfile, active: ActiveImpersonation | null): UserProfile {
  if (!active) return profile
  return { ...profile, organizationId: active.orgId, impersonating: active }
}
```

Then in the success branch where the `profile` row is found and a `UserProfile` is
built, replace the direct `return { user: {...}, error: null }` with:

```typescript
    const baseProfile: UserProfile = {
      id: profile.user_id,
      organizationId: profile.organization_id,
      role: profile.role,
      fullName: profile.full_name ?? user.email ?? 'User',
      email: profile.email ?? user.email ?? '',
      isActive: profile.is_active,
    }
    const active = baseProfile.role === 'super_admin'
      ? await getActiveImpersonation(baseProfile.id)
      : null
    return { user: applyImpersonation(baseProfile, active), error: null }
```

Note: `impersonation.ts` imports `getSession` and `get-session.ts` imports
`getActiveImpersonation` — this is a cycle. Avoid it by NOT importing `getSession`
into `impersonation.ts` for the *read* path. `getActiveImpersonation` already stands
alone (no `getSession` use). The `enterOrg`/`exitOrg` actions do use `getSession`; that
is fine at runtime (they are only called from event handlers, after module load), but
to be safe keep `getActiveImpersonation` and `parseActiveImpersonation` free of any
`getSession` import. Confirm `get-session.ts` only imports those two symbols.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/lib/auth/__tests__/get-session-impersonation.test.ts && npx tsc --noEmit`
Expected: PASS, tsc clean. If tsc reports a circular-import type error, move
`ActiveImpersonation` and `parseActiveImpersonation`/`getActiveImpersonation` into a
new file `src/lib/super-admin/impersonation-read.ts` (no `getSession` import) and have
both `get-session.ts` and `impersonation.ts` import from it.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit/log.ts src/lib/auth/get-session.ts src/lib/auth/__tests__/get-session-impersonation.test.ts
git commit -m "feat(impersonation): getSession overrides org during active session"
```

---

## Task 4: Integration test — get_my_org_id honors impersonation

**Files:**
- Test: `src/lib/super-admin/__tests__/impersonation-rls.test.ts`

- [ ] **Step 1: Write the integration test**

```typescript
// src/lib/super-admin/__tests__/impersonation-rls.test.ts
import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('get_my_org_id with impersonation (integration)', () => {
  const admin = createAdminClient()
  const cleanup: Array<() => Promise<unknown>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  test('row inserts and is readable; expired row excluded by query', async () => {
    // Two orgs
    const { data: o1 } = await admin.from('organizations').insert({ name: '__imp_o1__', status: 'active', plan: 'pro' }).select('id').single()
    const { data: o2 } = await admin.from('organizations').insert({ name: '__imp_o2__', status: 'active', plan: 'pro' }).select('id').single()
    cleanup.push(() => admin.from('organizations').delete().eq('id', o1!.id))
    cleanup.push(() => admin.from('organizations').delete().eq('id', o2!.id))

    // A super_admin user with membership in o1
    const email = `imp_super_${Date.now()}@example.com`
    const { data: au } = await admin.auth.admin.createUser({ email, email_confirm: true, password: 'Imp-abc123!', user_metadata: { organization_id: o1!.id } })
    cleanup.push(() => admin.auth.admin.deleteUser(au!.user.id))
    await admin.from('organization_members').insert({ organization_id: o1!.id, user_id: au!.user.id, role: 'super_admin', full_name: 'Imp Super', email, is_active: true, joined_at: new Date().toISOString() })

    // Active impersonation into o2
    const { data: imp } = await admin.from('super_admin_impersonations').insert({ super_admin_id: au!.user.id, organization_id: o2!.id, expires_at: new Date(Date.now() + 60000).toISOString() }).select('id').single()
    cleanup.push(() => admin.from('super_admin_impersonations').delete().eq('id', imp!.id))

    // The row exists and reflects o2
    const { data: rows } = await admin.from('super_admin_impersonations').select('organization_id, ended_at, expires_at').eq('super_admin_id', au!.user.id).is('ended_at', null)
    expect(rows?.[0]?.organization_id).toBe(o2!.id)
  })
})
```

- [ ] **Step 2: Run the test (with env)**

Run: `export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs) && npx vitest run src/lib/super-admin/__tests__/impersonation-rls.test.ts`
Expected: PASS (or SKIPPED if env unset).

- [ ] **Step 3: Commit**

```bash
git add src/lib/super-admin/__tests__/impersonation-rls.test.ts
git commit -m "test(impersonation): integration for impersonation row + scoping"
```

---

## Task 5: Impersonation banner + layout wiring

**Files:**
- Create: `src/components/super-admin/impersonation-banner.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create the banner client component**

```typescript
// src/components/super-admin/impersonation-banner.tsx
'use client'

import { useEffect, useState } from 'react'
import { exitOrg } from '@/lib/super-admin/impersonation'

export function ImpersonationBanner({ orgName, expiresAt }: { orgName: string; expiresAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) { setRemaining('expired'); return }
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setRemaining(`${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-[13px] font-semibold text-amber-950">
      <span>
        ⚠ Viewing as <span className="font-bold">{orgName}</span> (platform admin) · session {remaining}
      </span>
      <form action={exitOrg}>
        <button type="submit" className="rounded-lg bg-amber-950/90 px-3 py-1 text-[12px] font-bold text-amber-50 hover:bg-amber-950">
          Exit
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Render it in the app layout**

In `src/app/(app)/layout.tsx`, import the banner and render it at the very top of the
outer container when `user.impersonating` is set:

```typescript
import { ImpersonationBanner } from '@/components/super-admin/impersonation-banner'
// ...inside the returned JSX, as the first child of the outermost <div>:
{user.impersonating && (
  <ImpersonationBanner orgName={user.impersonating.orgName} expiresAt={user.impersonating.expiresAt} />
)}
```

Place it before `<MobileSidebar>` / the flex row so it spans full width at the top.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/super-admin/impersonation-banner.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(impersonation): persistent banner with countdown + exit"
```

---

## Task 6: "Enter as admin" button in the org table

**Files:**
- Modify: `src/components/super-admin/org-table.tsx`

- [ ] **Step 1: Read the component**

Read `src/components/super-admin/org-table.tsx`. Confirm it's a client/server component
that maps `orgs` to rows and has each org's `id` and `name` available per row.

- [ ] **Step 2: Add an Enter-as-admin action per row**

Add a small form per row that calls the `enterOrg` server action (bind the org id).
If `org-table.tsx` is a Server Component, this works directly; if it is a client
component, import a thin server-action wrapper instead. Server-component version:

```typescript
import { enterOrg } from '@/lib/super-admin/impersonation'
// ...in each row's actions cell:
<form action={async () => { 'use server'; await enterOrg(org.id) }}>
  <button type="submit" className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-semibold text-foreground hover:bg-muted">
    Enter as admin
  </button>
</form>
```

If `org-table.tsx` has `'use client'` at the top, instead add a client button that
calls a passed-in `onEnter` prop, and have the parent server page
(`src/app/super-admin/organizations/page.tsx`) define the action and pass it down, OR
call `enterOrg(org.id)` from a `useTransition` handler imported from the actions module
(server actions are callable from client components). Pick whichever matches the file's
existing pattern.

- [ ] **Step 3: Typecheck + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/super-admin/org-table.tsx src/app/super-admin/organizations/page.tsx
git commit -m "feat(impersonation): enter-as-admin action on org list"
```

---

## Task 7: E2E + final verification

**Files:**
- Create: `e2e/impersonation.spec.ts`

- [ ] **Step 1: Seed a super admin + a second org**

For E2E you need a super_admin login and a target org. Run:
```bash
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config scripts/seed-demo.mjs
```
This creates `superadmin@careintake.app` (pwd `Demo2026!`) and the "Demo Organization".
(The super_admin's own membership is in this org; entering it is still a valid test of
the banner + scope. For a distinct target, create a second org via the UI in the test
or accept entering the same org.)

- [ ] **Step 2: Write the E2E test**

```typescript
// e2e/impersonation.spec.ts
import { test, expect, type Page } from '@playwright/test'

const EMAIL = process.env.DEMO_SUPER_EMAIL ?? 'superadmin@careintake.app'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

async function login(page: Page) {
  await page.goto('/auth/login')
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 45000 })
}

test('super admin can enter an org and see the banner, then exit', async ({ page }) => {
  await login(page)
  await page.goto('/super-admin/organizations')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /Enter as admin/i }).first().click()
  await page.waitForURL(/\/dashboard/, { timeout: 45000 })
  await expect(page.getByText(/Viewing as/i)).toBeVisible()

  await page.getByRole('button', { name: /^Exit$/ }).click()
  await page.waitForURL(/\/super-admin\/organizations/, { timeout: 45000 })
  await expect(page.getByText(/Viewing as/i)).toHaveCount(0)
})
```

- [ ] **Step 3: Run the test**

Run: `DOTENV_CONFIG_PATH=.env.local npx playwright test impersonation.spec.ts --workers=1`
Expected: PASS.

- [ ] **Step 4: Delete seeded demo users (public repo hygiene)**

```bash
DOTENV_CONFIG_PATH=.env.local node -r dotenv/config -e '
import("@supabase/supabase-js").then(async ({createClient})=>{
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const t=["demo@careintake.app","superadmin@careintake.app","staff@careintake.app"];
  let p=1;while(true){const {data}=await a.auth.admin.listUsers({page:p,perPage:200});const us=data?.users??[];for(const u of us){if(u.email&&t.includes(u.email.toLowerCase()))await a.auth.admin.deleteUser(u.id);}if(us.length<200)break;p++;}
  const {data:o}=await a.from("organizations").select("id").eq("name","Demo Organization");for(const x of o??[])await a.from("organizations").delete().eq("id",x.id);
  console.log("cleaned");
});'
```

- [ ] **Step 5: Commit**

```bash
git add e2e/impersonation.spec.ts
git commit -m "test(impersonation): e2e enter/exit org as super admin"
```

---

## Final Verification

- [ ] `export $(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local | xargs) && npx vitest run` — all pass (integration tests run with env).
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — exit 0.
- [ ] `DOTENV_CONFIG_PATH=.env.local npx playwright test` — all pass.
- [ ] Manual: as super_admin, enter an org → `/dashboard` shows that org's data + banner; create a staff user under it; Exit → back to platform scope; `audit_logs` shows `impersonation_started`/`impersonation_ended`.

## Spec Coverage Map

- Full act-as org admin → Task 1 (`get_my_org_id`) + Task 3 (`getSession` override); reuses all admin pages/RLS.
- Audit enter/exit → Task 2 (actions log) + Task 3 (enum values).
- Persistent banner + manual exit → Task 5.
- Auto-expire (60 min) → Task 1 (`expires_at` in `get_my_org_id`) + Task 2 (`enterOrg` sets it) + Task 5 (countdown).
- Entry point → Task 6.
- Security gating (`is_super_admin()`), single active row → Task 1 (function guard + unique index) + Task 2 (server re-check).
