# Alt-EVV / Third-Party EVV Onboarding Questionnaire — Draft Responses

**Audience:** internal prep for HHAeXchange (MN) and Sandata (OH/AZ) Alt-EVV onboarding.
**Purpose:** pre-drafted answers to the questions aggregators/states typically ask a
third-party EVV vendor, based on Higsi's current architecture. Review and confirm
each before submitting; items marked **[CONFIRM]** need a business decision or a value
you must supply.

## A. Vendor / company
- **Vendor / product name:** Higsi (Stillwater 245D Suite). **[CONFIRM legal entity]**
- **Primary integration contact:** **[CONFIRM name / email / phone]**
- **Technical contact:** **[CONFIRM]**
- **States targeted (initial):** Minnesota (HHAeXchange). OH/AZ (Sandata) later.
- **Provider sponsor(s) for onboarding:** **[CONFIRM pilot provider + Medicaid Provider ID]**

## B. EVV model & capture
- **EVV capture methods supported today:** Mobile **GPS** (lat/lng + accuracy at
  clock-in and clock-out). **[CONFIRM]** Telephony/IVR and FOB/fixed-device are
  **not yet supported** (roadmap).
- **Offline capture:** **[CONFIRM]** — current capture assumes connectivity at clock
  events; offline buffering is on the roadmap.
- **Six Cures Act elements captured:** Yes — service type, recipient, date, location,
  caregiver, and start/end times (see EVV Data-Element Mapping doc).
- **Visit edit / reason codes:** exceptions are detected and tracked (late check-in,
  early check-out, missing check-out, missed visit, geofence, impossible travel);
  manual visit edits with reason codes are **partial** **[CONFIRM scope vs aggregator’s required reason-code set]**.

## C. Data exchange / integration
- **Preferred exchange:** REST/JSON via a per-vendor adapter to a normalized payload;
  can conform to the aggregator's published API or EDI/SFTP spec on receipt.
- **Identifiers:** provider ID, recipient Medicaid ID, caregiver ID, payer/MCO, and
  per-state procedure/service codes are captured and mappable to the aggregator's
  required fields.
- **Idempotency / dedupe:** every visit carries a stable idempotency key; resubmissions
  do not create duplicate billable records.
- **Retry / reconciliation:** durable queue with exponential back-off; per-visit
  transmission status + aggregator acknowledgments are persisted.
- **Throughput / volume:** **[CONFIRM expected visits/day at pilot scale]**

## D. Security & privacy
- **Tenant isolation:** PostgreSQL Row-Level Security; each provider org's data is
  isolated at the database layer.
- **Authentication:** Supabase Auth, role-based access, MFA (TOTP) available.
- **Encryption:** in transit (HTTPS) and at rest (managed Postgres).
- **Audit:** immutable audit log + validation trail + transmission ledger.
- **PHI handling / minimum necessary:** AI features receive only minimal structured
  data; no bulk PHI to third parties.
- **BAA:** **[CONFIRM]** — BAAs with subprocessors (Supabase, Anthropic, Vercel) to be
  executed before production PHI; willing to sign a BAA with the provider/aggregator.
- **SOC 2 / HITRUST:** **Planned**, not yet held — disclose honestly.

## E. Hosting & operations
- **Infrastructure:** Vercel (compute) + Supabase (Postgres/Auth), US regions.
- **Backups / DR:** provider-managed backups; formal RTO/RPO **[CONFIRM/define]**.
- **Support model / SLA:** **[CONFIRM support hours + response targets]**
- **Sandbox/UAT readiness:** can integrate against the aggregator's test environment
  once the spec + credentials are issued.

## F. Certification logistics
- **Requesting:** Alt-EVV / third-party technical specification, NDA/agreements,
  sandbox credentials, and the certification/test-script process.
- **Timeline expectation:** **[CONFIRM]**
- **Fees:** **[CONFIRM any integration/transaction fees]**

---
*Every **[CONFIRM]** is a deliberate placeholder — fill before sending. Do not overstate
capabilities (telephony/IVR, FOB, offline, SOC 2) we don't yet have.*
