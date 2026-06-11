# CareIntake Modern — Retoken Playbook (mechanical class migration)

Styling-only migration. NEVER change logic, props, data fetching, handlers, copy, or structure. Only class strings and inline style attributes listed here.

## Class mappings (apply in className strings)

| Old | New |
|---|---|
| `bg-white` | `bg-card` |
| `bg-gray-50` (page/section bg) | `bg-muted` (or `bg-background` if page wrapper) |
| `bg-gray-100` | `bg-muted` |
| `bg-[#F0F4FF]`, `bg-[#F8FAFC]`, `bg-[#EAE5F8]` | `bg-background` |
| `bg-[#EEF2FF]`, `bg-[#EDE0F8]` | `bg-accent` |
| `border-gray-100`, `border-gray-200`, `border-[#E5E7EB]`, `border-[#C8A8E8]`* | `border-border` |
| `divide-gray-50`, `divide-gray-100` | `divide-border/60` |
| `text-black`, `text-gray-700/800/900`, `text-[#3A2A4A]`, `text-[#111827]`, `text-[#0F172A]`, `text-[#374151]` | `text-foreground` |
| `text-gray-400/500/600`, `text-[#64748B]`, `text-[#6B7280]`, `text-[#94A3B8]`, `text-[#9CA3AF]`, `text-[#7A6A8A]`, `text-[#CBD5E1]` | `text-muted-foreground` |
| `text-[#E8799E]`, `text-[#4361EE]` (links/accents) | `text-primary` |
| `hover:bg-gray-50`, `hover:bg-gray-100`, hover variants of above | `hover:bg-muted/40` |
| `focus:border-[#E8799E] focus:ring-2 focus:ring-[#E8799E]/10` (any hex focus ring) | `focus:border-ring focus:ring-2 focus:ring-ring/15` |

## Status colors (only when meaning matches)

| Meaning | Old examples | New |
|---|---|---|
| error/overdue/danger | `bg-red-50 text-red-700` | `bg-status-error-bg text-status-error` |
| warn/due/pending-attention | `bg-amber-50 text-amber-700`, yellow, orange | `bg-status-warn-bg text-status-warn` |
| success/complete/active | `bg-green-50 text-green-700`, emerald | `bg-status-ok-bg text-status-ok` |
| informational blue/violet | `bg-blue-50 text-blue-700` | keep, ADD dark variants: `dark:bg-blue-500/15 dark:text-blue-300` (same pattern violet/indigo/teal) |

Solid status dots/bars: `bg-red-500`→`bg-status-error`, `bg-green-500`/`bg-emerald-500`→`bg-status-ok`, `bg-amber-500`→`bg-status-warn`. Blue dots keep.

## Gradients (inline styles)

- `style={{ background: 'linear-gradient(135deg, #E8799E...#C8A8E8...)' }}` on elements with className → DELETE style attr, add `bg-gradient-to-br from-brand-from to-brand-to` to className
- If style attr must stay (computed/mixed) → replace value with `'var(--gradient-primary)'`
- Any remaining `#4361EE`/`#7B61FF` gradients → same treatment

## Don't touch

- `src/components/ui/**` (shadcn — done)
- Already-migrated: `src/app/(app)/dashboard/page.tsx`, `src/app/page.tsx`, `src/app/auth/login/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/layout/**`, `src/components/chat/CareAssistChat.tsx`, `src/components/compliance/{alert-banner,subscription-banner,alert-settings-form}.tsx`, `src/components/clients/ai-summary-card.tsx`
- Logic, JSX structure, props, imports (except adding nothing — imports unchanged)
- Tests

## Verification (per agent)

- `npx eslint <changed files>` → 0 errors
- Do NOT run `npm run build`, `npm test`, or `tsc` (concurrent agents collide)
- Do NOT commit — main thread commits after global verification
