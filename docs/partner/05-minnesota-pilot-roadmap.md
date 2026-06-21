# Minnesota-First Pilot Roadmap — Land 3 Pilot Providers

**Goal:** secure **3 Minnesota 245D pilot providers** and validate the product, while
laying groundwork for future HHAeXchange Alt-EVV certification. **Not** multi-state
expansion or certification today.

## Positioning for the pilot

Pilot value does **not** require state EVV transmission. Sell what's live now:
- 245D **intake packets + e-signatures**, client records, **service plans (ISP)**.
- **Internal EVV compliance**: GPS clock-in/out, Cures-Act completeness, exception
  flags, EVV dashboard — agencies get audit-ready EVV *internally* before state
  submission is certified.
- **AI-assisted validation** (once Anthropic credit is on): eligibility/required-field
  checks, EVV anomaly flags, plain-English explanations.
- Incidents, scheduling, notes/T-Logs, documents, compliance alerts.

Message: *"Run your 245D documentation + EVV compliance in one modern system today;
state EVV transmission via HHAeXchange is on our certified roadmap."* Be explicit that
direct state submission is **pending certification** — don't oversell.

## Pre-outreach checklist (do first — ~1–2 weeks)
- [ ] Turn AI on (Anthropic credit) + confirm Vercel Pro (done = fast, no cold starts).
- [ ] Enable leaked-password protection; execute BAAs (Supabase/Anthropic/Vercel).
- [ ] Build **EVV compliance report + export** and **audit-log viewer/export** (top pilot-credibility features — see gap analysis).
- [ ] Prepare a **demo org** with realistic seeded data + a guided demo script.
- [ ] Finalize the **security & architecture summary** (doc 02) as a leave-behind.
- [ ] One-page pilot offer (free/discounted pilot, success criteria, term).

## Phase 1 — Outreach (weeks 1–4)
- Build a target list of small/mid MN 245D providers (PCA/home-care, ICS/ICLS, day services).
- Lead with a pain hook: paper-chasing intake, audit prep, EVV exception cleanup.
- Offer a **90-day pilot**: free or discounted, white-glove onboarding, weekly check-ins.
- Goal: **3 signed pilots** with named champions.

## Phase 2 — Pilot onboarding (per provider, ~1 week each)
- Create the org (state = MN → HHAeXchange default), enter provider/Medicaid IDs.
- Import clients + caregivers (CSV), set service-code catalog.
- Train admin + 2–3 caregivers on clock-in/out + notes.
- Define **success metrics**: % visits with all six EVV elements, exception rate,
  time saved on intake/audit prep, signature turnaround.

## Phase 3 — Validate & iterate (90 days)
- Weekly: review compliance report + exceptions with each provider.
- Capture feature gaps; prioritize manual visit-edit/reason-codes, offline capture,
  evidence-pack export based on real usage.
- Collect **testimonials + a case study** (quant: hours saved, compliance % lift).

## Phase 4 — Certification prep (parallel, business-gated)
- Use a pilot provider as the **sponsor** for HHAeXchange Alt-EVV onboarding.
- Start MN DHS EVV + HHAeXchange registration; on packet receipt, fill the adapter
  wire format and run sandbox certification.
- Begin SOC 2 + pen test (calendar-bound — start during the pilot).

## Success criteria (exit pilot → expand)
- 3 providers actively using it daily; ≥1 willing reference/case study.
- Measurable compliance lift (e.g., six-element completeness > 95%).
- A prioritized, validated backlog from real provider feedback.
- HHAeXchange Alt-EVV registration in progress with a sponsor provider.

## Out of scope for now
- Ohio/Arizona (Sandata) expansion.
- Starting certification before pilots prove demand.
- Billing/claims submission (internal billing-readiness is enough for pilot).
