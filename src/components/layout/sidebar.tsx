'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { UserProfile, OrgBranding } from '@/types/app'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { useTranslation } from '@/hooks/use-translation'

interface SidebarProps {
  user: UserProfile
  branding?: OrgBranding | null
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
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

function ClipboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  )
}

function PenLineIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function AlertTriangleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
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

function TeamIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.8L18 9l-4.4 3.2L15 17l-3-2.2L9 17l1.4-4.8L6 9l4.4-1.2L12 3z"/>
    </svg>
  )
}

function AuditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function FormIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
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

function HelpCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
    </svg>
  )
}

type NavEntry = { href: string; translationKey: string; icon: React.FC }

const NAV_ITEMS: NavEntry[] = [
  { href: '/dashboard',          translationKey: 'nav.dashboard',            icon: GridIcon },
  { href: '/notifications',      translationKey: 'nav.notifications',        icon: BellIcon },
  { href: '/clients',            translationKey: 'nav.clients',              icon: UsersIcon },
  { href: '/packets',            translationKey: 'nav.packets',              icon: ClipboardIcon },
  { href: '/notes',              translationKey: 'nav.notes',                icon: PenLineIcon },
  { href: '/schedule',           translationKey: 'nav.schedule',             icon: CalendarIcon },
  { href: '/evv',                translationKey: 'nav.evv',                  icon: MapPinIcon },
  { href: '/incidents',          translationKey: 'nav.incidents',            icon: AlertTriangleIcon },
  { href: '/billing-readiness',  translationKey: 'nav.billing_readiness',    icon: ReceiptIcon },
  { href: '/documents',          translationKey: 'nav.documents',            icon: FolderIcon },
  { href: '/form-library',       translationKey: 'nav.form_library',         icon: LibraryIcon },
  { href: '/staff/directory',    translationKey: 'nav.staff_directory',        icon: UsersIcon },
  { href: '/ai',                  translationKey: 'nav.ai_tools',               icon: SparkIcon },
  { href: '/qa',                   translationKey: 'nav.quality_assurance',       icon: ShieldIcon },
  { href: '/analytics',          translationKey: 'nav.analytics',             icon: GridIcon },
  { href: '/billing-readiness/claims', translationKey: 'nav.claims',          icon: ReceiptIcon },
  { href: '/billing-readiness/authorizations', translationKey: 'nav.authorizations', icon: ReceiptIcon },
  { href: '/help',               translationKey: 'nav.help_center',          icon: HelpCircleIcon },
]

const ADMIN_ITEMS: NavEntry[] = [
  { href: '/admin/settings',            translationKey: 'admin.settings',           icon: BuildingIcon },
  { href: '/admin/staff',               translationKey: 'admin.staff',              icon: TeamIcon },
  { href: '/admin/organizations',       translationKey: 'admin.organizations',       icon: BuildingIcon },
  { href: '/admin/team',                translationKey: 'admin.team',                icon: TeamIcon },
  { href: '/admin/trainings',           translationKey: 'admin.trainings',           icon: ShieldIcon },
  { href: '/admin/audit-assistant',     translationKey: 'admin.audit_assistant',     icon: SparkIcon },
  { href: '/admin/forms',               translationKey: 'admin.form_templates',      icon: FormIcon },
  { href: '/admin/compliance-alerts',   translationKey: 'admin.compliance_alerts',    icon: BellIcon },
  { href: '/admin/import',              translationKey: 'admin.import',               icon: UploadIcon },
  { href: '/admin/help-center',         translationKey: 'admin.help_center',         icon: HelpCircleIcon },
  { href: '/admin/webhooks',            translationKey: 'admin.webhooks',            icon: BellIcon },
  { href: '/admin/audit-log',           translationKey: 'admin.audit_log',           icon: AuditIcon },
]

function NavItem({ href, translationKey, Icon, active }: { href: string; translationKey: string; Icon: React.FC; active: boolean }) {
  const { t } = useTranslation()
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
        active
          ? 'bg-[#EEF2FF] text-[#E8799E] font-semibold'
          : 'text-[#64748B] hover:bg-gray-50 hover:text-[#334155]'
      }`}
    >
      {active && (
        <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r-full bg-[#E8799E]" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-[#E8799E]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}`}>
        <Icon />
      </span>
      <span className="truncate">{t(translationKey)}</span>
    </Link>
  )
}

export default function Sidebar({ user, branding }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
  const roleLabel = user.role.replace(/_/g, ' ')

  return (
    <div className="scrollbar-thin flex h-screen w-[232px] shrink-0 flex-col overflow-hidden border-r border-gray-100 bg-white">

      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <Image src={branding.logo_url} alt="" width={32} height={32} unoptimized className="h-8 w-8 rounded-[10px] object-contain border border-gray-100" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                style={{ background: `linear-gradient(135deg, ${branding?.brand_primary ?? '#E8799E'} 0%, ${branding?.brand_accent ?? '#C8A8E8'} 100%)` }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="white">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div>
              <p className="text-[13px] font-bold leading-none tracking-tight text-[#3A2A4A]">{branding?.name ?? 'CareIntake'}</p>
              <p className="mt-0.5 text-[9px] font-semibold tracking-[0.14em] uppercase" style={{ color: branding?.brand_primary ?? '#E8799E' }}>245D Suite</p>
            </div>
          </div>
          <LocaleSwitcher />
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#CBD5E1]">{t('nav.workspace')}</p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, translationKey, icon: Icon }) => (
            <NavItem
              key={href}
              href={href}
              translationKey={translationKey}
              Icon={Icon}
              active={pathname === href || (href !== '/dashboard' && pathname.startsWith(href))}
            />
          ))}
        </div>

        <div className="my-3 border-t border-gray-100" />

        <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#CBD5E1]">{t('admin.administration')}</p>
        <div className="space-y-0.5">
          {ADMIN_ITEMS.map(({ href, translationKey, icon: Icon }) => (
            <NavItem
              key={href}
              href={href}
              translationKey={translationKey}
              Icon={Icon}
              active={pathname === href || pathname.startsWith(href)}
            />
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="flex items-center gap-2.5 rounded-xl bg-[#F8FAFC] px-3 py-2.5 flex-1 min-w-0">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#3A2A4A] truncate leading-tight">{user.fullName}</p>
              <p className="text-[10px] text-[#94A3B8] capitalize leading-tight mt-0.5">{roleLabel}</p>
            </div>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                title="Sign out"
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#CBD5E1] transition-colors hover:bg-gray-200 hover:text-[#64748B]"
              >
                <LogoutIcon />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
