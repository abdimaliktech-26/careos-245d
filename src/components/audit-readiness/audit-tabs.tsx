'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/audit-readiness',              label: 'Dashboard' },
  { href: '/audit-readiness/wizard',       label: 'Review Wizard' },
  { href: '/audit-readiness/risk',         label: 'Risk Score' },
  { href: '/audit-readiness/missing-docs', label: 'Missing Docs' },
  { href: '/audit-readiness/staff',        label: 'Staff Compliance' },
  { href: '/audit-readiness/caps',         label: 'Action Plans' },
  { href: '/audit-readiness/reports',      label: 'Reports' },
  { href: '/audit-readiness/history',      label: 'History' },
]

export function AuditTabs() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/audit-readiness' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="mb-6 -mx-1 overflow-x-auto">
      <nav className="flex gap-1 border-b border-border px-1">
        {TABS.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'whitespace-nowrap rounded-t-lg px-3.5 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? 'border-b-2 border-primary text-foreground'
                  : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
