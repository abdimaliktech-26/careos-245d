'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserProfile } from '@/types/app'

interface NavItem {
  href: string
  label: string
  icon: React.FC
}

const NAV_ITEMS: NavItem[] = [
  { href: '/super-admin', label: 'Dashboard', icon: DashboardIcon },
  { href: '/super-admin/organizations', label: 'Organizations', icon: BuildingIcon },
  { href: '/super-admin/users', label: 'Users', icon: UsersIcon },
  { href: '/super-admin/audit-log', label: 'Audit Log', icon: AuditIcon },
  { href: '/super-admin/settings', label: 'System Settings', icon: SettingsIcon },
]

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: React.FC; active: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
        active
          ? 'bg-white/10 text-white font-semibold'
          : 'text-blue-200/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      {active && <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r-full bg-white" />}
      <span className={`shrink-0 transition-colors ${active ? 'text-white' : 'text-blue-300/60 group-hover:text-blue-200/80'}`}>
        <Icon />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

// SVG Icons
function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function AuditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

export function SuperAdminSidebar({ user }: { user: UserProfile }) {
  const pathname = usePathname()

  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-screen w-[240px] shrink-0 flex-col bg-[#3A2A4A]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/10">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="white">
            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold leading-none tracking-tight text-white">CareIntake</p>
          <p className="mt-0.5 text-[9px] font-semibold tracking-[0.14em] text-blue-300/70 uppercase">Super Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={href === '/super-admin' ? pathname === href : pathname.startsWith(href)}
          />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-[11px] font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate leading-tight">{user.fullName}</p>
            <p className="text-[10px] text-blue-300/50 capitalize leading-tight mt-0.5">Super Admin</p>
          </div>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              title="Sign out"
              className="flex h-6 w-6 items-center justify-center rounded-md text-blue-300/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogoutIcon />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
