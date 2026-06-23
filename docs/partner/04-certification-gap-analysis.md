# Certification Gap Analysis + Platform Review

**Purpose:** what's still missing before Sandata/HHAeXchange Alt-EVV certification, plus
an honest review of MVP / compliance / reporting / audit-readiness gaps. Grounded in
the current codebase.

## A. EVV certification gaps (HHAeXchange / Sandata)

| Area | Status | Gap to close |
|---|---|---|
| Six Cures Act elements | ✅ Captured + enforced | — |
| Vendor-agnostic payload + adapter layer | ✅ Built (registry, queue, back-off) | — |
| HHAeXchange / Sandata **wire format + endpoints** | ⛔ Stubbed (`TODO`) | Fill in from each vendor's integration packet (post-NDA) |
| **Alt-EVV certification** (sandbox test + sign-off) | ⛔ Not started | Register, get spec/sandbox, pass test scripts |
| **GPS capture** | ✅ | — |
| **Telephony / IVR capture** | ⛔ Missing | Required as an alternative method in most states |
| **FOB / fixed-device capture** | ⛔ Missing | Required alternative for no-smartphone settings |
| **Offline / poor-connectivity capture** | ⛔ Missing | Buffer clock events offline, sync later |
| **Visit edit + reason codes** | 🟡 Partial | Align edit workflow + reason-code set to aggregator spec |
| **Provider/recipient/caregiver ID mapping** | ✅ Fields exist | Confirm formats vs each state |
| BAAs / SOC 2 / pen test | ⛔ Planned | Execute before production PHI |

## B. Missing MVP features (product completeness)
- **Offline EVV capture** on mobile (caregivers in low-signal homes) — highest-impact MVP gap for real field use.
- **Native/installable mobile experience** — caregivers need a phone-first clock-in/out + notes flow (currently web).
- **Telephony/IVR + FOB** capture (also a certification gap).
- **Visit scheduling depth** — recurring shifts, open-shift fill, caregiver matching (basic schedule exists).
- **Manual visit edit workflow** with reason codes + supervisor approval (exceptions are detected; structured edit/correction flow is thin).
- **Bulk caregiver/client onboarding** beyond current CSV import (validation + dedupe UX).

## C. Missing compliance features
- **Signed BAAs** with Supabase, Anthropic, Vercel — **do before any production PHI**.
- **Leaked-password protection** (HaveIBeenPwned) — currently disabled; one Auth toggle.
- **SOC 2 Type II** + **penetration test** — not started (calendar-bound; start early).
- **Documented data retention/disposal policy** surfaced to providers (routine exists in code; needs a stated policy + admin controls).
- **Break-glass / access review** reporting for admin + impersonation events (logged; needs a review report).
- **Consent capture** for EVV/GPS where required by state/provider policy.
- **245D-specific document completeness** (assessments, MAR) — partial; deepen for full program compliance.

## D. Missing reporting features
- **EVV compliance report / export** (per provider, per period: % visits with all six elements, exception counts, missed/late visits) — compliance is computed live but there's no exportable report.
- **Billing/claims-readiness export** beyond the current `billing-readiness` summary (837P-ready output).
- **CSV/PDF export** across clients, visits, incidents, audit log (CSV import exists; broad export does not).
- **Caregiver/visit dashboards** with date-range filters + drill-down.
- **State-submission reconciliation report** (submitted vs accepted vs rejected) once aggregators are live.
- **Scheduled/emailed reports** for administrators.

## E. Missing audit-readiness features
- **Audit-log viewer + export UI** for org admins (records exist in `audit_logs`; no first-class searchable/exportable view yet).
- **Per-record history / change timeline** (who changed what, when) surfaced in the UI.
- **Immutability guarantees documented** (append-only confirmed in design; document +, ideally, DB-level enforcement/retention locks).
- **Evidence pack generation** for a state/MCO audit (one-click bundle: visits + Cures elements + signatures + exceptions for a date range/client).
- **Validation-run review UI** filters/export (runs are logged + surfaced on compliance alerts; needs reporting depth).

## F. Recommended sequence (to be MN-pilot-ready, then cert-ready)
1. **Now (no vendor dependency):** EVV compliance report + export; audit-log viewer/export; offline capture; consent capture; enable leaked-password protection; execute BAAs.
2. **Pilot hardening:** manual visit-edit + reason codes; evidence-pack export; mobile-first capture.
3. **Cert track (parallel, business-gated):** register Alt-EVV → packets → fill adapter wire formats → telephony/IVR + FOB → sandbox certification; SOC 2 + pen test.

None of A–E blocks **piloting with MN providers** (the agency can use Higsi for
intake, documentation, scheduling, and internal EVV compliance before state
transmission is certified). They are the path from "pilot-usable" to "production +
state-certified."
