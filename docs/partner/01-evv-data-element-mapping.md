# EVV Data-Element Mapping — CareIntake → 21st Century Cures Act

**Audience:** Minnesota providers, MN DHS, and future EVV aggregator integration teams (HHAeXchange, Sandata).
**Purpose:** Show that CareIntake captures all six federally required EVV data elements and how each maps to our internal model and to the normalized aggregator payload.

## The six required Cures Act elements

Section 12006 of the 21st Century Cures Act requires every EVV record to capture:

| # | Cures Act element | CareIntake source field | Internal key | Aggregator payload field | Capture method |
|---|---|---|---|---|---|
| 1 | Type of service performed | `evv_visits.service_name` → mapped to procedure code via `evv_service_codes` | `service_type` | `serviceType` | Scheduled service + state service-code catalog |
| 2 | Individual receiving the service | `evv_visits.client_id` → client Medicaid/recipient ID | `individual_receiving` | `clientExternalId` | Client record (`clients.medicaid_id`) |
| 3 | Date of the service | `evv_visits.service_date` | `date_of_service` | `serviceDate` | System-recorded on visit |
| 4 | Location of service delivery | `evv_visits.check_in_location` / `check_out_location` (GPS lat/lng + accuracy) | `service_location` | `serviceLocation`, `checkIn.lat/lng`, `checkOut.lat/lng` | GPS at clock-in/out |
| 5 | Individual providing the service | `evv_visits.staff_id` → caregiver registry ID | `individual_providing` | `caregiverExternalId` | Authenticated caregiver |
| 6 | Time the service begins and ends | `evv_visits.actual_start` / `actual_end` | `service_times` | `checkIn.timestamp`, `checkOut.timestamp`, `billableMinutes` | GPS clock-in/out timestamps |

These six are enforced by `checkCuresActElements()` in `src/lib/evv/compliance.ts`; a
visit missing any required element is flagged `incomplete_documentation` and is **not
eligible for transmission** to a state aggregator.

## Normalized aggregator payload

CareIntake builds a vendor-agnostic payload (`AggregatorVisitPayload`,
`src/lib/evv/aggregator/types.ts`) that every aggregator adapter (HHAeXchange,
Sandata, …) translates to its own wire format:

```
idempotencyKey      Stable per visit (dedupes resubmissions; no double billing)
providerId          Provider's aggregator/Medicaid provider ID
visitId             Internal visit UUID
serviceType         Mapped procedure / aggregator service code (element 1)
clientExternalId    Recipient Medicaid ID (element 2)
caregiverExternalId Caregiver registry ID (element 5)
serviceDate         Date of service (element 3)
checkIn / checkOut  GPS stamp: timestamp + lat/lng + accuracy (elements 4, 6)
serviceLocation     Service-delivery coordinates/label (element 4)
billableMinutes     Derived from check-in → check-out (element 6)
```

## Identifier mapping (provider-supplied)

| Aggregator needs | CareIntake field | Where set |
|---|---|---|
| Provider ID | `evv_aggregator_config.provider_id` | Org EVV settings |
| Recipient/Member ID | `clients.medicaid_id` | Client record |
| Caregiver ID | staff caregiver ID field | Staff record |
| Payer / MCO | `clients.payer` | Client record |
| Service/procedure code | `evv_service_codes` (per state) | EVV settings catalog |

## Verification & exception handling

Before any visit transmits, it passes:
1. **Cures completeness** — all six elements present.
2. **Exception screen** — geofence, late check-in/early check-out, missing check-out,
   missed visit, impossible travel (`detectVisitExceptions()`), with per-state
   thresholds (geofence radius, grace periods) from the state profile.
3. **Transmission eligibility gate** — `validateForTransmission()` blocks anything
   incomplete; unmapped service codes are held, never sent with bad data.

All checks, verdicts, and transmission attempts are written to immutable audit
records (`audit_logs`, `agent_validation_runs`, `evv_aggregator_transmissions`).
