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
        'group relative flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-colors',
        active ? 'text-white' : 'text-[#A9B4CC] hover:bg-white/5 hover:text-white'
      )}
      style={active ? { background: 'linear-gradient(135deg, var(--brand-from), var(--brand-to))', boxShadow: '0 6px 16px rgba(16,185,154,0.30)' } : undefined}
    >
      <Icon className="h-[16px] w-[16px] shrink-0" />
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
    <div className="scrollbar-thin flex h-screen w-[248px] shrink-0 flex-col overflow-hidden bg-navy">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between">
          {branding?.logo_url ? (
            <span className="inline-flex items-center rounded-xl bg-white px-2.5 py-1.5">
              <Image src={branding.logo_url} alt="" width={28} height={28} unoptimized className="h-7 w-auto object-contain" />
            </span>
          ) : (
            <span className="inline-flex items-center rounded-xl bg-white px-3 py-2">
              <Image src="/higsi-logo.png" alt={appName()} width={100} height={32} className="h-7 w-auto" />
            </span>
          )}
          <LocaleSwitcher />
        </div>
        {(branding?.name || branding?.logo_url) && (
          <p className="mt-3 text-[12px] font-semibold text-white">{branding?.name ?? appName()}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group, index) => (
          <div key={group.id} className={index > 0 ? 'mt-5' : undefined}>
            <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {t(group.labelKey)}
            </p>
            <div className="space-y-1">
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
      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.06] px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--brand-from), #3B82F6)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold leading-tight text-white">
              {user.fullName}
            </p>
            <p className="mt-0.5 text-[10px] capitalize leading-tight text-[#8E9AB5]">
              {roleLabel}
            </p>
          </div>
          <Link
            href="/auth/reset-password"
            title="Change password"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#A9B4CC] transition-colors hover:bg-white/10 hover:text-white"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </Link>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              title="Sign out"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#A9B4CC] transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
