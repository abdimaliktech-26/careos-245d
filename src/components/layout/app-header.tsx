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
