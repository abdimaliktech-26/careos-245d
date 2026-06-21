'use client'

import Link from 'next/link'
import Image from 'next/image'
import { appName } from '@/lib/app-config'
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
              <Image src="/higsi-logo.png" alt={appName()} width={96} height={32} className="h-7 w-auto" />
            )}
            <div>
              {(branding?.name || branding?.logo_url) && (
                <p className="text-[13px] font-bold leading-none tracking-tight text-foreground">
                  {branding?.name ?? appName()}
                </p>
              )}
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
