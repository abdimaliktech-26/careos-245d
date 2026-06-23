# Higsi — 245D Suite

HIPAA-compliant Minnesota 245D HCBS compliance platform for home and community-based service providers. Handles client intake packets, electronic signatures, 45-day/annual reviews, EVV, incidents, CMS-1500 billing, staff management, and AI-powered compliance tools.

**Production:** [careintake-five.vercel.app](https://careintake-five.vercel.app)

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | Node.js 22 |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Supabase (Auth, RLS, Realtime, Storage) |
| AI/LLM | Anthropic Claude (Haiku 4.5) via Vercel AI SDK |
| Payments | Stripe (checkout, webhooks, subscription sync) |
| Email | Resend (SMTP + REST API) |
| Styling | Tailwind CSS v4 with CSS custom properties |
| Testing | Vitest (unit) + Playwright (E2E) |
| Deployment | Vercel with cron jobs |

## Quick Start

```bash
git clone <repo>
cd careintake
cp .env.example .env.local
# Fill in Supabase, Anthropic, Stripe, and Resend keys in .env.local
npm install
npm run dev        # → http://localhost:3000
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic Claude (chatbot, auto-fill, narrative, AI features) |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | For billing | Stripe price IDs (also Pro/Enterprise) |
| `RESEND_API_KEY` | For email | Resend API key |
| `CRON_SECRET` | For cron | Scheduled audit endpoint auth |
| `AUDIT_CRON_SECRET` | For cron | Audit notification endpoint auth |
| `NEXT_PUBLIC_APP_URL` | Production | App URL for redirects/emails |

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npm test` | Run tests (Vitest) |
| `npm run test:run` | Run tests once (CI) |

## Architecture

```
src/
  app/                    # Next.js App Router pages & API routes
    (app)/                # Authenticated app shell (dashboard, clients, etc.)
    api/                  # REST API routes (chat, stripe, cron, etc.)
    auth/                 # Auth pages (login, forgot-password, callback)
    client/               # Client/guardian portal
    sign/[token]/         # External signing links
    super-admin/          # Platform admin panel
  components/             # React components (chat, forms, layout, PWA, etc.)
  hooks/                  # Custom hooks (geolocation, voice-input, translation)
  lib/                    # Business logic (auth, billing, forms, audit, etc.)
  types/                  # TypeScript type definitions
  tests/                  # Vitest unit tests
supabase/
  migrations/             # Database migrations (24 files)
  templates/              # Email templates (password reset)
  config.toml             # Supabase local dev config
e2e/                      # Playwright end-to-end tests
```

## Roles

| Role | Access |
|---|---|
| `super_admin` | Platform admin — manage orgs, users, subscriptions, system settings |
| `org_admin` | Org admin — manage staff, settings, billing, clients, all features |
| `program_manager` | Program manager — manage clients, packets, staff assignments |
| `staff` | Direct care staff — view assigned clients, complete forms, log notes |
| `external_signer` | Client/guardian — view documents, sign forms via secure link |

## Features

- **44+ preloaded 245D forms** across ICS, ICLS, IHS, Employment, Day, Residential programs
- **Intake + review packets** (intake, 45-day, semi-annual, annual) with deadline alerts
- **Two-party electronic signatures** (client/guardian + case manager) with secure signing links
- **EVV + GPS tracking** with geofencing and time stamps
- **CMS-1500 billing** with claims, authorizations, CPT codes, auto-generation from forms
- **AI tools** — auto-fill, narrative generation, translation, Fatal Five detection, schedule optimizer
- **Client portal** — secure messaging, document viewing, schedule access, digital signing
- **Staff management** — role-based access, training tracking, background study status, directory
- **Compliance monitoring** — real-time alerts, audit trail, 45-day review tracking
- **Multi-tenant** — organization isolation via RLS, custom branding per org
- **PWA** — offline support, installable, service worker with mutation queue
- **Stripe subscriptions** — checkout, webhooks, subscription management from super admin
- **Dark mode** — toggle with system preference detection, persisted in localStorage
- **Bilingual** — English + Somali (Af Soomaali) with voice input support

## Testing

```bash
npm run test:run           # 236 unit tests across 20 suites
npx playwright test        # E2E tests
```

Test coverage includes auth, billing, compliance, forms, signing links, onboarding, subscriptions, Stripe plans, and data retention.

## Deployment

Auto-deployed to Vercel on push. Cron job runs daily audit at 6:00 AM. Stripe webhook at `/api/stripe/webhook`.

```bash
vercel --prod
```

## License

Private. All rights reserved.
