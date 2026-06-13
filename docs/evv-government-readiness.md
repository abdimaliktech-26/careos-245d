# EVV Government Readiness — Gap Analysis & Roadmap

**Product:** CareOS / CareIntake — AI-Powered 245D Compliance & Operations Platform with Integrated EVV
**Scope:** Electronic Visit Verification (EVV) for Minnesota 245D / HCBS Medicaid services
**Last updated:** 2026-06-12
**Audience:** State Medicaid evaluators, aggregator partners (HHAeXchange/Sandata), prime-contractor procurement, internal roadmap

> Purpose: an honest, evidence-anchored statement of what is built, what is required to bill Medicaid and to be procurement-eligible, and the remediation path. Written to be handed to a state reviewer or a prime contractor's vendor-vetting team.

---

## 1. Executive Summary

CareOS delivers a modern, compliant EVV product: GPS-verified check-in/out, the six 21st Century Cures Act data elements, a human-in-the-loop documentation→review→billing pipeline, exception detection, and an immutable audit trail. It is ready for **direct provider sales** pending one hard dependency: **transmission to the state EVV aggregator**.

It is **not yet** eligible to win a state EVV/Medicaid prime contract. Those awards require third-party security certification (SOC 2 / HITRUST), formal aggregator/MMIS integration certification, accessibility conformance (WCAG 2.1 AA / Section 508), and procurement registration (SAM.gov, state vendor approval). These are tracked in §4.

**Recommended sequencing:** (1) aggregator integration → billable for MN providers; (2) SOC 2 Type II → subcontractor-eligible; (3) certification + procurement → prime-eligible.

---

## 2. Standards Matrix

| # | Requirement | Authority | Status | Evidence / Gap |
|---|-------------|-----------|--------|----------------|
| 2.1 | Capture 6 EVV data elements (type, recipient, date, location, provider, start/end time) | 21st Century Cures Act §12006 | ✅ Built | `src/lib/evv/compliance.ts` `checkCuresActElements`; tested |
| 2.2 | GPS verification of service location | CMS EVV guidance | ✅ Built | geofence distance + violation detection |
| 2.3 | Tamper-evident audit trail | 42 CFR / state audit | ✅ Built | `audit_logs`, append-only transmission ledger |
| 2.4 | Verify caregiver presence (identity) | 245D | ⚠️ Partial | optional face check (boolean, photo not stored); no biometric assurance |
| 2.5 | Missed/late visit detection | Program integrity | ✅ Built | `missed-visits.ts`, exception engine |
| 2.6 | **Transmit to state EVV aggregator** | MN DHS open model | ⚠️ Built, awaits sandbox | `src/lib/evv/aggregator/*` — queue/retry/audit/ID-mapping/admin-config done; adapter wire-format + creds come from the HHAeXchange packet |
| 2.7 | Medicaid claim submission (837P/EDI to MMIS) | MN MMIS | 🔴 Gap | internal `claims` + CSV only; no EDI/clearinghouse |
| 2.8 | SOC 2 Type II | AICPA / RFP standard | 🔴 Gap | controls partially in place; no audit/report |
| 2.9 | HITRUST CSF (often required for PHI at scale) | Industry / RFP | 🔴 Gap | not started |
| 2.10 | Accessibility WCAG 2.1 AA / Section 508 | ADA / state IT policy | ⚠️ Unverified | no formal audit (VPAT) |
| 2.11 | Data security: encryption in transit/at rest, RLS tenant isolation | HIPAA Security Rule | ✅/⚠️ | Supabase TLS + RLS ✅; KMS/key-rotation policy + pen test ⚠️ |
| 2.12 | Secrets management (no plaintext credentials) | HIPAA / SOC 2 | ✅ Built | aggregator key stored by env-var *name* (`credential_ref`); value never in DB |
| 2.13 | BAA with subprocessors | HIPAA | ⚠️ Business | Supabase/Anthropic/Stripe BAAs to be executed/verified |
| 2.14 | Disaster recovery / RPO-RTO, uptime SLA | RFP standard | 🔴 Gap | not documented |
| 2.15 | SAM.gov registration + NAICS (541511 / 621610) | Federal/state procurement | 🔴 Business | not started |
| 2.16 | Past-performance references | RFP standard | 🔴 Business | requires provider customer base |

