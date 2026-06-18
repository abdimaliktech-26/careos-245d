# Super Admin Org Impersonation ("Enter as Admin") — Design

**Date:** 2026-06-17
**Status:** Approved (design); pending implementation plan
**Project:** CareIntake / Stillwater 245D Suite

## Summary

Let a `super_admin` enter a specific organization and act as that org's admin —
full read/write across all existing admin screens — for a time-boxed, audited
session, with a persistent banner and an explicit exit.

## Decisions (from brainstorming)

1. **Access level:** full act-as org admin (read + write), reusing all existing
   admin pages. Not read-only.
2. **Guardrails:** audit enter/exit, persistent banner, manual exit, **and**
   auto-expire (60 minutes).
3. **Mechanism:** DB-backed active-impersonation row honored by `get_my_org_id()`
   and read by `getSession` (Approach A). One RLS-function change + one table.

## Why Approach A

Org scoping is enforced two places that must agree: the app (`getSession`'s
`organizationId`) and the database (RLS via `get_my_org_id()`). Approach A makes
**both read the same impersonation row**, so they cannot disagree, and every
existing admin page + RLS policy "just works" because they already key off
`get_my_org_id()` / `organizationId`. `has_role('org_admin')` is already true for
`super_admin`, so no role juggling is needed.

Rejected: per-request JWT/GUC claim (no clean per-request hook in supabase-js
server client; brittle) and service-client act-as (bypasses RLS entirely; requires
rewiring every admin action).

## Data Model + RLS

New migration:

```sql
CREATE TABLE super_admin_impersonations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,   -- started_at + 60 min
  ended_at        TIMESTAMPTZ             -- set on manual exit
);

CREATE UNIQUE INDEX uniq_active_impersonation
  ON super_admin_impersonations(super_admin_id)
  WHERE ended_at IS NULL;

ALTER TABLE super_admin_impersonations ENABLE ROW LEVEL SECURITY;

-- Owning super admin may read their own rows. Writes go through the service
-- client (enter/exit actions), which bypasses RLS.
CREATE POLICY "impersonation_select_own"
  ON super_admin_impersonations FOR SELECT
  USING (super_admin_id = auth.uid());
```

"Active" = `ended_at IS NULL AND expires_at > NOW()`.

The one sensitive change — `get_my_org_id()` now prefers an active impersonation,
but only for a genuine super admin:

```sql
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

New `audit_action` enum values: `impersonation_started`, `impersonation_ended`.

Properties:
- Only a real super_admin can ever get an effective-org override (the inner
  `is_super_admin()` guard) — a stale row does nothing for a demoted user.
- Expiry is purely time-based: once `expires_at` passes, both the DB function and
  the app fall back to normal scope with no cleanup job required.

## Server Actions + Session

`src/lib/super-admin/impersonation.ts`:
- `enterOrg(orgId)` — verify caller `is_super_admin` (server-side); end any existing
  active row for this super admin; insert a new row with `expires_at = now + 60min`;
  `logAuditEvent('impersonation_started', entityType 'organization', entityId orgId)`;
  redirect `/dashboard`.
- `exitOrg()` — set `ended_at = NOW()` on the caller's active row; audit
  `impersonation_ended`; redirect `/super-admin/organizations`.
- `getActiveImpersonation(userId)` — returns `{ organizationId, orgName, expiresAt }`
  or `null` (active + unexpired). Joins `organizations` for the name.

Both mutating actions use the service client and re-check `is_super_admin()` — never
trust the client.

`getSession` change (`src/lib/auth/get-session.ts`):
- After loading the user's own profile, if `role === 'super_admin'`, call
  `getActiveImpersonation(user.id)`.
- If active: override `organizationId` with the target org and add
  `impersonating: { orgId, orgName, expiresAt }` to the returned `UserProfile`.
  Role stays `super_admin`.
- If none: unchanged.

`UserProfile` (`src/types/app.ts`) gains an optional
`impersonating?: { orgId: string; orgName: string; expiresAt: string } | null`.

This single override point means `proxy.ts`, every admin page, and all RLS operate
on the target org automatically. The DB function and `getSession` read the same row,
so they can't disagree.

## UI / Banner / Flow

- **Entry:** an "Enter as admin" button per org on `/super-admin/organizations` and
  the org detail page → `enterOrg(orgId)` → `/dashboard` (now org-scoped). Buttons
  render only for `super_admin`.
- **Banner:** `ImpersonationBanner` client component rendered in
  `src/app/(app)/layout.tsx` whenever `user.impersonating` is set. Sticky, high
  contrast, above `AppHeader`: `Viewing as "<Org>" (platform admin) · expires <time>`
  with a live countdown and an **Exit** button → `exitOrg()`.
- **Flow:**
  ```
  /super-admin/organizations
     └─ [Enter as admin] → enterOrg(orgId) → /dashboard (org-scoped)
          banner on every page ──► [Exit] → exitOrg() → /super-admin/organizations
          (or 60-min auto-expire → next navigation snaps back to platform scope)
  ```
- While impersonating, super_admin can still open `/super-admin/*` (role unchanged);
  the banner shows the active context. Only Exit or expiry ends the session.

## Error Handling / Security

- `enterOrg`/`exitOrg` re-verify `is_super_admin()` server-side; non-super-admins get
  an error and no row is written.
- `enterOrg` validates the target org exists; ends any prior active row first
  (unique partial index also guarantees at most one active row).
- The `get_my_org_id()` impersonation branch is gated by `is_super_admin()`, so the
  feature cannot escalate a non-super-admin even with a forged/stale row.
- All enter/exit events are audited with the super_admin's user_id; actions taken
  while impersonating are attributed to the super_admin (audit_logs records the
  acting user).
- HIPAA: this grants a platform operator access to one org's PHI for a bounded,
  logged window — exactly the auditable, time-boxed pattern intended.

## Testing

- **Unit:** `getActiveImpersonation` active/expired/ended/none cases (mocked client);
  `getSession` override logic (super_admin with/without active impersonation; non-
  super-admin unaffected).
- **Integration (live/test DB):** insert an impersonation row → `get_my_org_id()`
  returns the target org for that super_admin; expired/ended row → falls back to
  membership org; non-super-admin row → ignored. `enterOrg`/`exitOrg` write + audit.
- **E2E (Playwright):** super_admin clicks "Enter as admin" → lands on `/dashboard`
  with the banner; Exit → back on `/super-admin/organizations`, banner gone.

## Out of Scope

- Read-only viewer mode (we chose full act-as).
- Per-action approval prompts / step-up auth before entering.
- Impersonating non-admin roles or multiple orgs simultaneously.
- A separate admin UI to review impersonation history (audit_logs already records it).
