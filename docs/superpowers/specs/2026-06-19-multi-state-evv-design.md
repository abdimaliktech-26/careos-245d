# Multi-State EVV Architecture — Design

**Date:** 2026-06-19
**Status:** Approved (design); pending implementation plan
**Project:** Higsi / Stillwater 245D Suite

## Summary

Add a **state-configuration + rules layer** above the existing (already-built)
vendor-agnostic EVV aggregator stack, so the platform can serve provider agencies
in multiple states. Each state defines its EVV model, default aggregator, visit
rules (geofence, grace periods, required elements), and service-code catalog. The
existing `AggregatorAdapter`/registry/queue handles transmission unchanged.

## What already exists (reuse, do not rebuild)

- `src/lib/evv/aggregator/types.ts` — `AggregatorAdapter`, `AggregatorVendor`
  (`'none' | 'hhaexchange' | 'sandata'`), normalized `AggregatorVisitPayload`,
  `TransmissionOutcome`, `ResolvedAggregatorConfig`.
- `registry.ts` (`getAdapter(vendor)`), `config.ts` (`getAggregatorConfig` from
  `evv_aggregator_config`), `mapping.ts` (`validateForTransmission`,
  `resolveExternalIds`, payload build), `queue.ts` + `backoff.ts` + `transitions.ts`.
- `hhaexchange-adapter.ts` + `sandata-adapter.ts` — stubs whose endpoints/wire
  formats are `TODO` pending each vendor's integration packet.

## Scope

In: state profiles, a state-driven rules engine (generalizing `compliance.ts`'s
hardcoded constants), a per-state service-code catalog, client payer/MCO + Medicaid
ID, org→state onboarding config, and routing a visit to the state's default
aggregator vendor.

Out (cert-blocked, separate work): the actual Sandata/HHAeXchange request schemas +
endpoints (from vendor integration packets after Alt-EVV approval). Adapters stay
stubbed and return `not_configured` until then. This spec makes the platform
**multi-state-capable and certification-ready**; per-state go-live is gated on the
business-track vendor approvals.

## State target set (initial)

