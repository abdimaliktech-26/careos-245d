# Higsi Modern — Phase 1–3 Implementation Plan (Design System + shadcn + App Shell)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Higsi's pastel-lavender design system with the approved "Higsi Modern" token system (light default / Void Violet dark, fuchsia→violet brand accent), adopt shadcn/ui as the component layer, and rebuild the app shell (grouped sidebar, header with breadcrumbs, Cmd+K command palette).

**Architecture:** Tokens live in `src/app/globals.css` as shadcn-convention CSS variables mapped through Tailwind v4 `@theme inline`. Legacy variable names (`--color-*`, `--care-*`, `--gradient-*`) stay defined as aliases so untouched pages keep rendering. shadcn components are added to `src/components/ui/`; the existing `Button`/`Input` keep their public prop APIs (`variant="primary|secondary|danger"`, `loading`) via custom cva variants. Nav structure is pure data in `nav-config.ts` (unit-tested), rendered by a rewritten sidebar; breadcrumbs are a pure util (unit-tested).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (CLI v4, radix base), lucide-react, vitest + testing-library.

**Spec:** `docs/superpowers/specs/2026-06-10-careintake-modern-ui-design.md`. Dashboard redesign, landing page, and AI features are follow-up plans — NOT in this plan.

**Working rules for every task:**
- Run commands from repo root `/Users/abdimalik/Desktop/careintake`.
- Full check = `npm run test:run && npm run build`. Both must pass before each commit.
- Commit messages: conventional commits, no Co-Authored-By trailer.

---

### Task 1: shadcn/ui init + add components