Legend: ✅ built · ⚠️ partial/unverified · 🔴 gap

---

## 3. What Is Built (Evidence)

- **Compliance engine** — `src/lib/evv/compliance.ts`: Cures Act elements, exception detection (late/early/missing check-out, missed visit, geofence, overlap, impossible travel), workflow stage derivation, billable minutes. Unit-tested.
- **Verification pipeline** — Clock-in → service → AI progress note (human-reviewed) → supervisor approval → billing approval → aggregator transmission → compliance tracking. AI drafts; humans approve. (`workflow-actions.ts`)
- **Missed-visit automation** — `missed-visits.ts` + nightly cron flags un-clocked-in elapsed visits.
- **Schedule integration** — `schedule-sync.ts` generates EVV visits from staffing.
- **Compliance alerting** — EVV exceptions feed the org alert feed + notifications (`compliance-alerts.ts`).
- **Aggregator transmission layer** — `src/lib/evv/aggregator/`: vendor-agnostic adapter interface, idempotent queue, exponential-backoff retry, permanent-reject vs transient classification, dead-letter, per-attempt audit, reconciliation status on each visit. Adapters for HHAeXchange and Sandata are structurally complete and gated `not_configured` until real credentials/spec are supplied — nothing is faked.
- **Security** — Postgres RLS tenant isolation; service-role-only writes to transmission tables; secrets referenced by name, never stored.

---

## 4. Gaps & Remediation Roadmap

### Phase 1 — Billable in Minnesota (unblocks revenue)
1. **HHAeXchange integration packet + sandbox** (business): sign agreement, obtain API spec + test credentials.
2. **Finish the HHAeXchange adapter** (`hhaexchange-adapter.ts`): replace `ENDPOINT`, request body field mapping, auth scheme, and response parsing with packet values. *Queue/retry/audit need no change.*
3. **Recipient/caregiver ID mapping** — ✅ done. Client recipient id = `clients.medicaid_number` (editable in client records); caregiver id = `staff_profiles.caregiver_id` (column added, migration `202606120004`; editable inline on `/admin/staff`). `resolveExternalIds` feeds the real IDs into the payload; a visit missing either is permanently rejected with a clear reason surfaced in the EVV transmission panel.
4. **Sandbox certification** with HHAeXchange (test-case suite they provide).

### Phase 2 — Subcontractor-eligible
5. **SOC 2 Type II**: select auditor, define control set, 3–6 month observation window, remediate findings.
6. **Pen test + DR plan**: third-party penetration test; documented RPO/RTO, backup/restore runbook, uptime SLA.
7. **Accessibility audit (VPAT)**: WCAG 2.1 AA conformance against the provider + caregiver UIs.
8. **Execute BAAs** with all subprocessors; document data-flow + retention.

### Phase 3 — Prime-contract-eligible
9. **MMIS / 837P claim submission** (or clearinghouse integration).
10. **SAM.gov registration**, NAICS codes, state vendor onboarding.
11. **Past-performance**: convert 50–100 provider customers into references + outcome metrics.
12. **HITRUST CSF** if the target RFP requires it.

---

## 5. Honest Risk Statement

- The aggregator adapters cannot be certified "working" until tested against HHAeXchange's sandbox — the wire format is from their private packet. The surrounding system (queue, retries, idempotency, audit, validation gate) is production-grade and independently tested.
- Until Phase 1 completes, a provider **cannot** bill MN Medicaid using this system alone.
- SOC 2 / HITRUST are multi-month efforts with real cost; they gate subcontractor and prime eligibility, not provider sales.

---

## 6. Pointers

- Aggregator layer: `src/lib/evv/aggregator/`
- Migrations: `supabase/migrations/202606120002_evv_automation.sql`, `202606120003_evv_aggregator.sql`
- Transmission cron: `src/app/api/cron/evv-aggregator/route.ts` (every 15 min)
- Tests: `src/tests/lib/evv/aggregator.test.ts`, `compliance.test.ts`, `schedule-sync.test.ts`
- Config: per-org `evv_aggregator_config`; secret by env-var name via `credential_ref`
