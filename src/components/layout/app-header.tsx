'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, Search } from 'lucide-react'
import { Fragment } from 'react'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { breadcrumbsFromPath } from '@/lib/navigation/breadcrumbs'

function openCommandPalette() {
  // The command palette listens for Cmd/Ctrl+K.
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }))
}

export function AppHeader() {
  const pathname = usePathname()
  const crumbs = breadcrumbsFromPath(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex min-w-0 shrink-0 items-center gap-1 text-[13px]">
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

      <button
        type="button"
        onClick={openCommandPalette}
        className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:border-ring/40 md:flex"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search clients, documents, tasks…</span>
        <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href="/notifications"
          title="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