**Files:**
- Create: `components.json`, `src/lib/utils.ts` (cn helper — created by CLI)
- Modify: `package.json`, `src/app/globals.css` (CLI rewrites it — we fully replace it in Task 2, so don't hand-fix the CLI output)
- Create: `src/components/ui/{card,dialog,dropdown-menu,badge,tabs,command,sheet,sonner,skeleton,select,separator,tooltip,avatar,label,textarea,table}.tsx`
- Overwritten (adapted in Task 3): `src/components/ui/button.tsx`, `src/components/ui/input.tsx`

- [ ] **Step 1: Baseline check**

Run: `npm run test:run && npm run build`
Expected: PASS (record any pre-existing failures; do not proceed if broken).

- [ ] **Step 2: Init shadcn non-interactively**

```bash
npx shadcn@latest init -d -f
```

Expected: creates `components.json` (style new-york, baseColor zinc, cssVariables true), `src/lib/utils.ts` with `cn()`, installs `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`; rewrites `src/app/globals.css`.

- [ ] **Step 3: Add components (overwrite existing button/input deliberately)**

```bash
npx shadcn@latest add -y -o button input card dialog dropdown-menu badge tabs command sheet sonner skeleton select separator tooltip avatar label textarea table
```

Expected: files appear under `src/components/ui/`.

- [ ] **Step 4: Verify font setup not broken**

`src/app/layout.tsx` already puts `${geistSans.variable} ${geistMono.variable}` on `<html>` — correct, leave it. Font fix happens in Task 2's globals.css (literal `"Geist"` names in `@theme inline`, never `var(--font-sans)` self-reference).

- [ ] **Step 5: Commit (build will be red until Task 2/3 — commit as WIP on purpose, single logical unit finishes at Task 3)**

Do NOT commit yet if `git status` shows only generated files — proceed to Task 2 and commit there. (Init output + token rewrite + button/input adaptation form one buildable unit; committing mid-way leaves a broken build in history.)

---

### Task 2: globals.css — Higsi Modern tokens

**Files:**
- Modify: `src/app/globals.css` (full replacement)

- [ ] **Step 1: Replace entire `src/app/globals.css` with:**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

html {
  scroll-behavior: smooth;
}

/* ================================================================
   Higsi Modern tokens
   Light = default. Dark = "Void Violet".
   ================================================================ */

:root {
  --background:            #FAFAFB;
  --foreground:            #18181B;
  --card:                  #FFFFFF;
  --card-foreground:       #18181B;
  --popover:               #FFFFFF;
  --popover-foreground:    #18181B;
  --primary:               #A21CAF;
  --primary-foreground:    #FFFFFF;
  --secondary:             #F4F4F5;
  --secondary-foreground:  #18181B;
  --muted:                 #F4F4F5;
  --muted-foreground:      #71717A;
  --accent:                #FAF5FF;
  --accent-foreground:     #7C3AED;
  --destructive:           #DC2626;
  --destructive-foreground:#FFFFFF;
  --border:                #E8E8EC;
  --input:                 #E8E8EC;
  --ring:                  #A21CAF;
  --radius:                0.625rem;

  /* Brand gradient (logo, primary CTAs, active nav, key metrics ONLY) */
  --brand-from:            #DB2777;
  --brand-to:              #7C3AED;

  /* Semantic status (badges) */
  --status-warn-fg:        #B45309;
  --status-warn-bg:        #FEF3C7;
  --status-ok-fg:          #15803D;
  --status-ok-bg:          #DCFCE7;
  --status-error-fg:       #B91C1C;
  --status-error-bg:       #FEE2E2;

  /* ---- Legacy aliases (keep untouched pages rendering; remove as
     pages migrate to semantic utilities) ---- */
  --color-bg:              var(--background);
  --color-surface:         var(--card);
  --color-text:            var(--foreground);
  --color-text-muted:      var(--muted-foreground);
  --color-border:          var(--border);
  --color-border-strong:   #D4D4D8;
  --color-pink:            #F0ABFC;
  --color-pink-light:      #FAF5FF;
  --color-pink-mid:        #DB2777;
  --color-blue:            #A5B4FC;
  --color-blue-light:      #EEF2FF;
  --color-blue-mid:        #7C3AED;
  --color-purple:          #C4B5FD;
  --color-purple-light:    #F5F3FF;
  --gradient-primary:      linear-gradient(135deg, var(--brand-from), var(--brand-to));
  --gradient-hero:         linear-gradient(135deg, var(--brand-from) 0%, var(--brand-to) 100%);
  --gradient-soft:         linear-gradient(135deg, #FDF2F8, #F5F3FF);
  --gradient-blue:         linear-gradient(135deg, #EEF2FF, #FAFAFB);
  --shadow-card:           0 1px 2px rgba(24, 24, 27, 0.05);
  --shadow-button:         0 1px 2px rgba(24, 24, 27, 0.1);
  --shadow-modal:          0 16px 48px rgba(24, 24, 27, 0.18);
  --care-primary:          var(--primary);
  --care-primary-end:      var(--brand-to);
  --care-accent:           var(--accent-foreground);
  --care-muted:            var(--muted-foreground);
  --care-line:             var(--border);
  --care-surface:          var(--card);
  --care-surface-2:        var(--muted);
  --care-cta:              var(--gradient-primary);
}

.dark {
  --background:            #09090B;
  --foreground:            #FAFAFA;
  --card:                  #0F0F12;
  --card-foreground:       #FAFAFA;
  --popover:               #0F0F12;
  --popover-foreground:    #FAFAFA;
  --primary:               #A78BFA;
  --primary-foreground:    #18181B;
  --secondary:             #1C1C20;
  --secondary-foreground:  #FAFAFA;
  --muted:                 #1C1C20;
  --muted-foreground:      #A1A1AA;
  --accent:                #1C1528;
  --accent-foreground:     #C4B5FD;
  --destructive:           #F87171;
  --destructive-foreground:#18181B;
  --border:                #27272A;
  --input:                 #27272A;
  --ring:                  #A78BFA;

  --brand-from:            #F472B6;
  --brand-to:              #A78BFA;

  --status-warn-fg:        #FBBF24;
  --status-warn-bg:        rgba(245, 158, 11, 0.14);
  --status-ok-fg:          #4ADE80;
  --status-ok-bg:          rgba(34, 197, 94, 0.14);
  --status-error-fg:       #F87171;
  --status-error-bg:       rgba(239, 68, 68, 0.14);

  --color-border-strong:   #3F3F46;
  --color-pink-light:      #1C1528;
  --color-blue-light:      #16162A;
  --color-purple-light:    #1C1528;
  --shadow-card:           0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-modal:          0 16px 48px rgba(0, 0, 0, 0.6);
}

@theme inline {
  --color-background:           var(--background);
  --color-foreground:           var(--foreground);
  --color-card:                 var(--card);
  --color-card-foreground:      var(--card-foreground);
  --color-popover:              var(--popover);
  --color-popover-foreground:   var(--popover-foreground);
  --color-primary:              var(--primary);
  --color-primary-foreground:   var(--primary-foreground);
  --color-secondary:            var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted:                var(--muted);
  --color-muted-foreground:     var(--muted-foreground);
  --color-accent:               var(--accent);
  --color-accent-foreground:    var(--accent-foreground);
  --color-destructive:          var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border:               var(--border);
  --color-input:                var(--input);
  --color-ring:                 var(--ring);
  --color-brand-from:           var(--brand-from);
  --color-brand-to:             var(--brand-to);
  --color-status-warn:          var(--status-warn-fg);
  --color-status-warn-bg:       var(--status-warn-bg);
  --color-status-ok:            var(--status-ok-fg);
  --color-status-ok-bg:         var(--status-ok-bg);
  --color-status-error:         var(--status-error-fg);
  --color-status-error-bg:      var(--status-error-bg);
  --color-app-bg:               var(--background);

  --font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace;

  --radius-xs: calc(var(--radius) * 0.5);
  --radius-sm: calc(var(--radius) * 0.75);
  --radius-md: calc(var(--radius) * 0.875);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.5);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Auth/marketing surfaces (retinted to new brand) */
.dot-grid {
  background:
    radial-gradient(circle at 20% 10%, rgba(219, 39, 119, 0.06), transparent 28%),
    radial-gradient(circle at 85% 0%, rgba(124, 58, 237, 0.06), transparent 26%),
    radial-gradient(circle, rgba(124, 58, 237, 0.05) 1px, transparent 1px);
  background-size: auto, auto, 28px 28px;
}

/* Legacy card/input surfaces — kept until pages migrate to shadcn Card/Input */
.care-panel {
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}

.care-input {
  border-color: var(--input);
  background: var(--card);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.care-input:focus {
  outline: none;
  border-color: var(--ring);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 25%, transparent);
}

/* Thin scrollbar */
.scrollbar-thin::-webkit-scrollbar          { width: 4px; height: 4px; }
.scrollbar-thin::-webkit-scrollbar-track    { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb    { background: var(--border); border-radius: 4px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: var(--color-border-strong); }

/* ================================================================
   ANIMATIONS (unchanged from previous system)
   ================================================================ */

@keyframes slide-down {
  from { transform: translateY(-10px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

@keyframes slide-up {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

.animate-slide-down { animation: slide-down 0.6s ease-out; }
.animate-slide-up   { animation: slide-up 0.25s ease-out; }
.animate-float      { animation: float 6s ease-in-out infinite; }

@keyframes slide-in-left {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

@keyframes slide-in-right {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

@keyframes scale-in {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

@keyframes count-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes scan {
  0%   { top: 0; }
  50%  { top: 100%; }
  100% { top: 0; }
}

@keyframes typing {
  0%, 100% { width: 0; }
  30% { width: 5rem; }
  70% { width: 5rem; }
}

@keyframes blink-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.stat-card-mockup { animation: scale-in 0.5s ease-out both; }
.table-row-mockup { animation: slide-in-right 0.4s ease-out both; }
.counter-mockup   { animation: count-up 0.6s ease-out both; }

.scanline-mockup {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(219, 39, 119, 0.4), transparent);
  animation: scan 3s ease-in-out infinite;
  pointer-events: none;
  border-radius: 1px;
}

.typing-bar { animation: typing 2.5s ease-in-out infinite; }

.status-blink-danger { animation: blink-warning 1.5s ease-in-out infinite; }
.status-blink-normal { animation: blink-warning 4s ease-in-out infinite; }
```

Key deltas vs old file: the entire `!important` override layer (old lines ~140–286) is GONE; shadcn variable set added; legacy `--color-*`/`--care-*`/`--gradient-*` aliases preserved with new values; `@custom-variant dark` makes class-based `dark:` utilities work.

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: may FAIL only on `button.tsx`/`input.tsx` call-site type errors (fixed next task). Any OTHER error: fix before continuing (most likely a page importing a removed CSS class — acceptable visually, but must compile).

---

### Task 3: Adapt shadcn Button/Input to legacy prop APIs

**Files:**
- Modify: `src/components/ui/button.tsx` (the shadcn-generated file)
- Verify: `src/components/ui/input.tsx` call sites

- [ ] **Step 1: Write failing test** at `src/tests/components/ui/button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button (legacy API compatibility)', () => {
  test('renders children for primary variant', () => {
    render(<Button variant="primary">Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  test('supports secondary and danger variants', () => {
    render(
      <>
        <Button variant="secondary">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </>
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  test('loading shows Loading… and disables button', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Loading…')
  })

  test('disabled prop disables button', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/components/ui/button.test.tsx`
Expected: FAIL (shadcn button has no `primary`/`danger` variants, no `loading` prop).

- [ ] **Step 3: Edit the shadcn-generated `src/components/ui/button.tsx`:**

Keep everything the CLI generated, then make these three changes:

1. In `buttonVariants` cva `variants.variant`, ADD:

```ts
      primary:
        "bg-gradient-to-r from-brand-from to-brand-to text-white shadow-xs hover:opacity-90 disabled:opacity-50",
      danger:
        "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 disabled:opacity-50",
```

(Leave the generated `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` variants in place. `secondary` already exists and matches the legacy variant name — no work needed for it.)

2. Change `defaultVariants.variant` from `"default"` to `"primary"` (legacy call sites omit variant and expect the gradient).

3. Extend the component signature with `loading`:

```tsx
function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? "Loading…" : children}
    </Comp>
  )
}
```

(Match the actual generated file's import style — if it uses `Slot` from `radix-ui`, keep that. Preserve the `buttonVariants` export.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/components/ui/button.test.tsx`
Expected: PASS

- [ ] **Step 5: Whole-repo type/build check for Button/Input call sites**

Run: `npm run build`
Expected: PASS. If a call site passes a prop the new components lack (e.g., old custom Input prop), adapt the component the same way (preserve legacy prop), not the call sites — there are ~60 pages.

- [ ] **Step 6: Full test suite**

Run: `npm run test:run`
Expected: PASS (pre-existing suites green; form-field/field-types tests exercise Input indirectly).

- [ ] **Step 7: Commit Tasks 1–3 as one unit**

```bash
git add -A
git commit -m "feat(ui): adopt shadcn/ui with Higsi Modern token system

- shadcn init (new-york, radix, zinc) + 18 components
- globals.css: new light/dark tokens, brand gradient vars, semantic
  status tokens; deleted the !important Tailwind-override layer
- Button/Input adapted to preserve legacy prop APIs"
```

---

### Task 4: Grouped nav config (pure data + role filter)

**Files:**
- Create: `src/components/layout/nav-config.ts`
- Test: `src/tests/components/layout/nav-config.test.ts`

- [ ] **Step 1: Write failing test** at `src/tests/components/layout/nav-config.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { NAV_GROUPS, visibleNavGroups } from '@/components/layout/nav-config'

describe('nav-config', () => {
  test('defines care, compliance, business, workspace, admin groups in order', () => {
    expect(NAV_GROUPS.map((group) => group.id)).toEqual([
      'care',
      'compliance',
      'business',
      'workspace',
      'admin',
    ])
  })

  test('every nav item has href, label, and icon', () => {
    for (const group of NAV_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.href).toMatch(/^\//)
        expect(item.translationKey.length).toBeGreaterThan(0)
        expect(item.icon).toBeDefined()
      }
    }
  })

  test('admin group hidden for staff and program_manager', () => {
    expect(visibleNavGroups('staff').map((group) => group.id)).not.toContain('admin')
    expect(visibleNavGroups('program_manager').map((group) => group.id)).not.toContain('admin')
  })

  test('admin group visible for org_admin and super_admin', () => {
    expect(visibleNavGroups('org_admin').map((group) => group.id)).toContain('admin')
    expect(visibleNavGroups('super_admin').map((group) => group.id)).toContain('admin')
  })

  test('all previous routes still reachable', () => {
    const hrefs = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href))
    for (const href of [
      '/dashboard', '/notifications', '/clients', '/packets', '/notes',
      '/schedule', '/evv', '/incidents', '/billing-readiness', '/documents',
      '/form-library', '/staff/directory', '/ai', '/qa', '/analytics',
      '/billing-readiness/claims', '/billing-readiness/authorizations', '/help',
      '/admin/settings', '/admin/staff', '/admin/audit-log',
    ]) {
      expect(hrefs).toContain(href)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/components/layout/nav-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/layout/nav-config.ts`:**

```ts
import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid, Bell, Users, ClipboardList, PenLine, Calendar, MapPin,
  AlertTriangle, Receipt, FileCheck2, BadgeDollarSign, BarChart3, Folder,
  Library, ShieldCheck, Sparkles, HelpCircle, Building2, UserCog,
  GraduationCap, FileText, Upload, Webhook, ScrollText, Settings2, BookOpen,
} from 'lucide-react'
import { isAdmin, isSuperAdmin } from '@/lib/auth/role-guards'
import type { Role } from '@/types/app'

export interface NavItem {
  href: string
  translationKey: string
  icon: LucideIcon
}

export interface NavGroup {
  id: string
  /** i18n key for the group heading */
  labelKey: string
  items: NavItem[]
  adminOnly?: boolean
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'care',
    labelKey: 'nav.group_care',
    items: [
      { href: '/dashboard',     translationKey: 'nav.dashboard',     icon: LayoutGrid },
      { href: '/notifications', translationKey: 'nav.notifications', icon: Bell },
      { href: '/clients',       translationKey: 'nav.clients',       icon: Users },
      { href: '/notes',         translationKey: 'nav.notes',         icon: PenLine },
      { href: '/schedule',      translationKey: 'nav.schedule',      icon: Calendar },
      { href: '/evv',           translationKey: 'nav.evv',           icon: MapPin },
    ],
  },
  {
    id: 'compliance',
    labelKey: 'nav.group_compliance',
    items: [
      { href: '/packets',      translationKey: 'nav.packets',           icon: ClipboardList },
      { href: '/incidents',    translationKey: 'nav.incidents',         icon: AlertTriangle },
      { href: '/qa',           translationKey: 'nav.quality_assurance', icon: ShieldCheck },
      { href: '/form-library', translationKey: 'nav.form_library',      icon: Library },
    ],
  },
  {
    id: 'business',
    labelKey: 'nav.group_business',
    items: [
      { href: '/billing-readiness',                translationKey: 'nav.billing_readiness', icon: Receipt },
      { href: '/billing-readiness/claims',         translationKey: 'nav.claims',            icon: BadgeDollarSign },
      { href: '/billing-readiness/authorizations', translationKey: 'nav.authorizations',    icon: FileCheck2 },
      { href: '/analytics',                        translationKey: 'nav.analytics',         icon: BarChart3 },
      { href: '/documents',                        translationKey: 'nav.documents',         icon: Folder },
    ],
  },
  {
    id: 'workspace',
    labelKey: 'nav.group_workspace',
    items: [
      { href: '/staff/directory', translationKey: 'nav.staff_directory', icon: UserCog },
      { href: '/ai',              translationKey: 'nav.ai_tools',        icon: Sparkles },
      { href: '/help',            translationKey: 'nav.help_center',     icon: HelpCircle },
    ],
  },
  {
    id: 'admin',
    labelKey: 'admin.administration',
    adminOnly: true,
    items: [
      { href: '/admin/settings',          translationKey: 'admin.settings',          icon: Settings2 },
      { href: '/admin/staff',             translationKey: 'admin.staff',             icon: UserCog },
      { href: '/admin/organizations',     translationKey: 'admin.organizations',     icon: Building2 },
      { href: '/admin/team',              translationKey: 'admin.team',              icon: Users },
      { href: '/admin/trainings',         translationKey: 'admin.trainings',         icon: GraduationCap },
      { href: '/admin/audit-assistant',   translationKey: 'admin.audit_assistant',   icon: Sparkles },
      { href: '/admin/forms',             translationKey: 'admin.form_templates',    icon: FileText },
      { href: '/admin/compliance-alerts', translationKey: 'admin.compliance_alerts', icon: Bell },
      { href: '/admin/import',            translationKey: 'admin.import',            icon: Upload },
      { href: '/admin/help-center',       translationKey: 'admin.help_center',       icon: BookOpen },
      { href: '/admin/webhooks',          translationKey: 'admin.webhooks',          icon: Webhook },
      { href: '/admin/audit-log',         translationKey: 'admin.audit_log',         icon: ScrollText },
    ],
  },
]

export function visibleNavGroups(role: Role): NavGroup[] {
  return NAV_GROUPS.filter(
    (group) => !group.adminOnly || isAdmin(role) || isSuperAdmin(role)
  )
}
```

NOTE: previous sidebar showed admin links to everyone (pages were guarded server-side). This makes nav role-aware per spec. If `program_manager` turns out to need admin links, extend the filter — single line.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/components/layout/nav-config.test.ts`
Expected: PASS

- [ ] **Step 5: Add the four new i18n keys**

Open the translation source (find with `grep -rn "nav.workspace" src/lib/i18n/`). For EVERY locale present, add keys following the file's existing structure:

| Key | en value |
|---|---|
| `nav.group_care` | Care |
| `nav.group_compliance` | Compliance |
| `nav.group_business` | Business |
| `nav.group_workspace` | Workspace |

For non-English locales translate naturally (es: Cuidado / Cumplimiento / Negocio / Espacio de trabajo; so: Daryeel / Hoggaansanaan / Ganacsi / Goob shaqo — match whatever locales actually exist in the file).

Run: `npx vitest run src/tests/lib/i18n/translations.test.ts`
Expected: PASS (suite enforces key parity across locales; if it requires all locales to have the key, this step satisfies it).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/nav-config.ts src/tests/components/layout/nav-config.test.ts src/lib/i18n
git commit -m "feat(nav): grouped role-aware nav config with tests"
```

---

### Task 5: Breadcrumbs util

**Files:**
- Create: `src/lib/navigation/breadcrumbs.ts`
- Test: `src/tests/lib/navigation/breadcrumbs.test.ts`

- [ ] **Step 1: Write failing test** at `src/tests/lib/navigation/breadcrumbs.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { breadcrumbsFromPath } from '@/lib/navigation/breadcrumbs'

describe('breadcrumbsFromPath', () => {
  test('returns single crumb for top-level route', () => {
    expect(breadcrumbsFromPath('/dashboard')).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
    ])
  })

  test('builds nested crumbs with cumulative hrefs', () => {
    expect(breadcrumbsFromPath('/billing-readiness/claims')).toEqual([
      { label: 'Billing Readiness', href: '/billing-readiness' },
      { label: 'Claims', href: '/billing-readiness/claims' },
    ])
  })

  test('replaces UUID segments with Detail', () => {
    expect(
      breadcrumbsFromPath('/clients/8f14e45f-ceea-467f-a1d2-91b1c9a2f6d1/goals')
    ).toEqual([
      { label: 'Clients', href: '/clients' },
      { label: 'Detail', href: '/clients/8f14e45f-ceea-467f-a1d2-91b1c9a2f6d1' },
      { label: 'Goals', href: '/clients/8f14e45f-ceea-467f-a1d2-91b1c9a2f6d1/goals' },
    ])
  })

  test('handles root and empty paths', () => {
    expect(breadcrumbsFromPath('/')).toEqual([])
    expect(breadcrumbsFromPath('')).toEqual([])
  })

  test('uses label overrides where titles differ from slugs', () => {
    expect(breadcrumbsFromPath('/evv')).toEqual([{ label: 'EVV', href: '/evv' }])
    expect(breadcrumbsFromPath('/qa')).toEqual([
      { label: 'Quality Assurance', href: '/qa' },
    ])
    expect(breadcrumbsFromPath('/ai')).toEqual([{ label: 'AI Tools', href: '/ai' }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/lib/navigation/breadcrumbs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/navigation/breadcrumbs.ts`:**

```ts
export interface Breadcrumb {
  label: string
  href: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const LABEL_OVERRIDES: Record<string, string> = {
  evv: 'EVV',
  qa: 'Quality Assurance',
  ai: 'AI Tools',
  'help-center': 'Help Center',
  'form-library': 'Form Library',
  'billing-readiness': 'Billing Readiness',
}

function labelForSegment(segment: string): string {
  if (UUID_PATTERN.test(segment)) return 'Detail'
  const override = LABEL_OVERRIDES[segment]
  if (override) return override
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function breadcrumbsFromPath(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((segment, index) => ({
    label: labelForSegment(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/lib/navigation/breadcrumbs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation/breadcrumbs.ts src/tests/lib/navigation/breadcrumbs.test.ts
git commit -m "feat(nav): breadcrumbs-from-path util with tests"
```

---

### Task 6: Sidebar rewrite (grouped, lucide icons, new tokens)

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (full replacement — 362 lines shrink to ~150; inline SVG icon components deleted, lucide replaces them)

- [ ] **Step 1: Replace `src/components/layout/sidebar.tsx` with:**

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { KeyRound, LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserProfile, OrgBranding } from '@/types/app'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { useTranslation } from '@/hooks/use-translation'
import { visibleNavGroups } from '@/components/layout/nav-config'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: UserProfile
  branding?: OrgBranding | null
}

interface NavLinkProps {
  href: string
  translationKey: string
  Icon: LucideIcon
  active: boolean
}

function NavLink({ href, translationKey, Icon, active }: NavLinkProps) {
  const { t } = useTranslation()
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
        active
          ? 'bg-accent font-semibold text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {active && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-gradient-to-b from-brand-from to-brand-to" />
      )}
      <Icon
        className={cn(
          'h-[15px] w-[15px] shrink-0 transition-colors',
          active ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span className="truncate">{t(translationKey)}</span>
    </Link>
  )
}

export default function Sidebar({ user, branding }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const groups = visibleNavGroups(user.role)
  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
  const roleLabel = user.role.replace(/_/g, ' ')

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))

  return (
    <div className="scrollbar-thin flex h-screen w-[232px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <Image
                src={branding.logo_url}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-lg border border-border object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-from to-brand-to">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="white">
                  <path
                    fillRule="evenodd"
                    d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
            <div>
              <p className="text-[13px] font-bold leading-none tracking-tight text-foreground">
                {branding?.name ?? 'Higsi'}
              </p>
              <p className="mt-0.5 bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-[9px] font-semibold uppercase tracking-[0.14em] text-transparent">
                245D Suite
              </p>
            </div>
          </div>
          <LocaleSwitcher />
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        {groups.map((group, index) => (
          <div key={group.id} className={index > 0 ? 'mt-4' : undefined}>
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              {t(group.labelKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, translationKey, icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  translationKey={translationKey}
                  Icon={icon}
                  active={isActive(href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand-from to-brand-to text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
              {user.fullName}
            </p>
            <p className="mt-0.5 text-[10px] capitalize leading-tight text-muted-foreground">
              {roleLabel}
            </p>
          </div>
          <Link
            href="/auth/reset-password"
            title="Change password"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </Link>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              title="Sign out"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
```

Behavior changes (intentional): active-route matching uses `startsWith(href + '/')` so `/billing-readiness/claims` no longer also highlights `/billing-readiness`; `ThemeToggle` moves to the new header (Task 7); per-org `brand_primary`/`brand_accent` inline styles replaced by system gradient (org logo still shown — org color theming can return as a token override later if a customer needs it).

- [ ] **Step 2: Build + tests**

Run: `npm run test:run && npm run build`
Expected: PASS. If anything imported `ThemeToggle` expecting it inside Sidebar, nothing breaks — it's imported by path, and Task 7 mounts it in the header.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(nav): grouped role-aware sidebar in Higsi Modern style"
```

---

### Task 7: App header (breadcrumbs + notifications + theme toggle)

**Files:**
- Create: `src/components/layout/app-header.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create `src/components/layout/app-header.tsx`:**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { breadcrumbsFromPath } from '@/lib/navigation/breadcrumbs'

export function AppHeader() {
  const pathname = usePathname()
  const crumbs = breadcrumbsFromPath(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-[13px]">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.href}>
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
              {isLast ? (
                <span className="truncate font-semibold text-foreground">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </Fragment>
          )
        })}
      </nav>
      <div className="flex items-center gap-1.5">
        <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
        <Link
          href="/notifications"
          title="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
```

NOTE: check `src/components/layout/theme-toggle.tsx` export style first (`export function ThemeToggle` vs default) and match the import.

- [ ] **Step 2: Update `src/app/(app)/layout.tsx`** — replace the `<main>` block and the wrapper div classes (keep session/branding logic above untouched):

```tsx
    <RealtimeProvider user={user}>
      <div
        className="flex h-screen overflow-hidden bg-background"
        style={{
          '--brand-primary': brandPrimary,
          '--brand-accent': brandAccent,
        } as React.CSSProperties}
      >
        <MobileSidebar branding={branding}>
          <Sidebar user={user} branding={branding} />
        </MobileSidebar>
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
              <SubscriptionBanner />
              <ComplianceAlertBanner />
              {children}
            </div>
          </main>
        </div>
        <SessionGuard />
        <CareAssistChat />
      </div>
    </RealtimeProvider>
```

Add import: `import { AppHeader } from '@/components/layout/app-header'`

- [ ] **Step 3: Build + tests**

Run: `npm run test:run && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-header.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(shell): app header with breadcrumbs, notifications, theme toggle"
```

---

### Task 8: Command palette (Cmd+K)

**Files:**
- Create: `src/components/layout/command-palette.tsx`
- Modify: `src/app/(app)/layout.tsx` (mount it)
- Test: `src/tests/components/layout/command-palette.test.tsx`

- [ ] **Step 1: Write failing test** at `src/tests/components/layout/command-palette.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { CommandPalette } from '@/components/layout/command-palette'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard',
}))

describe('CommandPalette', () => {
  test('opens on Cmd+K and lists navigation', async () => {
    const user = userEvent.setup()
    render(<CommandPalette role="org_admin" />)
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  test('hides admin destinations for staff', async () => {
    const user = userEvent.setup()
    render(<CommandPalette role="staff" />)
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument()
  })

  test('navigates on selection', async () => {
    const user = userEvent.setup()
    render(<CommandPalette role="staff" />)
    await user.keyboard('{Meta>}k{/Meta}')
    await user.click(screen.getByText('New Client'))
    expect(push).toHaveBeenCalledWith('/clients/new')
  })
})
```

NOTE on labels: palette uses plain-English labels derived in the component (see Step 3) — tests assert English; the palette intentionally skips i18n for v1 (search target strings must be stable for cmdk filtering; revisit with i18n team later).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/components/layout/command-palette.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/layout/command-palette.tsx`:**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, ClipboardPlus, FilePen, UserPlus } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { visibleNavGroups } from '@/components/layout/nav-config'
import type { Role } from '@/types/app'

interface CommandPaletteProps {
  role: Role
}

interface QuickAction {
  label: string
  href: string
  icon: typeof UserPlus
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New Client', href: '/clients/new', icon: UserPlus },
  { label: 'New Packet', href: '/packets', icon: ClipboardPlus },
  { label: 'New Note', href: '/notes', icon: FilePen },
  { label: 'New Incident', href: '/incidents', icon: CirclePlus },
]

/** "nav.billing_readiness" -> "Billing Readiness" */
function labelFromKey(translationKey: string): string {
  const slug = translationKey.split('.').pop() ?? translationKey
  const SPECIAL: Record<string, string> = {
    evv: 'EVV',
    ai_tools: 'AI Tools',
    quality_assurance: 'Quality Assurance',
  }
  const special = SPECIAL[slug]
  if (special) return special
  return slug
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function CommandPalette({ role }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const groups = visibleNavGroups(role)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
            <CommandItem key={href + label} onSelect={() => go(href)}>
              <Icon className="h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        {groups.map((group) => (
          <CommandGroup key={group.id} heading={labelFromKey(group.labelKey)}>
            {group.items.map(({ href, translationKey, icon: Icon }) => (
              <CommandItem key={href} onSelect={() => go(href)}>
                <Icon className="h-4 w-4" />
                {labelFromKey(translationKey)}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/components/layout/command-palette.test.tsx`
Expected: PASS. (If CommandDialog renders nothing while closed and `queryByPlaceholderText` assertion fails for a different reason, inspect the generated `command.tsx` — assert against what it actually renders, not by changing the component.)

- [ ] **Step 5: Mount in `src/app/(app)/layout.tsx`** — inside `<RealtimeProvider>`, next to `<SessionGuard />`:

```tsx
        <SessionGuard />
        <CommandPalette role={user.role} />
        <CareAssistChat />
```

Add import: `import { CommandPalette } from '@/components/layout/command-palette'`

- [ ] **Step 6: Full check**

Run: `npm run test:run && npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/command-palette.tsx src/tests/components/layout/command-palette.test.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(shell): Cmd+K command palette with role-aware navigation and quick actions"
```

---

### Task 9: Visual verification + retoken stragglers in shell chrome

**Files:**
- Possibly modify: `src/components/layout/mobile-sidebar.tsx`, `src/components/layout/theme-toggle.tsx`, `src/components/compliance/alert-banner.tsx`, `src/components/compliance/subscription-banner.tsx` (hex-color cleanup only)

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (background). Open http://localhost:3000.

- [ ] **Step 2: Verify, in BOTH themes (toggle in header):**

1. `/auth/login` (dot-grid retinted, inputs focused ring violet)
2. `/dashboard` (sidebar groups: Care/Compliance/Business/Workspace[/Admin]; header breadcrumbs; backgrounds `#FAFAFB` / `#09090B`)
3. `/clients` (table/cards readable; statuses amber/green/red, NOT pink)
4. `/packets` and one client detail page
5. Cmd+K: opens, filters, navigates, respects role
6. Mobile viewport (devtools): drawer opens with grouped nav

- [ ] **Step 3: Fix shell chrome stragglers**

`grep -n "E8799E\|C8A8E8\|EAE5F8\|F0F4FF\|3A2A4A" src/components/layout/*.tsx src/components/compliance/*.tsx` — replace hits with token utilities (`bg-card`, `text-foreground`, `border-border`, `from-brand-from to-brand-to`). Page-level hex cleanup is explicitly OUT of scope (follow-up plans handle pages as they're redesigned).

- [ ] **Step 4: Final full check + commit**

Run: `npm run test:run && npm run build`
Expected: PASS

```bash
git add -A
git commit -m "style(shell): retoken remaining shell chrome to Higsi Modern"
```

---

## Follow-up plans (not here)

1. **Plan 2 — Dashboard redesign + landing page reskin** (spec Phases 4–5)
2. **Plan 3 — AI quick wins**: palette ask-mode, client 360 summary (spec Phase 6)
