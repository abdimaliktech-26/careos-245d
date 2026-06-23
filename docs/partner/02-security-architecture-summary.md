# Security & Architecture Summary — Higsi

**Audience:** Minnesota providers evaluating Higsi, and future integration partners (HHAeXchange, Sandata).
**Purpose:** A shareable overview of how Higsi is built and how it protects PHI.

> Status note: several controls below are **implemented**; a few (formal SOC 2 attestation, signed BAAs, penetration test) are **planned** and called out explicitly. We do not claim certifications we do not yet hold.

## Platform architecture

- **Application:** Next.js 16 (App Router, React Server Components) — TypeScript.
- **Hosting/compute:** Vercel (serverless functions; production on the Pro plan).
- **Database & auth:** Supabase — managed PostgreSQL, Supabase Auth, Row-Level Security.
- **AI:** Anthropic Claude (Haiku) — used for explanations/validation assistance only;
  HIPAA-eligible provider with zero-data-retention configuration.
- **Multi-tenant:** every organization's data is isolated at the database layer.

```
Browser ── HTTPS ──> Next.js (Vercel) ── RLS-scoped ──> Supabase Postgres
                         │                                  ▲
                         └── server-only service role ──────┘ (admin/cron paths)
```

## Authentication & access control

- **Supabase Auth** with email/password; **multi-factor authentication (TOTP)**
  supported and enforced via step-up at login when enrolled.
- **Role-based access:** `super_admin`, `org_admin`, `program_manager`, `staff`,
  `external_signer`. Routes are gated in middleware (`proxy.ts`) and re-checked at the
  page/action level (defense in depth).
- **Row-Level Security on every table:** users can only read/write rows for their own
  organization (`organization_id = get_my_org_id()`); enforced by Postgres, not just
  the app. Writes to sensitive tables additionally require the appropriate role.
- **Least privilege:** the service-role key (bypasses RLS) is used only in server-side
  admin/cron code paths, never shipped to the browser.
- **Time-boxed, audited admin impersonation:** platform staff entering an organization
  is logged, banner-indicated, and auto-expires.

## Data protection

- **Encryption in transit:** HTTPS everywhere; **at rest:** managed by Supabase
  (Postgres storage encryption).
- **Secrets:** stored in environment configuration (Vercel/Supabase), never in source
  control; the repository contains no credentials.
- **Minimum necessary:** AI prompts send only the minimum structured fields needed;
  no bulk PHI is sent to the model.
- **PHI-flagged fields:** form fields can be marked sensitive (`is_hipaa`).
- **Data retention:** configurable retention/cleanup routines (`data-retention`).

## Auditability

- **Immutable audit log** (`audit_logs`): actor, action, entity, timestamp for
  logins, record changes, signatures, downloads, validations, and admin impersonation.
- **Validation trail** (`agent_validation_runs`): every intake/EVV validation run with
  its deterministic verdict and flags — append-only.
- **EVV transmission ledger** (`evv_aggregator_transmissions`): per-visit submission
  status, attempts, and aggregator acknowledgments.

## EVV-specific controls

- Deterministic compliance engine evaluates the six Cures Act elements + exception
  rules (geofence, grace periods, missed visits, impossible travel) per state profile.
- Visits must pass completeness + eligibility gates before transmission; bad/unmapped
  data is held, never sent.
- Vendor-agnostic aggregator adapter layer (HHAeXchange, Sandata) with a durable
  retry/back-off queue and idempotent submission (no double billing).

## Compliance posture

| Control | Status |
|---|---|
| Row-Level Security (tenant isolation) | Implemented |
| MFA (TOTP) | Implemented |
| Immutable audit logging | Implemented |
| Encryption in transit / at rest | Implemented (Supabase/Vercel managed) |
| HIPAA-eligible AI provider (zero retention) | Implemented |
| Signed BAAs (Supabase, Anthropic, Vercel) | **Planned — execute before production PHI** |
| SOC 2 Type II | **Planned** |
| Penetration test | **Planned** |
| Leaked-password protection (HaveIBeenPwned) | **Planned — enable in Auth settings** |

## Hosting & availability

- Managed infrastructure (Vercel + Supabase) with provider-managed backups and
  redundancy. Formal RTO/RPO targets and a documented backup/restore runbook are
  **planned** as part of production hardening.

## Contact

Security questions and BAA requests: <your security contact email>.
