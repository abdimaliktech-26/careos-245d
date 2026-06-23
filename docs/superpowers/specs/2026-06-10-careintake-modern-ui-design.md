# Higsi Modern — UI/UX Upgrade Design

**Date:** 2026-06-10
**Status:** Approved direction (visual system validated via browser mockups)

## Goal

Upgrade the entire Higsi SaaS frontend: design system, component library,
app shell UX, dashboard, marketing landing page, and first AI-powered UX wins.
Brand DNA (pink/purple/blue) is preserved but modernized — pastel lavender wash
replaced with neutral surfaces and a distilled fuchsia→violet accent.

## Design System ("Higsi Modern")

### Tokens

| Token | Light (default) | Dark ("Void Violet") |
|---|---|---|
| Background | `#FAFAFB` | `#09090B` |
| Surface / card | `#FFFFFF` | `#0F0F12` |
| Border | `#E8E8EC` (1px) | `#27272A` (1px) |
| Text | `#18181B` | `#FAFAFA` |
| Text muted | `#71717A` | `#71717A` |
| Brand accent | `#DB2777` → `#7C3AED` gradient | `#F472B6` → `#A78BFA` |
| Primary (solid) | `#A21CAF` | `#A78BFA` |
| Status: due/warn | amber `#B45309` on `#FEF3C7` | `#FBBF24` on `rgba(245,158,11,.14)` |
| Status: done/ok | green `#15803D` on `#DCFCE7` | `#4ADE80` on `rgba(34,197,94,.14)` |
| Status: overdue/error | red `#B91C1C` on `#FEE2E2` | `#F87171` on `rgba(239,68,68,.14)` |

### Rules

- Brand gradient appears only on: logo wordmark, primary CTAs, active nav
  indicator, key metric highlights. Everything else neutral.
- Semantic status colors are real (amber/green/red) — never remapped to brand
  colors. Compliance app: scanability beats aesthetics.
- Radii: 10px cards, 7px buttons/inputs. Shadows minimal; 1px borders carry
  hierarchy. Dark mode may use faint violet glow on highlighted cards only.
- Light mode is default; dark mode user-toggleable (existing toggle retained).

## Phase 1 — globals.css rewrite

- Replace current token block with the new system above, expressed as Tailwind
  v4 `@theme` tokens so utilities like `bg-surface`, `text-muted`,
  `border-default` exist natively.
- **Delete the ~150-line `!important` override layer** (lines ~140–286 of
  current `globals.css`) that remaps `bg-gray-*`, `text-gray-*`, status badge
  classes, etc. Pages relying on those remaps will be touched in later phases;
  in the interim they render with standard Tailwind grays, which is acceptable
  and closer to the target design than the lavender remap.
- Keep: animations, scrollbar styles, `.dot-grid` (retinted), `.care-panel` /
  `.care-input` (retokened) for backward compatibility during migration.

## Phase 2 — shadcn/ui component layer

- `npx shadcn@latest init` (Tailwind v4 / CSS-variables mode), themed with our
  tokens via `@theme` mapping.
- Components: button, input, card, table, dialog, dropdown-menu, badge, tabs,
  command, sheet, sonner, skeleton, select, separator, tooltip, avatar.
- Migrate `src/components/ui/button.tsx`, `input.tsx`, `loading-skeleton.tsx`
  to shadcn equivalents (preserve existing prop APIs where pages depend on
  them, or update call sites — whichever is smaller per component).
- Keep custom: `form-field`, `voice-mic-button`, `dark-mode-toggle` (retheme),
  `error-boundary`, `locale-*`.
- Existing component tests updated alongside; coverage stays ≥ current.

## Phase 3 — App shell UX

- Sidebar nav grouped, collapsible, role-aware:
  - **Care**: Dashboard, Clients, Notes, Schedule, EVV
  - **Compliance**: Packets, Incidents, QA, Compliance Alerts, Form Library
  - **Business**: Billing Readiness, Analytics, Documents
  - **Admin**: existing /admin sections (admins only)
- **Command palette (Cmd+K)** via shadcn `command`: route navigation, client
  search, quick actions (new client, new note, new incident).
- Header: breadcrumbs, notifications bell, theme toggle, user menu.
- Mobile: sheet-based drawer nav.

## Phase 4 — Dashboard redesign

- "Needs attention today" feed: due 45-day/annual reviews, expiring documents,
  unsigned packets, missing EVV — ranked by deadline proximity, each row
  deep-links to fix-it screen.
- Stat cards (active clients, due reviews, open incidents, claims ready) in new
  design language.
- AI morning briefing card: server route summarizing the feed via existing
  DeepSeek integration; graceful fallback to static list when AI unavailable.
  AI output labeled as AI-generated.

## Phase 5 — Marketing landing page

- Reskin `src/app/page.tsx` with new tokens: aurora-tinted hero (subtle violet/
  pink mesh), product mockup in browser frame, tightened feature sections,
  pricing cards, stronger CTA hierarchy. Content/copy unchanged unless broken
  by layout.

## Phase 6 — AI quick wins

- Command palette "ask" mode: free-text question routed to existing chat API.
- Client 360 summary card on client profile: one-paragraph AI summary of
  recent activity, goals, health trends. Server-generated, cached, labeled,
  audit-logged like existing AI routes.

## Out of scope (roadmap, not this effort)

Full AI upgrade map (denial predictor, ambient documentation, audit simulator,
etc.) recorded separately in the project conversation; voice intake; per-page
deep redesigns beyond what tokens + components deliver; nav analytics.

## Testing & rollout

- Each phase: `npm run build && npm run test:run` green before next phase.
- Visual verification on dev server per phase (dashboard, one client page,
  packets, landing, both themes).
- Phases land in order; 1–2 are prerequisites for all else.

## Risks

- Deleting the override layer changes appearance of untouched pages mid-
  migration (acceptable; standard grays are closer to target than lavender).
- shadcn + Tailwind v4 + React 19: use current shadcn CLI (supports both).
- Pages with hardcoded hex classes (`text-[#0F172A]` etc.) will be normalized
  opportunistically as phases touch them.