`MN` (model: open, default vendor: hhaexchange), `OH` (open, sandata),
`AZ` (open, sandata). Architecture supports adding more by dropping in a profile.
(Verify each state's current aggregator contract before go-live; they change.)

## Data Model (new migration)

```sql
-- Per-org EVV state binding + rule overrides.
CREATE TABLE evv_state_config (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL,            -- 'MN' | 'OH' | 'AZ' | ...
  overrides       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- optional per-org rule overrides
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-state service/procedure code catalog (HCPCS + units + aggregator code).
CREATE TABLE evv_service_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  state_code      TEXT NOT NULL,
  service_name    TEXT NOT NULL,            -- internal label (matches visit.service_name)
  procedure_code  TEXT NOT NULL,            -- HCPCS, e.g. T1019
  unit_minutes    INTEGER NOT NULL DEFAULT 15,
  aggregator_code TEXT,                     -- vendor-specific override if needed
  active          BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_evv_service_codes_org ON evv_service_codes(organization_id, state_code);

-- Client payer / Medicaid identifiers (extend if evv_external_ids lacks them).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payer TEXT;          -- MCO / Medicaid payer
ALTER TABLE clients ADD COLUMN IF NOT EXISTS medicaid_id TEXT;
```

RLS: `evv_state_config` + `evv_service_codes` org-scoped
(`organization_id = get_my_org_id()`, writes `has_role('org_admin')`). Follows the
existing `evv_aggregator_config` policy pattern.

## State Profiles (code-defined registry)

`src/lib/evv/states/` — typed profiles; the source of truth for rule parameters.

```typescript
// src/lib/evv/states/types.ts
import type { CuresActElementKey } from '@/lib/evv/compliance'
import type { AggregatorVendor } from '@/lib/evv/aggregator/types'

export type EvvModel = 'open' | 'closed' | 'provider_choice'

export type StateProfile = {
  code: string                 // 'MN'
  name: string                 // 'Minnesota'
  model: EvvModel
  defaultVendor: AggregatorVendor
  geofenceRadiusM: number
  lateCheckInGraceMin: number
  earlyCheckOutGraceMin: number
  missedVisitGraceMin: number
  impossibleTravelSpeedKmh: number
  requiredElements: CuresActElementKey[]    // the 6 Cures elements (+ state extras)
}
```

```typescript
// src/lib/evv/states/registry.ts
import type { StateProfile } from './types'
import { MN } from './mn'; import { OH } from './oh'; import { AZ } from './az'

const PROFILES: Record<string, StateProfile> = { MN, OH, AZ }
export function getStateProfile(code: string): StateProfile | null {
  return PROFILES[code?.toUpperCase()] ?? null
}
export const DEFAULT_STATE = 'MN'
```

Each profile (e.g. `mn.ts`) exports a `StateProfile`. MN preserves today's
constants (geofence 100m, graces 10/10/15, speed 120) so MN behavior is unchanged.

## Rules Engine Generalization

`src/lib/evv/compliance.ts` currently hardcodes `GEOFENCE_RADIUS_M`,
`*_GRACE_MINUTES`, `IMPOSSIBLE_TRAVEL_SPEED_KMH`. Refactor the rule-bearing
functions to accept an optional `StateProfile`, defaulting to the MN profile so
existing callers and tests keep working:

- `detectVisitExceptions(visit, { now?, profile? })` — use `profile.geofenceRadiusM`,
  grace fields, speed instead of module constants.
- `isMissedVisit(visit, now?, profile?)`.
- `checkCuresActElements(visit, profile?)` — required set from `profile.requiredElements`.

Keep the exported constants as the MN defaults (back-compat). New callers pass the
org's profile. Pure functions; no I/O.

A new resolver ties org → profile:
```typescript
// src/lib/evv/states/resolve.ts
export async function getOrgStateProfile(organizationId: string): Promise<StateProfile>
// reads evv_state_config.state_code (fallback DEFAULT_STATE), returns the profile
// merged with any per-org `overrides`.
```

## Service-Code Mapping

`AggregatorVisitPayload.serviceType` is a free string today. Add
`src/lib/evv/states/service-codes.ts`:
```typescript
export async function resolveServiceCode(organizationId: string, stateCode: string, serviceName: string)
  : Promise<{ procedureCode: string; aggregatorCode: string | null; unitMinutes: number } | null>
```
The payload builder in `mapping.ts` uses this to set `serviceType` to the correct
procedure/aggregator code; a missing mapping blocks transmission with a clear flag
(don't send an unmapped code).

## Org Onboarding

In super-admin org create/edit and the org admin EVV settings: choose **state** →
auto-set `evv_state_config.state_code`, default the aggregator vendor from the
profile (`defaultVendor`), and seed a starter `evv_service_codes` set for that state
(editable). Aggregator credentials use the existing `evv_aggregator_config` UI.

## Data Flow

```
Org → getOrgStateProfile()         (rules + default vendor)
Visit completed → detectVisitExceptions(visit, { profile })   (state-driven)
   → eligible? → resolveExternalIds + resolveServiceCode → AggregatorVisitPayload
   → registry.getAdapter(vendor).transmit(payload, config)    (existing queue/backoff/ack)
```

## Error Handling

- Unknown/unset state → fall back to `DEFAULT_STATE` (MN) and flag the org config as
  incomplete; never crash.
- Missing service-code mapping or aggregator config → visit held with a clear
  reason (`not_configured`/flag), not silently dropped or sent with bad codes.
- Profile lookups are pure + total (return null → caller handles).

## Testing

- **Unit (bulk):** state registry (`getStateProfile` for MN/OH/AZ + unknown);
  `detectVisitExceptions`/`checkCuresActElements` under different profiles (e.g. a
  state with a tighter geofence flags a visit MN would pass); `resolveServiceCode`
  found/missing.
- **Integration (test DB):** org bound to OH → `getOrgStateProfile` returns OH +
  sandata default; service-code catalog read; RLS scoping.
- **E2E:** onboard an OH org (state=OH) → visit validates under OH rules → routes to
  the Sandata adapter (returns `not_configured` until certified) and is queued.

## Out of Scope

- Vendor wire formats/endpoints (Sandata, HHAeXchange) — from integration packets.
- Alt-EVV certification (business track, gates go-live per state).
- Telephony/IVR + FOB capture methods (later EVV phase).
- Billing/claims (separate roadmap phase).
