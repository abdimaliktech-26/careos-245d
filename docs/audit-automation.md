# Audit Automation

Higsi includes an automated audit engine for packet deadlines, document completeness, required fields, signatures, stored documents, staff setup, billing status, and EVV visit records.

## Database Setup

Apply this migration before enabling scheduled audits:

```text
supabase/migrations/202606070005_audit_automation_evv.sql
```

It creates:

- `audit_reports`
- `audit_notifications`
- `evv_visits`

## Scheduled Audit Endpoint

Endpoint:

```text
GET /api/cron/audit
```

Required authorization:

```text
Authorization: Bearer <CRON_SECRET>
```

The endpoint:

- audits every active organization
- saves an `audit_reports` row
- queues high/critical email and SMS notifications
- attempts delivery if provider keys are configured

## Environment Variables

Required:

```text
CRON_SECRET=generate-a-long-random-secret
```

Optional email delivery:

```text
RESEND_API_KEY=
AUDIT_EMAIL_FROM="Higsi <audits@yourdomain.com>"
```

Optional SMS delivery:

```text
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_PHONE=
```

## EVV Audit Checks

The audit assistant checks EVV records for:

- no recent EVV records
- scheduled visits that were not completed after the service date
- completed visits missing actual start/end times
- completed visits missing check-in/check-out method
- completed visits missing check-in/check-out location
- undocumented EVV exceptions
